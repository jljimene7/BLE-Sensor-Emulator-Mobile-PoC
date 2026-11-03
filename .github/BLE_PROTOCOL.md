# Controls BLE Sensor Emulator
## BLE Application Protocol Specification

**Project:** Conifer Technologies Mobile App PoC  
**Protocol Version:** 1.0  
**Status:** Draft for PoC Implementation  
**Last Updated:** 2026-10-20

---

## 1. Purpose

This document defines the application-level Bluetooth Low Energy (BLE) protocol used between the **Controls BLE Sensor Emulator mobile application** and an external BLE client.

The mobile application emulates a physical sensor that does not yet exist.

For the PoC:

- The **iPhone / Android phone** acts as the BLE sensor emulator.
- The **MacBook Pro** acts as the BLE client used for development and validation.
- The mobile application generates a stable Device ID and an 8×8 matrix of simulated sensor values.
- The sensor data is serialized into a binary application payload and transmitted to the subscribed BLE client.

This document is the source of truth for the BLE interface used by both the mobile application and the MacBook client.

---

# 2. BLE Roles

## Mobile Application

| Property | Value |
|---|---|
| BLE Role | Peripheral |
| GATT Role | Server |
| Purpose | Emulate the physical BLE sensor |
| Platforms | iOS first; Android later |

## MacBook Pro

| Property | Value |
|---|---|
| BLE Role | Central |
| GATT Role | Client |
| Purpose | Discover, connect, subscribe, receive, decode, and validate sensor data |

Conceptually:

```text
Mobile App
BLE Peripheral / GATT Server
             |
             | Bluetooth Low Energy
             v
MacBook Pro
BLE Central / GATT Client
```

---

# 3. BLE Identity

## Device ID

The emulated sensor uses the following fixed Device ID:

```text
SENS-001
```

The Device ID remains constant between generated sensor samples.

The matrix values change.

---

## Advertised Local Name

Preferred local advertising name:

```text
Conifer-SENS-001
```

The MacBook client should primarily identify the application using the **Service UUID**, not only the local advertising name.

---

# 4. GATT Profile

The application exposes one custom primary service containing one custom sensor-data characteristic.

## 4.1 Sensor Emulator Service

**Name:**

```text
Sensor Emulator Service
```

**Service UUID:**

```text
7B3E0001-6D4B-4C2F-9F0A-2D0D5B7A1001
```

**Type:**

```text
Custom 128-bit Primary Service
```

The mobile application advertises this Service UUID.

The MacBook client scans for this Service UUID when locating the sensor emulator.

---

## 4.2 Sensor Data Characteristic

**Name:**

```text
Sensor Data Characteristic
```

**Characteristic UUID:**

```text
7B3E0002-6D4B-4C2F-9F0A-2D0D5B7A1001
```

**Required Property:**

```text
Notify
```

`Read` is not required for Protocol Version 1.0.

The MacBook client subscribes to notifications on this characteristic before sensor data can be transmitted.

---

# 5. Connection Workflow

The expected BLE workflow is:

```text
Mobile Application                      MacBook Pro

Initialize BLE
      |
Create GATT Service
      |
Create Sensor Characteristic
      |
Start Advertising
      |
      | -----------------------------> Scan for Service UUID
      |
      | <----------------------------- Connect
      |
      | <----------------------------- Discover Service
      |
      | <----------------------------- Discover Characteristic
      |
      | <----------------------------- Subscribe to Notifications
      |
Client Subscribed
      |
      |      READY FOR DATA
```

The mobile application should not report successful transmission unless a BLE client is subscribed to the Sensor Data Characteristic.

---

# 6. Sensor Data Model

Each generated sensor sample contains:

```text
Device ID
+
8 × 8 Sensor Matrix
```

## 6.1 Matrix Dimensions

```text
Rows:       8
Columns:    8
Cells:      64
```

## 6.2 Matrix Cell Type

Each matrix cell is:

```text
Unsigned 8-bit integer (uint8)
```

Valid range:

```text
0–255
```

Example:

```text
 12   45   88   23   91   10   34   72
 17   29   51   63   84   11   90   42
  ...
```

---

# 7. Logical Application Payload

The logical sensor packet is exactly:

```text
72 bytes
```

It consists of:

```text
8-byte Device ID
+
64-byte Sensor Matrix
```

## 7.1 Binary Layout

| Byte Offset | Size | Field | Encoding |
|---|---:|---|---|
| 0–7 | 8 bytes | Device ID | ASCII |
| 8–71 | 64 bytes | Sensor Matrix | uint8 |

---

