# MacBook BLE Client

This standalone Python client scans for the Sensor Emulator Service, connects,
subscribes to its Sensor Data Characteristic, reassembles the four notification
frames, validates the 72-byte packet and `SENS-001` Device ID, and prints the
8 × 8 matrix in row-major order.

The UUIDs, packet layout, and transport framing follow Protocol Version 1.0 in
[`../docs/BLE_PROTOCOL.md`](../docs/BLE_PROTOCOL.md). This client does not modify
or implement mobile BLE behavior.

## Install

From the repository root, create and activate a virtual environment, then install
the client dependency:

```bash
python3 -m venv macbook_client/.venv
source macbook_client/.venv/bin/activate
python -m pip install -r macbook_client/requirements.txt
```

## Run

With that virtual environment activated, from the repository root:

```bash
python -m macbook_client
```

The client scans for up to 30 seconds by default. A different scan timeout can
be supplied with `--scan-timeout SECONDS`. Once subscribed, it waits until one
complete valid sensor packet arrives; press Ctrl+C to stop waiting.

## Local protocol tests

These tests do not require BLE hardware or Bleak to be installed:

```bash
python3 -m unittest discover -s macbook_client/tests -v
```
