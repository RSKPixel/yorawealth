from sqlalchemy.orm import Session

from app.constants.bank_statement_prompt import (
    DEFAULT_BANK_STATEMENT_NORMALIZATION_PROMPT,
)
from app.repositories.user_settings_repository import UserSettingsRepository
from app.schemas.user_settings import (
    GeneralSettingsResponse,
    UpdateGeneralSettingsRequest,
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
