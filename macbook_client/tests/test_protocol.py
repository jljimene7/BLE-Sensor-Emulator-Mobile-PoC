import unittest

from macbook_client.protocol import (
    DEVICE_ID_BYTES,
    LOGICAL_PACKET_SIZE,
    NotificationFrameAssembler,
    ProtocolError,
    decode_sensor_packet,
)


def make_frames(payload: bytes) -> list[bytes]:
    return [
        bytes((index, 4)) + payload[index * 18 : (index + 1) * 18]
        for index in range(4)
    ]


class SensorPacketTests(unittest.TestCase):
    def test_decodes_device_id_and_row_major_matrix(self) -> None:
        values = bytes(range(64))
        packet = decode_sensor_packet(DEVICE_ID_BYTES + values)

        self.assertEqual(packet.device_id, "SENS-001")
        self.assertEqual(
            packet.matrix,
            [list(range(row * 8, (row + 1) * 8)) for row in range(8)],
        )

    def test_rejects_wrong_logical_packet_length(self) -> None:
        with self.assertRaisesRegex(ProtocolError, "72 bytes"):
            decode_sensor_packet(bytes(LOGICAL_PACKET_SIZE - 1))

    def test_rejects_invalid_device_id(self) -> None:
        with self.assertRaisesRegex(ProtocolError, "Unexpected Device ID"):
            decode_sensor_packet(b"INVALID!" + bytes(64))


class NotificationFrameAssemblerTests(unittest.TestCase):
    def test_reassembles_frames_arriving_out_of_order(self) -> None:
        payload = DEVICE_ID_BYTES + bytes(range(64))
        frames = make_frames(payload)
        assembler = NotificationFrameAssembler()

        self.assertIsNone(assembler.add_frame(frames[2]))
        self.assertIsNone(assembler.add_frame(frames[0]))
        self.assertIsNone(assembler.add_frame(frames[3]))
        self.assertEqual(assembler.add_frame(frames[1]), payload)

    def test_identical_duplicate_does_not_complete_packet_early(self) -> None:
        payload = DEVICE_ID_BYTES + bytes(range(64))
        frames = make_frames(payload)
        assembler = NotificationFrameAssembler()

        self.assertIsNone(assembler.add_frame(frames[0]))
        self.assertIsNone(assembler.add_frame(frames[0]))
        self.assertIsNone(assembler.add_frame(frames[1]))
        self.assertIsNone(assembler.add_frame(frames[2]))
        self.assertEqual(assembler.add_frame(frames[3]), payload)

    def test_rejects_wrong_frame_length_and_chunk_count(self) -> None:
        assembler = NotificationFrameAssembler()
        with self.assertRaisesRegex(ProtocolError, "20 bytes"):
            assembler.add_frame(bytes(19))
        with self.assertRaisesRegex(ProtocolError, "Chunk count must be 4"):
            assembler.add_frame(bytes((0, 3)) + bytes(18))

    def test_rejects_out_of_range_chunk_index(self) -> None:
        assembler = NotificationFrameAssembler()
        with self.assertRaisesRegex(ProtocolError, "Chunk index"):
            assembler.add_frame(bytes((4, 4)) + bytes(18))

    def test_conflicting_duplicate_discards_incomplete_packet(self) -> None:
        payload = DEVICE_ID_BYTES + bytes(range(64))
        frames = make_frames(payload)
        assembler = NotificationFrameAssembler()
        assembler.add_frame(frames[1])

        conflicting = bytes((1, 4)) + bytes([255]) * 18
        with self.assertRaisesRegex(ProtocolError, "Conflicting duplicate"):
            assembler.add_frame(conflicting)

        self.assertIsNone(assembler.add_frame(frames[0]))
        self.assertIsNone(assembler.add_frame(frames[1]))
        self.assertIsNone(assembler.add_frame(frames[2]))
        self.assertEqual(assembler.add_frame(frames[3]), payload)


if __name__ == "__main__":
    unittest.main()
