from uuid import UUID

from arq import ArqRedis
from arq.jobs import Job
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Path,
    Query,
    Request,
    UploadFile,
    status,
)

from app.config import settings
from app.constants import DOC_STATUS, DOC_TERMINAL_STATUSES, INGEST_DOCUMENT_JOB
from app.dependencies.auth import verify_token
from app.models import UserDocument
from app.schemas import DocumentOut
from app.tasks.document_ingest import document_path
from app.utils import UploadError, remove_file, save_upload
from app.vectorstore import delete_document_points

router = APIRouter(tags=["documents"], dependencies=[Depends(verify_token)])


def _job_id(document_id: UUID) -> str:
    return f"ingest:{document_id}"


def _out(doc: UserDocument) -> DocumentOut:
    return DocumentOut(
        id=str(doc.id),
        original_name=doc.original_name,
        status=doc.status,
        page_count=doc.page_count,
        chunk_count=doc.chunk_count,
        error=doc.error,
        created_at=doc.created_at,
    )


async def _owned(document_id: UUID, user) -> UserDocument:
    doc = await UserDocument.get(document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.user_id != user["id"]:
        raise HTTPException(
            status_code=403, detail="This document doesn't belong to this user"
        )
    return doc


@router.post("/document", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def ingest_document(
    request: Request,
    file: UploadFile = File(...),
    document_id: UUID = Form(...),
    user=Depends(verify_token),
):
    existing = await UserDocument.get(document_id)
    if existing is not None:
        if existing.user_id != user["id"]:
            raise HTTPException(status_code=409, detail="Document id already in use")
        return _out(existing)

    stored_name = f"{document_id}.pdf"
    path = document_path(user["id"], stored_name)
    try:
        size = await save_upload(file, path, settings.max_upload_bytes)
    except UploadError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    doc = UserDocument(
        id=document_id,
        original_name=file.filename or stored_name,
        stored_name=stored_name,
        user_id=user["id"],
        status=DOC_STATUS["uploaded"],
        size_bytes=size,
    )
    await doc.insert()

    redis: ArqRedis = request.app.state.redis
    await redis.enqueue_job(
        INGEST_DOCUMENT_JOB, str(document_id), _job_id=_job_id(document_id)
    )

    return _out(doc)


@router.get("/documents", response_model=list[DocumentOut])
async def list_documents(
    chat_id: UUID | None = Query(None),
    user=Depends(verify_token),
):
    query = UserDocument.find(UserDocument.user_id == user["id"])
    if chat_id is not None:
        query = query.find(UserDocument.chat_id == chat_id)
    docs = await query.sort(-UserDocument.created_at).to_list()
    return [_out(d) for d in docs]


@router.get("/document/{document_id}", response_model=DocumentOut)
async def get_document_status(
    document_id: UUID = Path(...),
    user=Depends(verify_token),
):
    return _out(await _owned(document_id, user))


@router.delete("/document/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    request: Request,
    document_id: UUID = Path(...),
    user=Depends(verify_token),
):
    doc = await _owned(document_id, user)

    if doc.status not in DOC_TERMINAL_STATUSES:
        await doc.set({UserDocument.status: DOC_STATUS["cancelled"]})

    redis: ArqRedis = request.app.state.redis
    try:
        await Job(_job_id(document_id), redis).abort(timeout=0.5)
    except Exception:
        pass

    await delete_document_points(
        request.app.state.qdrant, document_id=document_id, user_id=str(doc.user_id)
    )
    await remove_file(document_path(doc.user_id, doc.stored_name))
    await doc.delete()
