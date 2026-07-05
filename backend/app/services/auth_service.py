from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, UserResponse


@dataclass
class LoginResult:
    access_token: str
    user: UserResponse


class AuthService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)

    def login(self, payload: LoginRequest) -> LoginResult:
        user = self.user_repository.get_by_client_pan(payload.client_pan)

        if user is None or not verify_password(payload.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Client PAN or password",
            )

        access_token = create_access_token({"sub": str(user.id)})

        return LoginResult(
            access_token=access_token,
            user=UserResponse.model_validate(user),
        )
