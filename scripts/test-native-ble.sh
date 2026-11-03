#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
native_dir="$repo_root/modules/sensor-ble-server/ios"
build_dir="$(mktemp -d "${TMPDIR:-/tmp}/sensor-ble-tests.XXXXXX")"
trap 'rm -rf "$build_dir"' EXIT

xcrun swiftc -swift-version 5 -module-cache-path "$build_dir/cache" \
  "$native_dir/SensorNotificationTransport.swift" \
  "$repo_root/native-tests/main.swift" -o "$build_dir/transport-tests"
"$build_dir/transport-tests"

# Uses the host SDK and does not substitute for an Expo iOS build with Xcode.
xcrun swiftc -typecheck -swift-version 5 -module-cache-path "$build_dir/cache" \
  "$native_dir/SensorNotificationTransport.swift" "$native_dir/SensorBlePeripheral.swift"
printf '%s\n' 'CoreBluetooth sources pass host macOS SDK type checking; iOS compilation requires Xcode.'
