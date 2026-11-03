import CoreBluetooth
import Foundation

/** All operations and delegate callbacks run on the main queue to preserve packet ordering. */
final class SensorBlePeripheral: NSObject, CBPeripheralManagerDelegate {
  static let serviceUUID = CBUUID(string: "7B3E0001-6D4B-4C2F-9F0A-2D0D5B7A1001")
  static let characteristicUUID = CBUUID(string: "7B3E0002-6D4B-4C2F-9F0A-2D0D5B7A1001")
  static let initialStatus: [String: Any] = [
    "bluetoothState": "unknown", "isAdvertising": false,
    "subscriberCount": 0, "isSending": false, "error": NSNull()
  ]

  var onStatusChanged: (([String: Any]) -> Void)?
  private var manager: CBPeripheralManager?
  private var service: CBMutableService?
  private var characteristic: CBMutableCharacteristic?
  private var serviceReady = false
  private var advertisingStarting = false
  private var shouldAdvertise = false
  private var subscribers: [UUID: CBCentral] = [:]
  private let transport = SensorNotificationTransport()
  private var timeout: DispatchWorkItem?
  private var lastError: String?

  var status: [String: Any] {
    [
      "bluetoothState": stateName,
      "isAdvertising": manager?.isAdvertising ?? false,
      "subscriberCount": subscribers.count,
      "isSending": transport.isSending,
      "error": lastError.map { $0 as Any } ?? NSNull()
    ]
  }

  /** Records advertising intent; actual startup is reported after service publication succeeds. */
  func start() {
    shouldAdvertise = true
    lastError = nil
    if manager == nil {
      manager = CBPeripheralManager(
        delegate: self, queue: .main,
        options: [CBPeripheralManagerOptionShowPowerAlertKey: true]
      )
    } else {
      publishServiceIfNeeded()
    }
    emitStatus()
  }

  func stop() {
    shouldAdvertise = false
    if manager?.state == .poweredOn {
      manager?.stopAdvertising()
      manager?.removeAllServices()
    }
    clearService()
    transport.reset(SensorBleError.stopped)
    lastError = nil
    emitStatus()
  }

  /** Resolves only after all four notifications enter CoreBluetooth's transmit queue. */
  func notifyClients(_ bytes: [Int], completion: @escaping (Result<Void, Error>) -> Void) {
    guard bytes.count == 72, bytes.allSatisfy({ (0...255).contains($0) }) else {
      completion(.failure(SensorBleError.invalidPacket))
      return
    }
    guard manager?.state == .poweredOn, serviceReady, characteristic != nil else {
      completion(.failure(SensorBleError.notReady))
      return
    }
    do {
      try transport.begin(
        packet: Data(bytes.map { UInt8($0) }),
        subscribers: subscribers.mapValues { $0.maximumUpdateValueLength }
      ) { [weak self] result in
        self?.timeout?.cancel()
        self?.timeout = nil
        if case .failure(let error) = result { self?.lastError = error.localizedDescription }
        self?.emitStatus()
        completion(result)
      }
    } catch {
      completion(.failure(error))
      return
    }
    lastError = nil
    let deadline = DispatchWorkItem { [weak self] in
      self?.transport.cancel(SensorBleError.timedOut)
    }
    timeout = deadline
    DispatchQueue.main.asyncAfter(deadline: .now() + 10, execute: deadline)
    emitStatus()
    drainNotifications()
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    if peripheral.state == .poweredOn {
      lastError = nil
      publishServiceIfNeeded()
    } else {
      clearService()
      transport.reset(SensorBleError.notReady)
    }
    emitStatus()
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    // Ignore callbacks for a service removed during a stop or Bluetooth reset.
    guard service === self.service, shouldAdvertise else { return }
    if let error {
      self.service = nil
      characteristic = nil
      lastError = error.localizedDescription
    } else {
      serviceReady = true
      advertiseIfNeeded()
    }
    emitStatus()
  }

  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    advertisingStarting = false
    guard shouldAdvertise else { return }
    lastError = error?.localizedDescription
    emitStatus()
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager, central: CBCentral,
    didSubscribeTo characteristic: CBCharacteristic
  ) {
    guard shouldAdvertise, serviceReady, characteristic.uuid == Self.characteristicUUID else { return }
    subscribers[central.identifier] = central
    lastError = central.maximumUpdateValueLength < 20
      ? SensorBleError.notificationTooSmall.localizedDescription : nil
    emitStatus()
  }

  func peripheralManager(
    _ peripheral: CBPeripheralManager, central: CBCentral,
    didUnsubscribeFrom characteristic: CBCharacteristic
  ) {
    guard characteristic.uuid == Self.characteristicUUID else { return }
    subscribers.removeValue(forKey: central.identifier)
    transport.unsubscribe(central.identifier)
    emitStatus()
  }

  func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
    drainNotifications()
  }

  private func publishServiceIfNeeded() {
    guard shouldAdvertise, let manager, manager.state == .poweredOn else { return }
    if serviceReady {
      advertiseIfNeeded()
      return
    }
    guard service == nil else { return }
    // A powered-off manager can retain its database; replace it before republishing.
    manager.removeAllServices()
    let characteristic = CBMutableCharacteristic(
      type: Self.characteristicUUID, properties: [.notify], value: nil, permissions: []
    )
    let service = CBMutableService(type: Self.serviceUUID, primary: true)
    service.characteristics = [characteristic]
    self.characteristic = characteristic
    self.service = service
    manager.add(service)
  }

  private func advertiseIfNeeded() {
    guard shouldAdvertise, serviceReady, let manager, manager.state == .poweredOn,
      !manager.isAdvertising, !advertisingStarting else { return }
    advertisingStarting = true
    manager.startAdvertising([
      CBAdvertisementDataServiceUUIDsKey: [Self.serviceUUID],
      CBAdvertisementDataLocalNameKey: "Conifer-SENS-001"
    ])
  }

  private func drainNotifications() {
    guard let manager, manager.state == .poweredOn, let characteristic else { return }
    transport.drain { [self] frame, identifiers in
      let recipients = identifiers.compactMap { subscribers[$0] }
      return manager.updateValue(frame, for: characteristic, onSubscribedCentrals: recipients)
    }
  }

  private func clearService() {
    service = nil
    characteristic = nil
    serviceReady = false
    advertisingStarting = false
    subscribers.removeAll()
  }

  private func emitStatus() { onStatusChanged?(status) }

  private var stateName: String {
    guard let state = manager?.state else { return "unknown" }
    switch state {
    case .unknown: return "unknown"
    case .resetting: return "resetting"
    case .unsupported: return "unsupported"
    case .unauthorized: return "unauthorized"
    case .poweredOff: return "poweredOff"
    case .poweredOn: return "poweredOn"
    @unknown default: return "unknown"
    }
  }
}
