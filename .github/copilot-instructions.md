# GitHub Copilot Repository Instructions
# Controls BLE Sensor Emulator — Conifer Technologies Mobile App PoC

## 1. PROJECT PURPOSE

Build a cross-platform Expo React Native mobile application that emulates a physical BLE sensor.

Final system:

Mobile App
(BLE Peripheral / GATT Server)
        |
        | Bluetooth Low Energy
        v
MacBook Pro
(BLE Central / GATT Client)

The mobile application will ultimately:
1. Advertise a custom BLE GATT service.
2. Allow the MacBook Pro client to discover and connect to it.
3. Generate an 8 × 8 matrix containing 64 simulated sensor values.
4. Associate the matrix with the stable Device ID `SENS-001`.
5. Serialize the data into a defined binary application payload.
6. Transmit the payload using BLE notification(s).
7. Allow the MacBook client to decode and validate the received data.

Target platforms:
- iOS
- Android

Primary stack:
- Expo
- React Native
- TypeScript
- Jest
- EAS Build / Submit

Native BLE implementation, when required:
- iOS: Swift + CoreBluetooth / CBPeripheralManager
- Android: Kotlin + Android Bluetooth APIs

---

## 2. CURRENT DEVELOPMENT PHASE

Current milestone:

**Step 1 — Mobile App + Matrix Generation**

Implement only the functionality required for Step 1 unless explicitly asked to move to another phase.

### Allowed in Step 1

```text
src/
├── application/
│   └── useSensorEmulatorController.ts
│
├── constants/
│   └── sensor.ts
│
├── domain/
│   ├── SensorMatrixGenerator.ts
│   └── types.ts
│
└── presentation/
    ├── SensorScreen.tsx
    └── MatrixGrid.tsx

__tests__/
└── SensorMatrixGenerator.test.ts
```

Required Step 1 behavior:

```text
User presses "Generate Matrix"
        ↓
useSensorEmulatorController
        ↓
SensorMatrixGenerator
        ↓
Generate 8 × 8 matrix
        ↓
Update React state
        ↓
MatrixGrid renders values
```

The UI must display:
- App title
- Device ID `SENS-001`
- 8 × 8 matrix
- `Generate Matrix` button

### Do NOT implement during Step 1

Do not implement:
- PacketMarshaller
- binary packet serialization
- BLE adapters
- BLE advertising
- BLE scanning
- BLE permissions
- BLE connection logic
- GATT services
- GATT characteristics
- BLE notifications
- BLE status indicators that depend on real BLE state
- Swift native BLE modules
- Kotlin native BLE modules
- MacBook BLE client
- EAS deployment
- TestFlight
- Google Play deployment

Do not label the Step 1 button `Generate & Send`.

Use:

`Generate Matrix`

---

## 3. DEVELOPMENT ORDER

Implement incrementally:

```text
Step 1
Mobile App + Matrix Generation
        ↓
Step 2
Binary Packet Contract + Serialization
        ↓
Step 3
MacBook BLE Client
        ↓
Step 4
Mobile BLE Peripheral Implementation
        ↓
Step 5
End-to-End BLE Validation
        ↓
Step 6
Build, Beta Testing & Store Release
```

Do not implement future-step functionality unless explicitly requested.

---

## 4. ARCHITECTURE

Use lightweight Clean Architecture principles with Ports and Adapters and the Humble View pattern.

Dependency direction:

```text
Presentation
     ↓
Application
     ↓
Domain

Application
     ↓
Port
     ↑
Infrastructure
```

Do not add architectural layers that are not needed by an actual requirement.

### Presentation — `src/presentation/`

Responsibilities:
- Render application state.
- Display Device ID.
- Display matrix values.
- Capture user actions.
- Call application/controller functions.

Presentation components MUST NOT:
- generate BLE packets
- serialize binary data
- configure GATT
- call native BLE APIs
- contain BLE protocol logic

### Application — `src/application/`

Primary controller:

`useSensorEmulatorController.ts`

Step 1 responsibilities:
- expose the stable Device ID
- own current matrix state
- handle Generate Matrix requests
- call domain functions

Future responsibilities may include coordinating serialization and BLE adapter calls.

Do not implement those future responsibilities during Step 1.

### Domain — `src/domain/`

Domain code must be pure TypeScript.

It MUST NOT import:
- `react-native`
- `expo`
- BLE libraries
- native platform modules
- UI libraries

Domain code must be testable directly in Node/Jest.

### SensorMatrixGenerator

