# main.py
# Entry point of the FastAPI backend.

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_URL
from supabase_client import supabase

app = FastAPI(
    title="Cloud-Based Disaster Recovery Management System",
    description="Backend API for backup, disaster simulation and recovery.",
    version="1.0.0",
)

# CORS: allows ONLY our React app to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    """Simple welcome route to confirm the server is running."""
    return {"message": "Cloud DR backend is running"}


@app.get("/api/health")
def health_check():
    """
    Checks that the backend is up AND that it can reach
    Supabase cloud storage and the cloud database.
    """
    result = {
        "backend": "online",
        "cloud_storage": "unknown",
        "database": "unknown",
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }

    # Real call to cloud storage: list the buckets in the project.
    try:
        buckets = supabase.storage.list_buckets()
        result["cloud_storage"] = "online"
        result["buckets"] = [b.name for b in buckets]
    except Exception as error:
        result["cloud_storage"] = "offline"
        result["storage_error"] = str(error)

    # Real call to the cloud database: count rows in the backups table.
    try:
        response = supabase.table("backups").select("id", count="exact").limit(1).execute()
        result["database"] = "online"
        result["backups_count"] = response.count
    except Exception as error:
        result["database"] = "offline"
        result["database_error"] = str(error)

    return result