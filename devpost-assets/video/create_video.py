from __future__ import annotations

import io
import struct
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps


WIDTH = 1280
HEIGHT = 720
FRAMES_PER_SECOND = 10
HOLD_STEPS = 10
TRANSITION_FRAMES = 6


@dataclass(frozen=True)
class Segment:
    path: Path
    duration_seconds: int
    zoom: float


ROOT = Path(__file__).resolve().parents[1]
VIDEO_DIR = ROOT / "video"
GALLERY_DIR = ROOT / "gallery"
RENDERED_DIR = VIDEO_DIR / "rendered"
OUTPUT = VIDEO_DIR / "continuum-demo-source.avi"

SEGMENTS = [
    Segment(RENDERED_DIR / "title-slide.png", 15, 0.006),
    Segment(GALLERY_DIR / "01-today-care.png", 15, 0.018),
    Segment(GALLERY_DIR / "02-health-timeline.png", 15, 0.018),
    Segment(GALLERY_DIR / "07-what-changed.png", 15, 0.018),
    Segment(GALLERY_DIR / "04-vet-visit-mode.png", 20, 0.014),
    Segment(GALLERY_DIR / "05-vet-packet.png", 18, 0.014),
    Segment(GALLERY_DIR / "03-health-trends.png", 10, 0.016),
    Segment(GALLERY_DIR / "06-longevity-tracker.png", 9, 0.016),
    Segment(GALLERY_DIR / "08-mobile-experience.png", 5, 0.008),
    Segment(RENDERED_DIR / "codex-gpt-slide.png", 21, 0.005),
    Segment(RENDERED_DIR / "end-slide.png", 7, 0.003),
]


def cover(image: Image.Image) -> Image.Image:
    return ImageOps.fit(
        image.convert("RGB"),
        (WIDTH, HEIGHT),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def zoom_frame(image: Image.Image, progress: float, zoom: float) -> Image.Image:
    scale = 1 + zoom * progress
    scaled = image.resize(
        (round(WIDTH * scale), round(HEIGHT * scale)),
        Image.Resampling.LANCZOS,
    )
    max_x = max(0, scaled.width - WIDTH)
    max_y = max(0, scaled.height - HEIGHT)
    # A tiny horizontal drift keeps the cut alive without looking staged.
    left = round(max_x * (0.42 + 0.16 * progress))
    top = round(max_y / 2)
    return scaled.crop((left, top, left + WIDTH, top + HEIGHT))


def jpeg_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=88, subsampling=1, optimize=False)
    return buffer.getvalue()


def repeat_counts(total: int, slots: int) -> list[int]:
    base, remainder = divmod(total, slots)
    return [base + (1 if index < remainder else 0) for index in range(slots)]


def build_frames() -> list[bytes]:
    sources = [cover(Image.open(segment.path)) for segment in SEGMENTS]
    encoded_frames: list[bytes] = []

    for index, segment in enumerate(SEGMENTS):
        has_next = index < len(SEGMENTS) - 1
        segment_frames = segment.duration_seconds * FRAMES_PER_SECOND
        hold_count = segment_frames - (TRANSITION_FRAMES if has_next else 0)
        hold_repeats = repeat_counts(hold_count, HOLD_STEPS)

        hold_images = [
            zoom_frame(
                sources[index],
                progress=step / max(1, HOLD_STEPS - 1),
                zoom=segment.zoom,
            )
            for step in range(HOLD_STEPS)
        ]
        for image, repeats in zip(hold_images, hold_repeats, strict=True):
            encoded = jpeg_bytes(image)
            encoded_frames.extend([encoded] * repeats)

        if has_next:
            current = hold_images[-1]
            next_image = zoom_frame(sources[index + 1], progress=0, zoom=SEGMENTS[index + 1].zoom)
            for transition_index in range(1, TRANSITION_FRAMES + 1):
                blend = transition_index / TRANSITION_FRAMES
                encoded_frames.append(jpeg_bytes(Image.blend(current, next_image, blend)))

        print(f"Prepared segment {index + 1}/{len(SEGMENTS)}: {segment.path.name}")

    expected_frames = 150 * FRAMES_PER_SECOND
    if len(encoded_frames) != expected_frames:
        raise RuntimeError(f"Expected {expected_frames} frames, got {len(encoded_frames)}")
    return encoded_frames


def write_chunk(file, fourcc: bytes, payload: bytes) -> None:
    file.write(fourcc)
    file.write(struct.pack("<I", len(payload)))
    file.write(payload)
    if len(payload) % 2:
        file.write(b"\0")


def start_list(file, list_type: bytes) -> tuple[int, int]:
    list_start = file.tell()
    file.write(b"LIST")
    size_position = file.tell()
    file.write(b"\0\0\0\0")
    file.write(list_type)
    return list_start, size_position


def finish_list(file, size_position: int) -> None:
    end = file.tell()
    size = end - size_position - 4
    file.seek(size_position)
    file.write(struct.pack("<I", size))
    file.seek(end)


def write_mjpeg_avi(frames: list[bytes]) -> None:
    max_frame_size = max(map(len, frames))
    total_frames = len(frames)
    microseconds_per_frame = round(1_000_000 / FRAMES_PER_SECOND)

    with OUTPUT.open("wb") as file:
        file.write(b"RIFF")
        riff_size_position = file.tell()
        file.write(b"\0\0\0\0")
        file.write(b"AVI ")

        _, hdrl_size_position = start_list(file, b"hdrl")
        avih = struct.pack(
            "<IIIIIIIIIIIIII",
            microseconds_per_frame,
            max_frame_size * FRAMES_PER_SECOND,
            0,
            0x10,
            total_frames,
            0,
            1,
            max_frame_size,
            WIDTH,
            HEIGHT,
            0,
            0,
            0,
            0,
        )
        write_chunk(file, b"avih", avih)

        _, strl_size_position = start_list(file, b"strl")
        strh = struct.pack(
            "<4s4sIHHIIIIIIIIhhhh",
            b"vids",
            b"MJPG",
            0,
            0,
            0,
            0,
            1,
            FRAMES_PER_SECOND,
            0,
            total_frames,
            max_frame_size,
            0xFFFFFFFF,
            0,
            0,
            0,
            WIDTH,
            HEIGHT,
        )
        write_chunk(file, b"strh", strh)
        strf = struct.pack(
            "<IiiHH4sIiiII",
            40,
            WIDTH,
            HEIGHT,
            1,
            24,
            b"MJPG",
            max_frame_size,
            0,
            0,
            0,
            0,
        )
        write_chunk(file, b"strf", strf)
        finish_list(file, strl_size_position)
        finish_list(file, hdrl_size_position)

        movi_list_start, movi_size_position = start_list(file, b"movi")
        index_entries: list[tuple[int, int]] = []
        for frame in frames:
            chunk_start = file.tell()
            write_chunk(file, b"00dc", frame)
            index_entries.append((chunk_start - (movi_list_start + 8), len(frame)))
        finish_list(file, movi_size_position)

        index_payload = b"".join(
            struct.pack("<4sIII", b"00dc", 0x10, offset, size)
            for offset, size in index_entries
        )
        write_chunk(file, b"idx1", index_payload)

        end = file.tell()
        file.seek(riff_size_position)
        file.write(struct.pack("<I", end - 8))


def main() -> None:
    frames = build_frames()
    write_mjpeg_avi(frames)
    print(f"Created {OUTPUT}")
    print(f"Frames: {len(frames)} at {FRAMES_PER_SECOND} fps")
    print(f"Duration: {len(frames) / FRAMES_PER_SECOND:.0f} seconds")


if __name__ == "__main__":
    main()
