# Controls BLE Sensor Emulator

An Expo React Native proof of concept that displays the stable Device ID
`SENS-001` and generates an 8 × 8 matrix of simulated sensor values.

## Run the app

Use a Node.js version accepted by the `engines` range in `package.json`.

```bash
npm install
npm start
```

Follow the Expo CLI prompts to open the app in an iOS or Android simulator, or
scan the QR code with Expo Go.

## Test and type-check

```bash
npm test
npm run typecheck
```

The pure TypeScript domain layer also includes a packet marshaller conforming to
[the BLE protocol](./docs/BLE_PROTOCOL.md). BLE transport and native peripheral
functionality are not implemented.