`SensorMatrixGenerator.ts` has one responsibility:

Generate exactly:
- 8 rows
- 8 columns
- 64 total values
- integer values from 0 through 255

It MUST NOT:
- generate the Device ID
- serialize packets
- know about BLE
- update React state
- know about UI components

### Constants

`src/constants/sensor.ts`

```typescript
export const DEVICE_ID = 'SENS-001';
```

The Device ID is stable.

Matrix values change between generated samples.

The Device ID does not.

---

## 5. FUTURE BLE PORT

Do not implement during Step 1.

Future location:

`src/application/ports/IBleServerAdapter.ts`

Purpose:

Define a platform-independent BLE peripheral contract.

Possible future operations:

```typescript
startAdvertising(): Promise<void>;
stopAdvertising(): Promise<void>;
notifyClients(data: Uint8Array): Promise<void>;
```

Application logic must depend on this abstraction rather than directly on native BLE APIs.

---

## 6. FUTURE INFRASTRUCTURE

Do not implement during Step 1.

Future location:

```text
src/infrastructure/
```

Potential implementations:

```text
BleGattServerAdapter.ts
MockBleAdapter.ts
```

`BleGattServerAdapter` will implement the BLE port and communicate with the native mobile BLE implementation.

`MockBleAdapter` may be introduced when application-layer BLE behavior needs to be exercised without native BLE hardware.

Do not create these files before they are needed.

---

## 7. BLE PROTOCOL CONTRACT — VERSION 1.0

The authoritative BLE protocol is documented in `docs/BLE_PROTOCOL.md`.
Implementations must use the UUIDs, logical-packet layout, and notification
framing defined there. Do not implement future BLE or serialization behavior
during Step 1 unless explicitly requested.

### GATT Identity

```text
Sensor Emulator Service UUID:
7B3E0001-6D4B-4C2F-9F0A-2D0D5B7A1001

Sensor Data Characteristic UUID:
7B3E0002-6D4B-4C2F-9F0A-2D0D5B7A1001

Characteristic property:
Notify
```

### Logical Application Payload

```text
Total size: 72 bytes
Bytes 0–7: ASCII Device ID "SENS-001" (8 bytes; no null padding)
Bytes 8–71: 64 unsigned 8-bit matrix values (uint8)
Matrix dimensions: 8 × 8
Matrix serialization order: row-major
```

### BLE Notification Transport

Protocol Version 1.0 transports each logical packet in exactly four
notification frames. Each frame is exactly 20 bytes:

```text
Byte 0: Chunk Index (0–3)
Byte 1: Chunk Count (4)
Bytes 2–19: 18 bytes of logical-packet payload
```

Reassemble one payload from chunks 0, 1, 2, and 3 in index order. The resulting
logical packet must be exactly 72 bytes before decoding. This four-frame
transport is fixed by the protocol; it is not optional or selected according
to the active connection. Transport framing must not be implemented inside
`SensorMatrixGenerator`.

### Future PacketMarshaller

Future file:

`src/domain/PacketMarshaller.ts`

Expected responsibilities:

```typescript
marshal(deviceId, matrix): Uint8Array
unmarshal(buffer): SensorPacket
```

Required invariant:

```text
original data
   ↓
marshal()
   ↓
72-byte payload
   ↓
unmarshal()
   ↓
identical original data
```

Round-trip serialization must be lossless.

---

## 8. FINAL BLE ROLES

Future implementation:

### Mobile Device

```text
BLE Peripheral
GATT Server
Sensor Emulator
```

### MacBook Pro

```text
BLE Central
GATT Client
Validation Client
```

Expected runtime flow:

```text
Mobile App                       MacBook Pro

Advertise Service
      ├──────────────────────────► Scan
      ◄────────────────────────── Connect
      ◄────────────────────────── Subscribe

Generate Matrix
      ↓
Serialize 72-byte Payload
      ↓
Send Four 20-byte Notification Frames
      ├──────────────────────────► Reassemble Packet
                                   ↓
                                 Decode
                                   ↓
                                Validate
```

The Sensor Data Characteristic requires:

`Notify`

`Read` is optional and should only be added if a real requirement appears.

---

## 9. NATIVE BLE IMPLEMENTATION

Future phase only.

Prefer the simplest maintained solution that satisfies:
- BLE peripheral role
- GATT server
- advertising
- characteristic notifications

If an appropriate Expo/React-Native-compatible library cannot provide those capabilities reliably, use a local Expo native module.

### iOS

Expected platform implementation:

