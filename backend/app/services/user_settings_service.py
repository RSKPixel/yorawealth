from urllib.parse import quote_plus

from sqlalchemy.orm import Session

from app.constants.bank_statement_prompt import (
    DEFAULT_BANK_STATEMENT_NORMALIZATION_PROMPT,
)
from app.core.config import settings
from app.repositories.user_settings_repository import UserSettingsRepository
from app.schemas.user_settings import (
    DatabaseSettingsResponse,
    GeneralSettingsResponse,
    PasswordSettingsResponse,
    UpdateGeneralSettingsRequest,
    UpdatePasswordSettingsRequest,
)


class UserSettingsService:
    def __init__(self, db: Session) -> None:
        self.repository = UserSettingsRepository(db)

    def get_general_settings(self, user_id: int) -> GeneralSettingsResponse:
        record = self.repository.find_by_user_id(user_id)
        prompt = (
            record.bank_statement_normalization_prompt.strip()
            if record and record.bank_statement_normalization_prompt
            else DEFAULT_BANK_STATEMENT_NORMALIZATION_PROMPT
        )
        return GeneralSettingsResponse(
            bank_statement_normalization_prompt=prompt,
        )

    def update_general_settings(
        self,
        user_id: int,
        payload: UpdateGeneralSettingsRequest,
    ) -> GeneralSettingsResponse:
        record = self.repository.update_bank_statement_prompt(
            user_id,
            payload.bank_statement_normalization_prompt.strip(),
        )
        return GeneralSettingsResponse(
            bank_statement_normalization_prompt=record.bank_statement_normalization_prompt,
        )

    def get_password_settings(self, user_id: int) -> PasswordSettingsResponse:
        record = self.repository.find_by_user_id(user_id)
        password = record.cams_pdf_password if record and record.cams_pdf_password else ""
        return PasswordSettingsResponse(cams_pdf_password=password)

    def update_password_settings(
        self,
        user_id: int,
        payload: UpdatePasswordSettingsRequest,
    ) -> PasswordSettingsResponse:
        record = self.repository.update_cams_pdf_password(
            user_id,
            payload.cams_pdf_password.strip(),
        )
        return PasswordSettingsResponse(
            cams_pdf_password=record.cams_pdf_password or "",
        )

    def get_database_settings(self) -> DatabaseSettingsResponse:
        user = quote_plus(settings.db_user)
        connection_string = (
            f"mysql+pymysql://{user}:***"
            f"@{settings.db_host}:{settings.db_port}/{settings.db_name}"
        )
        return DatabaseSettingsResponse(
            connection_string=connection_string,
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            database=settings.db_name,
        )
