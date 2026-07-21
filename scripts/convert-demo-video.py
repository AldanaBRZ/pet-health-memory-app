from __future__ import annotations

import argparse
import io
import os
import shutil
import struct
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


WIDTH = 1280
HEIGHT = 720
FRAMES_PER_SECOND = 15
ROOT = Path(__file__).resolve().parents[1]
TRANSCODER_SOURCE = ROOT / "devpost-assets" / "video" / "transcode_video.m"


def resolve_ffmpeg() -> Path:
    configured = os.environ.get("FFMPEG")
    if configured:
        candidate = Path(configured).expanduser()
        if candidate.is_file():
            return candidate
        raise FileNotFoundError(f"FFMPEG points to a missing file: {candidate}")

    installed = shutil.which("ffmpeg")
    if installed:
        return Path(installed)

    cache_roots = (
        Path.home() / "Library" / "Caches" / "ms-playwright",
        Path.home() / ".cache" / "ms-playwright",
    )
    for cache_root in cache_roots:
        candidates = sorted(cache_root.glob("ffmpeg-*/ffmpeg-*"), reverse=True)
        for candidate in candidates:
            if candidate.is_file():
                return candidate

    raise FileNotFoundError(
        "ffmpeg was not found. Install it or set FFMPEG to the executable path."
    )


def jpeg_bytes(path: Path) -> bytes:
    with Image.open(path) as image:
        buffer = io.BytesIO()
        image.convert("RGB").save(
            buffer,
            format="JPEG",
            quality=90,
            subsampling=1,
            optimize=False,
        )
        return buffer.getvalue()


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


def write_mjpeg_avi(frame_paths: list[Path], output: Path) -> None:
    frames = [jpeg_bytes(path) for path in frame_paths]
    max_frame_size = max(map(len, frames))
    total_frames = len(frames)
    microseconds_per_frame = round(1_000_000 / FRAMES_PER_SECOND)

    with output.open("wb") as file:
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


def convert(input_path: Path, output_path: Path) -> None:
    if not input_path.exists():
        raise FileNotFoundError(input_path)
    ffmpeg = resolve_ffmpeg()

    with tempfile.TemporaryDirectory(prefix="continuum-demo-") as temp_value:
        temp = Path(temp_value)
        frames_dir = temp / "frames"
        frames_dir.mkdir()
        avi_path = temp / "continuum-live-demo.avi"
        transcoder = temp / "transcode_video"

        subprocess.run(
            [
                str(ffmpeg),
                "-y",
                "-i",
                str(input_path),
                "-r",
                str(FRAMES_PER_SECOND),
                "-vf",
                f"scale={WIDTH}:{HEIGHT}",
                str(frames_dir / "frame-%05d.png"),
            ],
            check=True,
        )

        frame_paths = sorted(frames_dir.glob("frame-*.png"))
        if not frame_paths:
            raise RuntimeError("No video frames were decoded")
        print(f"Decoded {len(frame_paths)} frames at {FRAMES_PER_SECOND} fps")

        write_mjpeg_avi(frame_paths, avi_path)
        print(f"Prepared MJPEG source: {avi_path}")

        subprocess.run(
            [
                "clang",
                "-fobjc-arc",
                "-framework",
                "Foundation",
                "-framework",
                "AVFoundation",
                str(TRANSCODER_SOURCE),
                "-o",
                str(transcoder),
            ],
            check=True,
        )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([str(transcoder), str(avi_path), str(output_path)], check=True)

    print(f"Created {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert the Playwright demo recording to H.264 MP4")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    convert(args.input.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
