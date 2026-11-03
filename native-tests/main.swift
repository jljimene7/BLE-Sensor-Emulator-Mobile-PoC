import Foundation

struct TestFailure: Error { let message: String }
var testsPassed = 0

func expect(_ condition: @autoclosure () -> Bool, _ message: String) throws {
  if !condition() { throw TestFailure(message: message) }
}

func expectError(_ expected: SensorBleError, _ operation: () throws -> Void) throws {
  do {
    try operation()
    throw TestFailure(message: "Expected error: \(expected)")
  } catch let error as SensorBleError {
    try expect(error.localizedDescription == expected.localizedDescription, "Unexpected error: \(error)")
  }
}

func test(_ name: String, _ operation: () throws -> Void) throws {
  try operation()
  testsPassed += 1
  print("PASS \(name)")
}

let client = UUID()
let packet = Data("SENS-001".utf8) + Data((0..<64).map { UInt8($0) })

do {
  try test("four exact 20-byte frames preserve all 72 bytes in row-major order") {
    let transport = SensorNotificationTransport()
    var completed = false
    var frames: [Data] = []
    try transport.begin(packet: packet, subscribers: [client: 20]) { result in
      if case .success = result { completed = true }
    }
    transport.drain { frame, recipients in
      frames.append(frame)
      return recipients == [client]
    }
    try expect(completed && !transport.isSending, "Transfer did not finish")
    try expect(frames.count == 4, "Wrong frame count")
    for (index, frame) in frames.enumerated() {
      try expect(frame.count == 20, "Wrong frame size")
      try expect(frame[0] == UInt8(index) && frame[1] == 4, "Wrong chunk header")
    }
    try expect(frames.reduce(Data()) { $0 + $1.dropFirst(2) } == packet, "Payload changed")
  }

  try test("malformed lengths and Device IDs never begin a transfer") {
    let transport = SensorNotificationTransport()
    for invalid in [Data(packet.dropLast()), packet + Data([0]), Data(repeating: 0, count: 72)] {
      try expectError(.invalidPacket) {
        try transport.begin(packet: invalid, subscribers: [client: 20]) { _ in }
      }
    }
    try expect(!transport.isSending, "Invalid transfer remained pending")
  }

  try test("no subscribers prevents all notification transmission") {
    let transport = SensorNotificationTransport()
    try expectError(.noSubscribers) {
      try transport.begin(packet: packet, subscribers: [:]) { _ in }
    }
    var calls = 0
    transport.drain { _, _ in calls += 1; return true }
    try expect(calls == 0, "Notified without a subscriber")
  }

  try test("every subscriber must support at least 20 bytes") {
    let transport = SensorNotificationTransport()
    try expectError(.notificationTooSmall) {
      try transport.begin(packet: packet, subscribers: [client: 512, UUID(): 19]) { _ in }
    }
    try expect(!transport.isSending, "Undersized notification was accepted")
  }

  try test("backpressure retries the rejected frame without skipping accepted frames") {
    let transport = SensorNotificationTransport()
    var completed = 0
    var attempts: [UInt8] = []
    var accepted: [Data] = []
    try transport.begin(packet: packet, subscribers: [client: 512]) { _ in completed += 1 }
    transport.drain { frame, _ in
      attempts.append(frame[0])
      if frame[0] == 2 { return false }
      accepted.append(frame)
      return true
    }
    try expect(transport.isSending && completed == 0, "Completed before the queue was ready")
    transport.drain { frame, _ in attempts.append(frame[0]); accepted.append(frame); return true }
    try expect(attempts == [0, 1, 2, 2, 3], "Wrong retry sequence")
    try expect(accepted.reduce(Data()) { $0 + $1.dropFirst(2) } == packet, "Retry corrupted data")
    try expect(completed == 1 && !transport.isSending, "Completion must occur exactly once")
  }

  try test("a second packet is rejected while the first is pending") {
    let transport = SensorNotificationTransport()
    try transport.begin(packet: packet, subscribers: [client: 20]) { _ in }
    transport.drain { _, _ in false }
    try expectError(.busy) {
      try transport.begin(packet: packet, subscribers: [client: 20]) { _ in }
    }
    var indices: [UInt8] = []
    transport.drain { frame, _ in indices.append(frame[0]); return true }
    try expect(indices == [0, 1, 2, 3], "Overlapping packet changed the pending transfer")
  }

  try test("recipient unsubscription aborts a partial packet and clears queued frames") {
    let transport = SensorNotificationTransport()
    var failures = 0
    var error: Error?
    try transport.begin(packet: packet, subscribers: [client: 20]) { result in
      if case .failure(let failure) = result { failures += 1; error = failure }
    }
    transport.drain { frame, _ in frame[0] == 0 }
    transport.unsubscribe(UUID())
    try expect(transport.isSending, "Unrelated central cancelled the transfer")
    transport.unsubscribe(client)
    transport.cancel(SensorBleError.stopped)
    try expect(!transport.isSending && failures == 1, "Cancellation must settle exactly once")
    try expect(error?.localizedDescription == SensorBleError.unsubscribed.localizedDescription, "Wrong failure")
    var calls = 0
    transport.drain { _, _ in calls += 1; return true }
    try expect(calls == 0, "Sent stale bytes after unsubscription")
  }

  try test("recipients are frozen until the next complete packet") {
    let transport = SensorNotificationTransport()
    let second = UUID()
    var subscribers = [client: 20]
    try transport.begin(packet: packet, subscribers: subscribers) { _ in }
    subscribers[second] = 20
    var seen: [[UUID]] = []
    transport.drain { _, recipients in seen.append(recipients); return true }
    try expect(seen.count == 4 && seen.allSatisfy { $0 == [client] }, "New central received partial packet")
    try transport.begin(packet: packet, subscribers: subscribers) { _ in }
    transport.drain { _, recipients in
      seen.append(recipients)
      return true
    }
    try expect(seen.suffix(4).allSatisfy { Set($0) == Set([client, second]) }, "Next packet omitted new central")
  }

  try test("stopping, timeout, and Bluetooth loss settle a blocked send and permit a fresh packet") {
    for reason in [SensorBleError.stopped, .timedOut, .notReady] {
      let transport = SensorNotificationTransport()
      var failure: Error?
      try transport.begin(packet: packet, subscribers: [client: 20]) { result in
        if case .failure(let error) = result { failure = error }
      }
      transport.drain { _, _ in false }
      transport.cancel(reason)
      try expect(failure?.localizedDescription == reason.localizedDescription, "Cancellation reason was lost")
      var complete = false
      try transport.begin(packet: packet, subscribers: [client: 20]) { result in
        if case .success = result { complete = true }
      }
      transport.drain { _, _ in true }
      try expect(complete && !transport.isSending, "Could not send after cancellation")
    }
  }

  try test("consecutive packets restart at chunk zero and preserve uint8 boundaries") {
    let transport = SensorNotificationTransport()
    for value in [UInt8(0), UInt8(255)] {
      let next = Data("SENS-001".utf8) + Data(repeating: value, count: 64)
      try transport.begin(packet: next, subscribers: [client: 20]) { _ in }
      var frames: [Data] = []
      transport.drain { frame, _ in frames.append(frame); return true }
      try expect(frames.map { $0[0] } == [0, 1, 2, 3], "Chunk numbering did not reset")
      try expect(frames.reduce(Data()) { $0 + $1.dropFirst(2) } == next, "Boundary values changed")
    }
  }

  try test("a timed-out partial packet requires resubscription before another send") {
    let transport = SensorNotificationTransport()
    try transport.begin(packet: packet, subscribers: [client: 20]) { _ in }
    transport.drain { frame, _ in frame[0] == 0 }
    transport.cancel(SensorBleError.timedOut)
    try expectError(.requiresResubscription) {
      try transport.begin(packet: packet, subscribers: [client: 20]) { _ in }
    }
    transport.unsubscribe(client)
    try transport.begin(packet: packet, subscribers: [client: 20]) { _ in }
    transport.drain { _, _ in true }
    try expect(!transport.isSending, "Fresh subscription could not send")
  }

  try test("unsubscription protects other recipients from receiving mixed logical packets") {
    let transport = SensorNotificationTransport()
    let second = UUID()
    try transport.begin(packet: packet, subscribers: [client: 20, second: 20]) { _ in }
    transport.drain { frame, _ in frame[0] == 0 }
    transport.unsubscribe(client)
    try expectError(.requiresResubscription) {
      try transport.begin(packet: packet, subscribers: [second: 20]) { _ in }
    }
    transport.reset(SensorBleError.stopped)
    try transport.begin(packet: packet, subscribers: [second: 20]) { _ in }
    transport.drain { _, _ in true }
    try expect(!transport.isSending, "A new GATT session retained interrupted recipients")
  }

  print("\(testsPassed) native transport tests passed.")
} catch {
  fputs("FAIL: \(error)\n", stderr)
  exit(1)
}
