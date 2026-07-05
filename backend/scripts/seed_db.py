import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import bcrypt
from sqlalchemy import create_engine, text

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User


def create_database() -> None:
    from urllib.parse import quote_plus

    user = quote_plus(settings.db_user)
    password = quote_plus(settings.db_password)
    url = (
        f"mysql+pymysql://{user}:{password}"
        f"@{settings.db_host}:{settings.db_port}"
    )
    engine = create_engine(url, isolation_level="AUTOCOMMIT")
    with engine.connect() as connection:
        connection.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{settings.db_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def seed_test_user() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.client_pan == "ABCDE1234F").first()
        if existing:
            print("Test user already exists.")
            return

        test_user = User(
            client_pan="ABCDE1234F",
            name="Test User",
            password=hash_password("Test@123"),
            email="test@yorawealth.com",
            phone="9876543210",
            profile_pic=None,
        )
        db.add(test_user)
        db.commit()
        print("Test user created.")
    finally:
        db.close()


if __name__ == "__main__":
    create_database()
    seed_test_user()
    print(f"Database '{settings.db_name}' is ready.")
