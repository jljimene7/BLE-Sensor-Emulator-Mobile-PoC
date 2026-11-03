# Controls BLE Sensor Emulator

An Expo React Native proof of concept that displays Device ID `SENS-001`,
generates an 8 × 8 sensor matrix, and implements an iOS BLE peripheral using
Swift and CoreBluetooth. It advertises the sensor service and queues each
72-byte sample as four 20-byte notifications for subscribed clients.

## Install and build for iPhone

Use a Node.js version accepted by `package.json` (for example, Node 22.13+).
Install full Xcode, select it under Xcode Settings → Locations → Command Line
Tools, and finish its first-run setup. Connect an iPhone, trust the Mac, enable
Developer Mode, and configure an Apple development signing team when prompted.

```bash
npm install
npm run ios:device
```

Allow Bluetooth access when the app requests it. Keep the app in the foreground
for this PoC. Once Bluetooth is on and service publication succeeds, the screen
reports advertising and the number of subscribed clients. Press **Generate &
Send** to generate a sample and queue its four notifications. Without a
subscriber, the matrix still updates and the app explicitly reports no data sent.

The custom native module requires a development build; Expo Go cannot provide
this BLE functionality. Android BLE is not implemented.

## Develop and test

After installing the development app, start Metro with:

```bash
npm start
```

JavaScript changes use this server. Rebuild with `npm run ios:device` after
changing Swift code. If native dependencies or app configuration change,
regenerate the native project with `npm run ios:prebuild`, then rebuild. The
generated root `ios/` directory is ignored; the native module source under
`modules/sensor-ble-server/ios/` is versioned.

```bash
npm test
npm run typecheck
npm run test:native
python3 -m unittest discover -s macbook_client/tests -v
```

`test:native` requires macOS and Swift Command Line Tools. It runs the actual
Swift notification transport tests and type-checks the CoreBluetooth server
against the host macOS SDK. A complete iOS build still requires Xcode.
`npm run ios` builds for a simulator for UI checks; physical BLE validation
requires an iPhone.

## Verify BLE communication

Install and run the [MacBook client](./macbook_client/README.md):

```bash
python3 -m venv macbook_client/.venv
source macbook_client/.venv/bin/activate
python -m pip install -r macbook_client/requirements.txt
python -m macbook_client
```

Wait until the iPhone reports a subscribed client, then press **Generate & Send**.
The client prints one received matrix and exits. Compare all 64 values with the
iPhone display. Run the client again for another sample or reconnect test.
The app's queued-frame message confirms CoreBluetooth accepted the frames; only
the MacBook output confirms receipt. Reconnect clients after an interrupted
partial transmission before sending another sample.

The [BLE protocol](./.github/BLE_PROTOCOL.md) defines the UUIDs and byte layout.
[Milestone 6 notes](./docs/context/issue_6.md) list the implementation, checks performed,
the successful native iOS build, and outstanding physical-iPhone verification for issue #51.
