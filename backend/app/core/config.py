from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "YORA Wealth API"
    debug: bool = False

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = ""
    db_name: str = "yorawealth"

    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    access_token_cookie_name: str = "access_token"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    # Comma-separated frontend origins allowed for credentialed CORS.
    # Example: http://localhost:5174,https://app.example.com
    cors_origins: str = "http://localhost:5174"

    upload_dir: str = "uploads"
    profile_photo_max_bytes: int = 1 * 1024 * 1024
    cams_pdf_max_bytes: int = 10 * 1024 * 1024
    bank_statement_max_bytes: int = 10 * 1024 * 1024

    @property
    def database_url(self) -> str:
        user = quote_plus(self.db_user)
        password = quote_plus(self.db_password)
        return (
            f"mysql+pymysql://{user}:{password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]
        return origins or ["http://localhost:5174"]


settings = Settings()
