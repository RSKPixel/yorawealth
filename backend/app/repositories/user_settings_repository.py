from typing import Optional

from sqlalchemy.orm import Session

from app.models.user_settings import UserSettings


class UserSettingsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_by_user_id(self, user_id: int) -> Optional[UserSettings]:
        return (
            self.db.query(UserSettings)
            .filter(UserSettings.user_id == user_id)
            .first()
        )

    def get_or_create(self, user_id: int) -> UserSettings:
        record = self.find_by_user_id(user_id)
        if record is None:
            record = UserSettings(user_id=user_id)
            self.db.add(record)
            self.db.commit()
            self.db.refresh(record)
        return record

    def update_bank_statement_prompt(
        self,
        user_id: int,
        prompt: str,
    ) -> UserSettings:
        record = self.get_or_create(user_id)
        record.bank_statement_normalization_prompt = prompt
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_cams_pdf_password(self, user_id: int) -> Optional[str]:
        record = self.find_by_user_id(user_id)
        if not record or not record.cams_pdf_password:
            return None
        password = record.cams_pdf_password.strip()
        return password or None

    def update_cams_pdf_password(self, user_id: int, password: str) -> UserSettings:
        record = self.get_or_create(user_id)
        record.cams_pdf_password = password
        self.db.commit()
        self.db.refresh(record)
        return record
