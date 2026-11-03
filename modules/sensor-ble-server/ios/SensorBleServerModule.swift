import ExpoModulesCore
import Foundation

public final class SensorBleServerModule: Module {
  private var peripheral: SensorBlePeripheral?

  public func definition() -> ModuleDefinition {
    Name("SensorBleServer")
    Events("onStatusChanged")

    AsyncFunction("getStatus") { () -> [String: Any] in
      self.peripheral?.status ?? SensorBlePeripheral.initialStatus
    }.runOnQueue(.main)

    AsyncFunction("startAdvertising") { () -> Void in
      self.server().start()
    }.runOnQueue(.main)

    AsyncFunction("stopAdvertising") { () -> Void in
      self.peripheral?.stop()
    }.runOnQueue(.main)

    AsyncFunction("notifyClients") { (bytes: [Int], promise: Promise) in
      self.server().notifyClients(bytes) { result in
        switch result {
        case .success: promise.resolve()
        case .failure(let error): promise.reject("ERR_SENSOR_BLE", error.localizedDescription)
        }
      }
    }.runOnQueue(.main)

    OnDestroy {
      // Module teardown may run off the CoreBluetooth delegate queue.
      let peripheral = self.peripheral
      DispatchQueue.main.async { peripheral?.stop() }
    }
  }

  private func server() -> SensorBlePeripheral {
    if let peripheral { return peripheral }
    let peripheral = SensorBlePeripheral()
    peripheral.onStatusChanged = { [weak self] status in
      self?.sendEvent("onStatusChanged", status)
    }
    self.peripheral = peripheral
    return peripheral
  }
}
