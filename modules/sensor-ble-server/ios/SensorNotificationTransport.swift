import Foundation

enum SensorBleError: LocalizedError {
  case invalidPacket
  case busy
  case noSubscribers
  case notificationTooSmall
  case notReady
  case unsubscribed
  case stopped
  case timedOut
  case requiresResubscription

  var errorDescription: String? {
    switch self {
    case .invalidPacket: return "Expected a 72-byte SENS-001 sensor packet."
    case .busy: return "A sensor packet is already being sent."
    case .noSubscribers: return "No BLE client is subscribed."
    case .notificationTooSmall: return "A subscribed client cannot receive 20-byte notifications."
    case .notReady: return "Bluetooth or the sensor GATT service is not ready."
    case .unsubscribed: return "A client unsubscribed before all four frames were queued."
    case .stopped: return "The BLE peripheral stopped before transmission completed."
    case .timedOut: return "Timed out waiting for the Bluetooth notification queue. Reconnect the client."
    case .requiresResubscription: return "Reconnect subscribed clients before sending again after an interrupted packet."
    }
  }
}

/** Serializes one logical packet at a time, retrying only frames rejected by CoreBluetooth. */
final class SensorNotificationTransport {
  private struct Transfer {
    let frames: [Data]
    let recipients: [UUID]
    let completion: (Result<Void, Error>) -> Void
    var nextFrame = 0
  }

  private var transfer: Transfer?
  private var interruptedRecipients: Set<UUID> = []
  var isSending: Bool { transfer != nil }

  /** Freezes recipients so a central subscribing midway never receives a partial packet. */
  func begin(
    packet: Data,
    subscribers: [UUID: Int],
    completion: @escaping (Result<Void, Error>) -> Void
  ) throws {
    guard transfer == nil else { throw SensorBleError.busy }
    guard packet.count == 72, packet.prefix(8) == Data("SENS-001".utf8) else {
      throw SensorBleError.invalidPacket
    }
    guard !subscribers.isEmpty else { throw SensorBleError.noSubscribers }
    guard interruptedRecipients.isDisjoint(with: subscribers.keys) else {
      throw SensorBleError.requiresResubscription
    }
    guard subscribers.values.allSatisfy({ $0 >= 20 }) else {
      throw SensorBleError.notificationTooSmall
    }

    let frames = (0..<4).map { index in
      Data([UInt8(index), 4]) + packet.subdata(in: (index * 18)..<((index + 1) * 18))
    }
    transfer = Transfer(frames: frames, recipients: Array(subscribers.keys), completion: completion)
  }

  /** A false result leaves the current frame pending until the peripheral-ready callback. */
  func drain(update: (Data, [UUID]) -> Bool) {
    while let current = transfer {
      guard update(current.frames[current.nextFrame], current.recipients) else { return }
      if current.nextFrame == 3 {
        transfer = nil
        current.completion(.success(()))
      } else {
        transfer?.nextFrame += 1
      }
    }
  }

  func unsubscribe(_ identifier: UUID) {
    if transfer?.recipients.contains(identifier) == true {
      cancel(SensorBleError.unsubscribed)
    }
    interruptedRecipients.remove(identifier)
  }

  /** Discards unsent bytes and requires fresh subscriptions for peers retaining partial data. */
  func cancel(_ error: Error) {
    // Protocol v1 has no packet ID. A peer retaining partial data must reset its subscription
    // before receiving a new sample, or its assembler could mix bytes from two packets.
    if let transfer, transfer.nextFrame > 0 {
      interruptedRecipients.formUnion(transfer.recipients)
    }
    let completion = transfer?.completion
    transfer = nil
    completion?(.failure(error))
  }

  /** Called when GATT is removed, so all subsequent subscriptions belong to a fresh session. */
  func reset(_ error: Error) {
    cancel(error)
    interruptedRecipients.removeAll()
  }
}