```text
Swift
CoreBluetooth
CBPeripheralManager
```

### Android

Expected platform implementation:

```text
Kotlin
BluetoothGattServer
BluetoothLeAdvertiser
```

Do not generate this native implementation during Step 1.

---

## 10. CODING RULES

### TypeScript

Enable strict TypeScript.

Prefer:
- `strict: true`
- `noImplicitAny: true`
- explicit public return types

Avoid `any` unless technically necessary and documented.

### Naming

React components:
```text
SensorScreen.tsx
MatrixGrid.tsx
```

Classes:
```text
PacketMarshaller.ts
BleGattServerAdapter.ts
```

Interfaces:
```text
IBleServerAdapter.ts
```

Hooks:
```text
useSensorEmulatorController.ts
```

Functions:
```text
generateMatrix()
marshal()
unmarshal()
```

Constants:
```text
DEVICE_ID
MATRIX_SIZE
```

---

## 11. ERROR HANDLING

Pure domain functions should use explicit validation and descriptive errors.

Do not add broad `try/catch` blocks around deterministic pure functions without a specific failure mode.

Use `try/catch` around asynchronous or platform-dependent operations such as:
- Bluetooth operations
- native bridge calls
- permissions
- platform APIs

Do not silently suppress failures.

---

## 12. TESTING

### Step 1

`SensorMatrixGenerator.test.ts` must verify:

- exactly 8 rows
- exactly 8 columns per row
- exactly 64 total values
- every value is an integer
- every value is >= 0
- every value is <= 255

Do not require values to be unique.

Random sensor values may repeat.

### Step 2

Future `PacketMarshaller.test.ts` must verify:

- serialized length is exactly 72 bytes
- bytes 0–7 represent `SENS-001`
- matrix occupies bytes 8–71
- row-major ordering is preserved
- marshal/unmarshal round trip is lossless
- invalid inputs are rejected

### BLE Validation

Mocks and unit tests do not prove real BLE functionality.

Do not claim BLE communication works until it has been validated using physical BLE-capable devices.

---

## 13. PoC GUARDRAILS

This is a focused proof of concept.

Prefer KISS and YAGNI.

Do NOT introduce unless explicitly required:
- backend APIs
- cloud infrastructure
- databases
- authentication
- user accounts
- cloud storage
- analytics platforms
- Redux
- unnecessary navigation libraries
- microservices
- speculative plugin systems
- abstractions for hypothetical requirements

Prefer existing framework/platform capabilities before adding dependencies.

Explain why a new dependency is required before adding it.

---

## 14. COPILOT BEHAVIOR

When generating or modifying code:

1. Respect the current development phase.
2. Do not implement future phases automatically.
3. Keep UI components free of BLE and serialization logic.
4. Keep domain code pure TypeScript.
5. Never generate random Device IDs.
6. Use `DEVICE_ID = 'SENS-001'`.
7. Do not silently change the packet contract.
8. Update tests whenever domain behavior changes.
9. Prefer readable code over clever code.
10. Avoid speculative abstractions.
11. Preserve architectural boundaries.
12. Do not claim hardware functionality has been validated without physical-device evidence.
13. Treat generated code as requiring verification; do not assume generated code is correct merely because it compiles.

---

## 15. DEFINITION OF DONE — CURRENT STEP

Before declaring Step 1 complete:

- TypeScript compiles successfully.
- Existing tests pass.
- App launches successfully.
- `SENS-001` is displayed.
- `Generate Matrix` creates an 8 × 8 matrix.
- Exactly 64 valid values are generated.
- Repeated button presses generate new samples.
- UI contains no BLE implementation.
- UI contains no serialization logic.
- Domain code contains no React Native, Expo, or native dependencies.

---
## BLE Protocol Specification

The authoritative BLE communication protocol is defined in:

`docs/BLE_PROTOCOL.md`

All BLE-related implementations must follow this specification.

This includes:
- Service UUID
- Characteristic UUID
- Device ID encoding
- 72-byte logical packet layout
- Four 20-byte BLE notification frames
- Chunk indexing and reassembly rules

Do not modify the BLE protocol without explicitly updating
`docs/BLE_PROTOCOL.md` and the corresponding tests.

---

## 16. COMMANDS

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start
```

Run tests:

```bash
npm test
```

Native development builds — future BLE phase:

```bash
npx expo run:ios
npx expo run:android
```

EAS preview builds — future release phase:

```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

EAS production builds — future release phase:

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

EAS submission — future release phase:

```bash
eas submit --platform ios
eas submit --platform android
```