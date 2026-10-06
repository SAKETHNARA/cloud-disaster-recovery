# config.py
# Loads secrets from the .env file. Nothing secret is written in the code.

import os
from dotenv import load_dotenv

load_dotenv()  # reads backend/.env


def _clean_url(url: str) -> str:
    """Remove accidental '/rest/v1' or trailing '/' from the Supabase URL."""
    url = url.strip()
    url = url.split("/rest/v1")[0]
    return url.rstrip("/")


def _require(name: str) -> str:
    """Get an environment variable or stop with a clear message."""
    value = os.getenv(name)
    if not value or value.startswith("paste-"):
        raise RuntimeError(
            f"Missing {name}. Open backend/.env and set a real value."
        )
    return value.strip()


# These are NAMES of variables in .env, not the values themselves.
SUPABASE_URL = _clean_url(_require("SUPABASE_URL"))
SUPABASE_ANON_KEY = _require("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = _require("SUPABASE_SERVICE_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")