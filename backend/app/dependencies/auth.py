from fastapi import HTTPException, status, Header
from app.config import settings
from beanie import PydanticObjectId
import jwt


async def verify_token(authorization: str = Header(None)):
    token = (
        authorization.split(" ", 1)[1]
        if authorization and " " in authorization
        else None
    )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Missing"
        )
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
    # Chat.user_id is an ObjectId; convert so Mongo queries/comparisons match.
    payload["id"] = PydanticObjectId(payload["id"])
    return payload
