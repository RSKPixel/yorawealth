from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_client_pan(self, client_pan: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.client_pan == client_pan.upper())
            .first()
        )

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(
        self,
        email: str,
        exclude_user_id: Optional[int] = None,
    ) -> Optional[User]:
        query = self.db.query(User).filter(User.email == email)
        if exclude_user_id is not None:
            query = query.filter(User.id != exclude_user_id)
        return query.first()

    def save(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user
