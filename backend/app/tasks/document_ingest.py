import asyncio
import traceback
from pathlib import Path
from uuid import UUID

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.constants import DOC_STATUS, DOC_TERMINAL_STATUSES
from app.models import UserDocument
from app.pdf import PdfError, extract_pages
from app.vectorstore import delete_document_points, upsert_chunks


def document_path(user_id, stored_name: str) -> Path:
    return settings.upload_dir / str(user_id) / stored_name


def _split(pages: list[tuple[int, str]]) -> list[tuple[int, str]]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    docs = splitter.create_documents(
        texts=[text for _, text in pages],
        metadatas=[{"page": page} for page, _ in pages],
    )
    return [(d.metadata["page"], d.page_content) for d in docs]


async def _should_stop(document_id: UUID) -> bool:
    """A cancelled tombstone *or* a deleted row means the user pulled the
    document out from under us; either way nothing more should be written."""
    doc = await UserDocument.get(document_id)
    return doc is None or doc.status == DOC_STATUS["cancelled"]


async def ingest_document(ctx, document_id: str):
    doc_id = UUID(document_id)
    doc = await UserDocument.get(doc_id)
    if doc is None:
        return "missing"
    if doc.status in DOC_TERMINAL_STATUSES:
        return doc.status

    qdrant = ctx["qdrant"]
    embeddings = ctx["embeddings"]
    path = document_path(doc.user_id, doc.stored_name)

    try:
        await doc.set({UserDocument.status: DOC_STATUS["parsing"]})

        pages, page_count = await asyncio.to_thread(extract_pages, path)
        chunks = await asyncio.to_thread(_split, pages)
        if not chunks:
            raise PdfError("No readable text found in this PDF.")

        if await _should_stop(doc_id):
            return DOC_STATUS["cancelled"]

        await doc.set(
            {
                UserDocument.status: DOC_STATUS["embedding"],
                UserDocument.page_count: page_count,
            }
        )

        vectors = await embeddings.aembed_documents([text for _, text in chunks])

        # Last check before the write; the re-check afterwards closes the window
        # where a cancel lands between here and the upsert completing.
        if await _should_stop(doc_id):
            return DOC_STATUS["cancelled"]

        await upsert_chunks(
            qdrant,
            document_id=doc_id,
            user_id=str(doc.user_id),
            vectors=vectors,
            chunks=chunks,
        )

        if await _should_stop(doc_id):
            await delete_document_points(
                qdrant, document_id=doc_id, user_id=str(doc.user_id)
            )
            return DOC_STATUS["cancelled"]

        await doc.set(
            {
                UserDocument.status: DOC_STATUS["ready"],
                UserDocument.chunk_count: len(chunks),
                UserDocument.error: None,
            }
        )
        return DOC_STATUS["ready"]

    except PdfError as exc:
        # Deterministic: retrying parses the same bytes to the same failure.
        await doc.set(
            {UserDocument.status: DOC_STATUS["failed"], UserDocument.error: str(exc)}
        )
        return DOC_STATUS["failed"]

    except Exception:
        traceback.print_exc()
        if ctx.get("job_try", 1) >= ctx.get("max_tries", 5):
            await doc.set(
                {
                    UserDocument.status: DOC_STATUS["failed"],
                    UserDocument.error: "Processing failed. Please try uploading again.",
                }
            )
            return DOC_STATUS["failed"]
        raise
