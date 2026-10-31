# Inventory Portal architecture

This is a Flask web application created as coursework, not a production
infrastructure management system.

## Components

| Path | Responsibility |
| --- | --- |
| `app.py` | Authentication, server routes, asset API and local persistence |
| `templates/` | Flask server rendered HTML pages |
| `static/` | Browser JavaScript, CSS and images |
| `data/` | Synthetic example inventory and user records |
| `screenshots/` | Recorded demonstration UI |
| `.env.example` | Documented, nonsecret local configuration |

## Data flow

```text
Browser UI
   |
Flask routes / role checks
   |
Local JSON files (demo only)
   |
Dashboard, inventory and notifications
```

The inventory UI makes authenticated requests to the Flask backend.
Local JSON documents are read and rewritten during user and inventory
operations. This keeps the educational example approachable but does not
provide transactional updates or concurrency safety.

## Important decisions

* Flask hosts the pages and application API.
* Passwords are checked against configured Werkzeug hashes.
* Authentication uses signed browser sessions.
* Data is intentionally stored in synthetic local JSON fixtures.
* The project has import/export functionality for CSV and Excel.
* Account registration, development reset token display and Flask debug
  mode are disabled by default.

## Development direction

For a fuller infrastructure application, introduce an actual database,
consistent authorization policies, CSRF validation, schema migrations,
audit logging, isolated test fixtures and API integration tests.
