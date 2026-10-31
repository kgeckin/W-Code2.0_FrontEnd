"""Smoke tests for the educational portal's basic access boundaries."""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Prevent secret creation in a source checkout during test import.
os.environ.setdefault("SECRET_KEY", "local-unit-test-secret-not-for-deployment")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app


def test_login_page_is_available():
    app.config["TESTING"] = True
    with app.test_client() as client:
        assert client.get("/login").status_code == 200


def test_inventory_requires_authentication():
    app.config["TESTING"] = True
    with app.test_client() as client:
        assert client.get("/api/inventory").status_code == 401
        assert client.get("/dashboard").status_code == 401


def test_admin_requires_authentication():
    app.config["TESTING"] = True
    with app.test_client() as client:
        assert client.get("/admin").status_code == 401


def test_session_cookie_settings():
    assert app.config["SESSION_COOKIE_HTTPONLY"] is True
    assert app.config["SESSION_COOKIE_SAMESITE"] == "Lax"


def test_local_example_disables_risky_features():
    example = Path(__file__).resolve().parents[1] / ".env.example"
    lines = example.read_text(encoding="utf-8").splitlines()
    config = dict(
        line.split("=", 1)
        for line in lines
        if line and not line.startswith("#") and "=" in line
    )
    assert config["REGISTER_OPEN"] == "false"
    assert config["RESET_DEV_SHOW_TOKEN"] == "false"
    assert config["FLASK_DEBUG"] == "false"
