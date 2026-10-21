"""Protocol v1.0 packet decoding and notification-frame reassembly."""

from __future__ import annotations

from dataclasses import dataclass

DEVICE_ID = "SENS-001"
DEVICE_ID_BYTES = DEVICE_ID.encode("ascii")
MATRIX_SIZE = 8
LOGICAL_PACKET_SIZE = 72
FRAME_SIZE = 20
CHUNK_COUNT = 4
CHUNK_PAYLOAD_SIZE = 18


class ProtocolError(ValueError):
    """Raised when received BLE data does not match the documented protocol."""


@dataclass(frozen=True)
class SensorPacket:
    device_id: str
    matrix: list[list[int]]


def decode_sensor_packet(payload: bytes) -> SensorPacket:
    """Validate and decode one complete 72-byte logical sensor packet."""
    if len(payload) != LOGICAL_PACKET_SIZE:
        raise ProtocolError(
            f"Logical packet must be {LOGICAL_PACKET_SIZE} bytes; received {len(payload)}"
        )

    device_id_bytes = payload[: len(DEVICE_ID_BYTES)]
    try:
        device_id = device_id_bytes.decode("ascii")
    except UnicodeDecodeError as exc:
        raise ProtocolError("Device ID is not valid ASCII") from exc

    if device_id != DEVICE_ID:
        raise ProtocolError(
            f"Unexpected Device ID {device_id!r}; expected {DEVICE_ID!r}"
        )

    values = list(payload[len(DEVICE_ID_BYTES) :])
    if len(values) != MATRIX_SIZE * MATRIX_SIZE:
        raise ProtocolError(
            f"Sensor matrix must contain {MATRIX_SIZE * MATRIX_SIZE} values; "
            f"received {len(values)}"
        )

    matrix = [
        values[row * MATRIX_SIZE : (row + 1) * MATRIX_SIZE]
        for row in range(MATRIX_SIZE)
    ]
    return SensorPacket(device_id=device_id, matrix=matrix)


class NotificationFrameAssembler:
    """Reassemble protocol v1.0 frames, accepting chunks in any order."""

    def __init__(self) -> None:
        self._chunks: dict[int, bytes] = {}

    def reset(self) -> None:
        """Discard any incomplete packet."""
        self._chunks.clear()

    def add_frame(self, frame: bytes) -> bytes | None:
        """Add a notification frame and return a packet once all chunks arrive."""
        if len(frame) != FRAME_SIZE:
            raise ProtocolError(
                f"Notification frame must be {FRAME_SIZE} bytes; received {len(frame)}"
            )

        chunk_index, chunk_count = frame[0], frame[1]
        if chunk_count != CHUNK_COUNT:
            raise ProtocolError(
                f"Chunk count must be {CHUNK_COUNT}; received {chunk_count}"
            )
        if not 0 <= chunk_index < CHUNK_COUNT:
            raise ProtocolError(
                f"Chunk index must be between 0 and {CHUNK_COUNT - 1}; "
                f"received {chunk_index}"
            )

        chunk_payload = frame[2:]
        if len(chunk_payload) != CHUNK_PAYLOAD_SIZE:
            raise ProtocolError(
                f"Chunk payload must be {CHUNK_PAYLOAD_SIZE} bytes; "
                f"received {len(chunk_payload)}"
            )

        previous = self._chunks.get(chunk_index)
        if previous is not None:
            if previous == chunk_payload:
                return None
            if chunk_index == 0:
                # With no packet identifier, a new chunk 0 marks a new sequence.
                self.reset()
            else:
                self.reset()
                raise ProtocolError(
                    f"Conflicting duplicate for chunk {chunk_index}; "
                    "discarded the incomplete packet"
                )

        self._chunks[chunk_index] = chunk_payload
        if len(self._chunks) != CHUNK_COUNT:
            return None

        packet = b"".join(self._chunks[index] for index in range(CHUNK_COUNT))
        self.reset()
        if len(packet) != LOGICAL_PACKET_SIZE:
            raise ProtocolError(
                f"Reassembled packet must be {LOGICAL_PACKET_SIZE} bytes; "
                f"received {len(packet)}"
            )
        return packet
