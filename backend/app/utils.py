import asyncio
from pathlib import Path

from fastapi import UploadFile

PDF_MAGIC = b"%PDF-"
READ_CHUNK = 1024 * 1024


class UploadError(Exception):
    """Rejected upload, with a message safe to return to the client."""


async def save_upload(file: UploadFile, dst: Path, max_bytes: int) -> int:
    """Stream an upload to disk, enforcing the size cap as it goes so a huge
    file is never fully buffered. Returns the number of bytes written."""
    await asyncio.to_thread(dst.parent.mkdir, parents=True, exist_ok=True)

    size = 0
    checked_magic = False
    handle = await asyncio.to_thread(open, dst, "wb")
    try:
        while True:
            chunk = await file.read(READ_CHUNK)
            if not chunk:
                break
            if not checked_magic:
                if not chunk.startswith(PDF_MAGIC):
                    raise UploadError("Only PDF files are supported.")
                checked_magic = True
            size += len(chunk)
            if size > max_bytes:
                raise UploadError(
                    f"File is larger than the {max_bytes // (1024 * 1024)}MB limit."
                )
            await asyncio.to_thread(handle.write, chunk)
        if size == 0:
            raise UploadError("The uploaded file is empty.")
    except Exception:
        await asyncio.to_thread(handle.close)
        await remove_file(dst)
        raise
    else:
        await asyncio.to_thread(handle.close)

    return size


async def remove_file(path: Path) -> None:
    await asyncio.to_thread(path.unlink, True)
