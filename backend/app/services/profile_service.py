import base64

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserResponse
from app.schemas.profile import ChangePasswordRequest, UpdateProfileRequest

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


class ProfileService:
    def __init__(self, db: Session) -> None:
        self.user_repository = UserRepository(db)

    def update_profile(
        self,
        user_id: int,
        payload: UpdateProfileRequest,
    ) -> UserResponse:
        user = self.user_repository.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if payload.email:
            existing = self.user_repository.get_by_email(
                payload.email,
                exclude_user_id=user.id,
            )
            if existing is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email is already in use.",
                )

        user.name = payload.name
        user.email = payload.email
        user.phone = payload.phone
        user.zerodha_client_id = payload.zerodha_client_id

        updated_user = self.user_repository.save(user)
        return UserResponse.model_validate(updated_user)

    def change_password(
        self,
        user_id: int,
        payload: ChangePasswordRequest,
    ) -> UserResponse:
        user = self.user_repository.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if not verify_password(payload.current_password, user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect.",
            )

        user.password = hash_password(payload.new_password)
        updated_user = self.user_repository.save(user)
        return UserResponse.model_validate(updated_user)

    async def upload_profile_photo(
        self,
        user_id: int,
        file: UploadFile,
    ) -> UserResponse:
        user = self.user_repository.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        content_type = file.content_type or ""
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please select a JPG, PNG, WEBP, or GIF image.",
            )

        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected file is empty.",
            )

        if len(contents) > settings.profile_photo_max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image must be 1 MB or smaller.",
            )

        encoded = base64.b64encode(contents).decode("ascii")
        user.profile_pic = f"data:{content_type};base64,{encoded}"
        updated_user = self.user_repository.save(user)
        return UserResponse.model_validate(updated_user)
