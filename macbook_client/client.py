"""Scan for and receive one sensor packet from the BLE peripheral."""

from __future__ import annotations

import argparse
import asyncio
import logging

from bleak import BleakClient, BleakScanner
from bleak.backends.characteristic import BleakGATTCharacteristic
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData
from bleak.exc import BleakError

from .protocol import (
    NotificationFrameAssembler,
    ProtocolError,
    SensorPacket,
    decode_sensor_packet,
)

SERVICE_UUID = "7B3E0001-6D4B-4C2F-9F0A-2D0D5B7A1001"
SENSOR_DATA_CHARACTERISTIC_UUID = "7B3E0002-6D4B-4C2F-9F0A-2D0D5B7A1001"
DEFAULT_SCAN_TIMEOUT = 30.0

LOGGER = logging.getLogger("macbook_client")


class ClientError(RuntimeError):
    """Raised when the expected BLE service or data is unavailable."""


def _advertises_service(
    _device: BLEDevice, advertisement: AdvertisementData
) -> bool:
    return SERVICE_UUID.lower() in {
        uuid.lower() for uuid in advertisement.service_uuids
    }


def _print_packet(packet: SensorPacket) -> None:
    print(f"Device ID: {packet.device_id}")
    print("Sensor matrix (8 x 8):")
    for row in packet.matrix:
        print(" ".join(f"{value:3d}" for value in row))


async def receive_one_packet(scan_timeout: float) -> None:
    """Find the documented service, subscribe, and print the first valid packet."""
    LOGGER.info("Scanning for service %s (timeout %.1f s)", SERVICE_UUID, scan_timeout)
    device = await BleakScanner.find_device_by_filter(
        _advertises_service, timeout=scan_timeout
    )
    if device is None:
        raise ClientError(
            f"No BLE peripheral advertising service {SERVICE_UUID} "
            f"was found within {scan_timeout:.1f} seconds"
        )

    LOGGER.info(
        "Found %s (%s); connecting",
        device.name or "unnamed peripheral",
        device.address,
    )
    assembler = NotificationFrameAssembler()
    packet_received = asyncio.Event()
    valid_packet: SensorPacket | None = None

    def on_notification(
        _characteristic: BleakGATTCharacteristic, data: bytearray
    ) -> None:
        nonlocal valid_packet
        try:
            logical_packet = assembler.add_frame(bytes(data))
            if logical_packet is None:
                return
            valid_packet = decode_sensor_packet(logical_packet)
        except ProtocolError as exc:
            LOGGER.warning("Rejected BLE notification data: %s", exc)
            return

        packet_received.set()

    async with BleakClient(device) as client:
        service = client.services.get_service(SERVICE_UUID)
        if service is None:
            raise ClientError(
                f"Connected peripheral does not expose service {SERVICE_UUID}"
            )

        characteristic = service.get_characteristic(
            SENSOR_DATA_CHARACTERISTIC_UUID
        )
        if characteristic is None:
            raise ClientError(
                "Connected service does not expose Sensor Data Characteristic "
                f"{SENSOR_DATA_CHARACTERISTIC_UUID}"
            )
        if "notify" not in {prop.lower() for prop in characteristic.properties}:
            raise ClientError(
                "Sensor Data Characteristic does not support BLE notifications"
            )

        LOGGER.info("Subscribing to Sensor Data Characteristic notifications")
        await client.start_notify(characteristic, on_notification)
        LOGGER.info("Subscribed; waiting for a complete valid sensor packet")
        await packet_received.wait()

    if valid_packet is None:
        raise ClientError("Notification completed without a decoded sensor packet")
    _print_packet(valid_packet)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Receive and decode one Conifer sensor BLE packet."
    )
    parser.add_argument(
        "--scan-timeout",
        type=float,
        default=DEFAULT_SCAN_TIMEOUT,
        help=f"seconds to scan for the service (default: {DEFAULT_SCAN_TIMEOUT:g})",
    )
    args = parser.parse_args()
    if args.scan_timeout <= 0:
        parser.error("--scan-timeout must be greater than zero")
    return args


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = _parse_args()
    try:
        asyncio.run(receive_one_packet(args.scan_timeout))
    except KeyboardInterrupt:
        LOGGER.info("Stopped by user")
    except (BleakError, ClientError) as exc:
        LOGGER.error("BLE client failed: %s", exc)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
