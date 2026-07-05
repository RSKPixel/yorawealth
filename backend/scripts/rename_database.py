"""One-time migration: rename MySQL database from wealthjourney to yorawealth."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, text

from app.core.config import settings

OLD_DB_NAME = "wealthjourney"
NEW_DB_NAME = "yorawealth"


def database_url_without_name() -> str:
    from urllib.parse import quote_plus

    user = quote_plus(settings.db_user)
    password = quote_plus(settings.db_password)
    return f"mysql+pymysql://{user}:{password}@{settings.db_host}:{settings.db_port}"


def database_exists(connection, name: str) -> bool:
    result = connection.execute(
        text(
            "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA "
            "WHERE SCHEMA_NAME = :name"
        ),
        {"name": name},
    )
    return result.scalar() is not None


def list_tables(connection, database: str) -> list[str]:
    result = connection.execute(
        text(
            "SELECT TABLE_NAME FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = :database ORDER BY TABLE_NAME"
        ),
        {"database": database},
    )
    return [row[0] for row in result.fetchall()]


def rename_database() -> None:
    engine = create_engine(database_url_without_name(), isolation_level="AUTOCOMMIT")

    with engine.connect() as connection:
        if database_exists(connection, NEW_DB_NAME):
            print(f"Database '{NEW_DB_NAME}' already exists.")
            if not database_exists(connection, OLD_DB_NAME):
                print("Nothing to migrate.")
                return

            old_tables = list_tables(connection, OLD_DB_NAME)
            if not old_tables:
                connection.execute(text(f"DROP DATABASE `{OLD_DB_NAME}`"))
                print(f"Dropped empty legacy database '{OLD_DB_NAME}'.")
                return

            print(
                f"Both '{OLD_DB_NAME}' and '{NEW_DB_NAME}' exist. "
                "Move tables manually or drop the legacy database first."
            )
            return

        if not database_exists(connection, OLD_DB_NAME):
            connection.execute(
                text(
                    f"CREATE DATABASE `{NEW_DB_NAME}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            print(f"Created new database '{NEW_DB_NAME}'.")
            return

        tables = list_tables(connection, OLD_DB_NAME)
        if not tables:
            connection.execute(
                text(
                    f"CREATE DATABASE `{NEW_DB_NAME}` "
                    "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                )
            )
            connection.execute(text(f"DROP DATABASE `{OLD_DB_NAME}`"))
            print(f"Migrated empty database to '{NEW_DB_NAME}'.")
            return

        connection.execute(
            text(
                f"CREATE DATABASE `{NEW_DB_NAME}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )

        for table in tables:
            connection.execute(
                text(f"RENAME TABLE `{OLD_DB_NAME}`.`{table}` TO `{NEW_DB_NAME}`.`{table}`")
            )
            print(f"Moved table '{table}'.")

        connection.execute(text(f"DROP DATABASE `{OLD_DB_NAME}`"))
        print(f"Renamed database '{OLD_DB_NAME}' -> '{NEW_DB_NAME}'.")


if __name__ == "__main__":
    rename_database()