## 7.2 Device ID Encoding

The Device ID is:

```text
SENS-001
```

ASCII representation:

```text
S    E    N    S    -    0    0    1
```

Hex representation:

```text
53 45 4E 53 2D 30 30 31
```

The string is exactly 8 ASCII bytes.

No null padding is required.

---

## 7.3 Matrix Serialization

The 8×8 matrix is serialized using **row-major order**.

Given:

```text
m00 m01 m02 m03 m04 m05 m06 m07
m10 m11 m12 m13 m14 m15 m16 m17
m20 m21 m22 m23 m24 m25 m26 m27
...
m70 m71 m72 m73 m74 m75 m76 m77
```

the serialized order is:

```text
m00, m01, m02, m03, m04, m05, m06, m07,
m10, m11, m12, m13, m14, m15, m16, m17,
m20, m21, ...
...
m70, m71, m72, m73, m74, m75, m76, m77
```

Each value occupies exactly one byte.

---

# 8. Logical Packet Example

For the following Device ID:

```text
SENS-001
```

and matrix:

```text
  0   1   2   3   4   5   6   7
  8   9  10  11  12  13  14  15
 16  17  18  19  20  21  22  23
 24  25  26  27  28  29  30  31
 32  33  34  35  36  37  38  39
 40  41  42  43  44  45  46  47
 48  49  50  51  52  53  54  55
 56  57  58  59  60  61  62  63
```

the logical payload is:

```text
Bytes 0–7:
53 45 4E 53 2D 30 30 31

Bytes 8–71:
00 01 02 03 04 05 06 07
08 09 0A 0B 0C 0D 0E 0F
10 11 12 13 14 15 16 17
18 19 1A 1B 1C 1D 1E 1F
20 21 22 23 24 25 26 27
28 29 2A 2B 2C 2D 2E 2F
30 31 32 33 34 35 36 37
38 39 3A 3B 3C 3D 3E 3F
```

Total:

```text
72 bytes
```

---

# 9. BLE Notification Transport

The 72-byte application payload is the **logical sensor packet**.

BLE transport is treated separately from the logical packet format.

To make transport deterministic and compatible with conservative BLE notification sizes, Protocol Version 1.0 divides each 72-byte sensor packet into **four notification frames**.

Each BLE notification frame contains:

```text
2-byte Transport Header
+
18 bytes of Sensor Packet Data
```

Total notification frame size:

```text
20 bytes
```

---

## 9.1 Transport Frame Layout

| Byte Offset | Size | Field | Description |
|---|---:|---|---|
| 0 | 1 byte | Chunk Index | Current chunk number, 0–3 |
| 1 | 1 byte | Chunk Count | Always `4` in Protocol v1.0 |
| 2–19 | 18 bytes | Payload Data | Slice of the 72-byte logical packet |

---

## 9.2 Chunk Sequence

A complete sensor packet is transported as:

```text
Chunk 0
Chunk 1
Chunk 2
Chunk 3
```

Each chunk transports 18 bytes:

```text
4 chunks × 18 bytes
=
72 bytes
```

### Chunk 0

```text
Header:
Chunk Index = 0
Chunk Count = 4

Payload:
Logical packet bytes 0–17
```

### Chunk 1

```text
Header:
Chunk Index = 1
Chunk Count = 4

Payload:
Logical packet bytes 18–35
```

### Chunk 2

```text
Header:
Chunk Index = 2
Chunk Count = 4

Payload:
Logical packet bytes 36–53
```

### Chunk 3

```text
Header:
Chunk Index = 3
Chunk Count = 4

Payload:
Logical packet bytes 54–71
```

---

# 10. Reassembly Rules

The MacBook client shall:

1. Receive BLE notification frames.
2. Read the `Chunk Index`.
3. Read the `Chunk Count`.
4. Confirm `Chunk Count == 4`.
5. Store each 18-byte payload by chunk index.
6. Wait until chunks `0`, `1`, `2`, and `3` have been received.
7. Concatenate the payload sections in chunk-index order.
8. Confirm the reconstructed application payload is exactly 72 bytes.
9. Decode the logical sensor packet.

Expected reconstruction:

```text
Chunk 0 payload
+
Chunk 1 payload
+
Chunk 2 payload
+
Chunk 3 payload
=
72-byte logical sensor packet
```

The client should reject an incomplete packet rather than attempting to decode it as valid sensor data.

---

# 11. Transmission Trigger

Protocol Version 1.0 does not use periodic sensor transmission.

Data transmission occurs when the user presses:

```text
Generate & Send
```

The mobile application then performs:

