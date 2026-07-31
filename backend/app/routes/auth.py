from fastapi import APIRouter
from fastapi import (
    HTTPException,
    status,
)

from app.config import settings
from app.schemas import SignupBody, LoginBody
from app.models import User
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt

router = APIRouter()


@router.post("/signup")
async def signup(body: SignupBody):
    email_exist = await User.find_one(User.email == body.email)
    if email_exist:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists , Please Login",
        )
    pw = body.password.encode("utf-8")[:72]  # bcrypt 72-byte limit
    hashed_pw = bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")
    user = await User(name=body.name, email=body.email, password=hashed_pw).insert()
    user_dict = user.model_dump(mode="json")
    del user_dict["password"]
    return user_dict


@router.post("/login")
async def login(body: LoginBody):
    user = await User.find_one(User.email == body.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User Doesn't exists , Please Signup",
        )
    pw = body.password.encode("utf-8")[:72]
    is_pw_correct = bcrypt.checkpw(pw, user.password.encode("utf-8"))
    if not is_pw_correct:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Password",
        )
    token = jwt.encode(
        {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        settings.secret_key,
        settings.algorithm,
    )
    return {"id": str(user.id), "name": user.name, "email": user.email, "token": token}
