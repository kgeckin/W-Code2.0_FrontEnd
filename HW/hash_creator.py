"""Generate a password hash locally without embedding credentials in source."""

from __future__ import annotations

from getpass import getpass

from werkzeug.security import generate_password_hash


def main() -> None:
    password = getpass("New local admin password: ")
    confirm = getpass("Confirm password: ")
    if len(password) < 12 or password != confirm:
        raise SystemExit("Passwords must match and contain at least 12 characters.")
    print(generate_password_hash(password))
    print("Copy only the resulting hash into the ignored .env file.")


if __name__ == "__main__":
    main()
