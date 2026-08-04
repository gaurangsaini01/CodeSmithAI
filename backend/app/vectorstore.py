from uuid import NAMESPACE_URL, UUID, uuid5

from langchain_openai import OpenAIEmbeddings
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchAny,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    VectorParams,
)

from app.config import settings

COLLECTION = settings.qdrant_documents_collection


def get_qdrant() -> AsyncQdrantClient:
    return AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)


def get_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(model=settings.embedding_model)


async def ensure_collection(client: AsyncQdrantClient) -> None:
    if not await client.collection_exists(COLLECTION):
        await client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(
                size=settings.embedding_dim, distance=Distance.COSINE
            ),
        )

    # Without payload indexes the user_id/document_id filters degrade to a scan.
    for field in ("user_id", "document_id", "chat_id"):
        try:
            await client.create_payload_index(
                collection_name=COLLECTION,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD,
            )
        except Exception:
            pass


def _point_id(document_id: UUID, chunk_index: int) -> str:
    return str(uuid5(NAMESPACE_URL, f"{document_id}:{chunk_index}"))


async def upsert_chunks(
    client: AsyncQdrantClient,
    *,
    document_id: UUID,
    user_id: str,
    vectors: list[list[float]],
    chunks: list[tuple[int, str]],
) -> None:
    """`chunks` is [(page_number, text), ...] aligned with `vectors`."""
    points = []
    for index in range(len(vectors)):
        vector = vectors[index]
        chunk = chunks[index]
        page = chunk[0]
        text = chunk[1]
        new_point = PointStruct(
            id=_point_id(document_id, index),
            vector=vector,
            payload={
                "document_id": str(document_id),
                "user_id": user_id,
                "page": page,
                "chunk_index": index,
                "text": text,
            },
        )
        points.append(new_point)

    for start in range(0, len(points), 128):
        await client.upsert(
            collection_name=COLLECTION, points=points[start : start + 128]
        )


async def search_chunks(
    client: AsyncQdrantClient,
    *,
    query_vector: list[float],
    user_id: str,
    document_ids: list[UUID],
    limit: int,
) -> list[dict]:
    if not document_ids:
        return []
    query_filter = Filter(
        must=[
            FieldCondition(key="user_id", match=MatchValue(value=user_id)),
            FieldCondition(
                key="document_id",
                match=MatchAny(any=[str(d) for d in document_ids]),
            ),
        ]
    )

    response = await client.query_points(
        collection_name=COLLECTION,
        query=query_vector,
        query_filter=query_filter,
        limit=limit,
        with_payload=True,
    )
    return [point.payload for point in response.points if point.payload]


async def delete_document_points(
    client: AsyncQdrantClient, *, document_id: UUID, user_id: str
) -> None:
    await client.delete(
        collection_name=COLLECTION,
        points_selector=Filter(
            must=[
                FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                FieldCondition(
                    key="document_id", match=MatchValue(value=str(document_id))
                ),
            ]
        ),
    )