```text
Generate 8×8 Matrix
        |
        v
Attach Device ID
        |
        v
Serialize 72-byte Logical Packet
        |
        v
Split into Four Transport Frames
        |
        v
Notify Chunk 0
        |
        v
Notify Chunk 1
        |
        v
Notify Chunk 2
        |
        v
Notify Chunk 3
```

Only one sensor packet should be transmitted at a time in the PoC.

The application should complete transmission of the current packet before beginning another packet transmission.

---

# 12. MacBook Client Requirements

The MacBook BLE client shall:

```text
Scan
  |
  v
Find Sensor Emulator Service UUID
  |
  v
Connect
  |
  v
Discover GATT Service
  |
  v
Discover Sensor Data Characteristic
  |
  v
Subscribe to Notifications
  |
  v
Receive Four Chunks
  |
  v
Reassemble 72-byte Packet
  |
  v
Decode Device ID
  |
  v
Decode 8×8 Matrix
  |
  v
Validate
  |
  v
Display / Log Result
```

Recommended implementation:

```text
Python + Bleak
```

---

# 13. Client Validation

After reconstructing a complete packet, the MacBook client shall verify:

## Payload

```text
Logical payload length == 72 bytes
```

## Device ID

```text
Decoded Device ID == "SENS-001"
```

## Matrix

```text
Number of values == 64
```

Each value must satisfy:

```text
0 <= value <= 255
```

The client shall reconstruct the matrix as:

```text
8 rows
×
8 columns
```

using row-major ordering.

For end-to-end validation, the matrix displayed by the MacBook client must exactly match the matrix displayed by the mobile application.

---

# 14. Error / Edge-Case Behavior

## No Subscribed Client

If no BLE central is subscribed:

```text
Generate Matrix
```

may still generate and display a new matrix.

However:

```text
Generate & Send
```

must not report a successful BLE transmission.

---

## Invalid Transport Frame

The client should reject a frame if:

- chunk index is outside `0–3`
- chunk count is not `4`
- frame does not contain the expected payload length

---

## Incomplete Packet

If all four chunks are not received, the client must not decode the packet as valid sensor data.

---

## Invalid Device ID

If the decoded Device ID is not:

```text
SENS-001
```

the client should report a protocol validation error.

---

# 15. Pairing and Security

Bluetooth pairing or bonding is **not required** for this PoC unless platform behavior later requires it.

The PoC focuses on:

- BLE discovery
- connection
- GATT subscription
- notification transport
- sensor-payload validation

Production security requirements are outside the current PoC scope.

---

# 16. Platform Scope

Protocol Version 1.0 is initially validated using:

```text
iPhone
   |
   | BLE
   v
MacBook Pro
```

The same BLE application protocol should later be implemented on Android without changing:

- Service UUID
- Characteristic UUID
- Device ID format
- 72-byte logical payload
- matrix serialization order
- notification-frame format

Platform-specific implementation details must remain behind the BLE adapter/native-module layer.

---

# 17. Source of Truth

This document is the authoritative BLE interface contract for the PoC.

The following implementations must conform to it:

```text
Mobile PacketMarshaller
Mobile BLE Adapter
iOS Native BLE Module
Android Native BLE Module
MacBook BLE Client
Unit Tests
End-to-End Tests
```

Do not silently change:

- Service UUID
- Characteristic UUID
- Device ID encoding
- matrix dimensions
- byte layout
- transport framing

If the protocol changes:

1. Update this document.
2. Update affected tests.
3. Update the mobile implementation.
4. Update the MacBook client.
5. Increment the protocol version when the change is incompatible.

---

# 18. Protocol Summary

```text
BLE Peripheral:
Mobile App

BLE Central:
MacBook Pro

Service UUID:
7B3E0001-6D4B-4C2F-9F0A-2D0D5B7A1001

Sensor Data Characteristic UUID:
7B3E0002-6D4B-4C2F-9F0A-2D0D5B7A1001

Characteristic Property:
Notify

Device ID:
SENS-001

Matrix:
8 × 8

Matrix Value Type:
uint8

Logical Packet Size:
72 bytes

Logical Packet:
8-byte Device ID + 64-byte matrix

Matrix Order:
Row-major

BLE Transport:
4 notification frames

Notification Frame Size:
20 bytes

Frame:
1-byte Chunk Index
+ 1-byte Chunk Count
+ 18-byte logical-packet payload

Transmission Trigger:
Generate & Send
```

---

# 19. Revision History

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-10-20 | Initial BLE application protocol for the Controls BLE Sensor Emulator PoC |