# main.py
# FastAPI backend for the Cloud-Based Disaster Recovery Management System.

from datetime import datetime, timezone
from pathlib import PurePath
from typing import List

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_URL
from supabase_client import supabase


app = FastAPI(
    title="Cloud-Based Disaster Recovery Management System",
    description="Backend API for backup, disaster simulation and recovery.",
    version="1.0.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# BASIC ROUTES
# ---------------------------------------------------------

@app.get("/")
def home():
    return {"message": "Cloud DR backend is running"}


@app.get("/api/health")
def health_check():
    result = {
        "backend": "online",
        "cloud_storage": "unknown",
        "database": "unknown",
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }

    # Check Supabase Storage
    try:
        buckets = supabase.storage.list_buckets()

        result["cloud_storage"] = "online"
        result["buckets"] = [b.name for b in buckets]

    except Exception as error:
        result["cloud_storage"] = "offline"
        result["storage_error"] = str(error)

    # Check Supabase Database
    try:
        response = (
            supabase
            .table("backups")
            .select("id", count="exact")
            .limit(1)
            .execute()
        )

        result["database"] = "online"
        result["backups_count"] = response.count

    except Exception as error:
        result["database"] = "offline"
        result["database_error"] = str(error)

    return result


# ---------------------------------------------------------
# AUTHENTICATION HELPER
# ---------------------------------------------------------

def get_authenticated_user(authorization: str | None):
    """
    Reads the Supabase access token from:
    Authorization: Bearer <token>

    The frontend sends this token after login.
    """

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required.",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format.",
        )

    token = authorization.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Access token is missing.",
        )

    try:
        response = supabase.auth.get_user(token)

        if not response or not response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired access token.",
            )

        return response.user

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token.",
        )


# ---------------------------------------------------------
# BACKUP FILES API
# ---------------------------------------------------------

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
BUCKET = "backups"


@app.post("/api/backups")
async def create_backup(
    files: List[UploadFile] = File(...),
    backup_name: str = Form("Manual Backup"),
    authorization: str | None = Header(default=None),
):
    """
    Creates a backup for the currently authenticated user.

    1. Authenticate user
    2. Create backup record
    3. Upload files to Supabase Storage
    4. Create backup_files records
    5. Mark backup as success
    """

    user = get_authenticated_user(authorization)
    user_id = str(user.id)

    if not files:
        raise HTTPException(
            status_code=400,
            detail="At least one file is required.",
        )

    backup_name = backup_name.strip()

    if not backup_name:
        backup_name = "Manual Backup"

    # -----------------------------------------------------
    # Create initial backup database record
    # -----------------------------------------------------

    backup_response = (
        supabase
        .table("backups")
        .insert(
            {
                "user_id": user_id,
                "backup_name": backup_name,
                "status": "in_progress",
                "total_files": 0,
                "total_size_bytes": 0,
            }
        )
        .execute()
    )

    if not backup_response.data:
        raise HTTPException(
            status_code=500,
            detail="Could not create backup record.",
        )

    backup = backup_response.data[0]
    backup_id = backup["id"]

    uploaded_paths = []
    backup_file_records = []

    total_size = 0

    try:
        # -------------------------------------------------
        # Upload every file
        # -------------------------------------------------

        for upload_file in files:

            if not upload_file.filename:
                raise HTTPException(
                    status_code=400,
                    detail="One of the selected files has no filename.",
                )

            # Prevent path traversal and use only the actual filename.
            safe_filename = PurePath(upload_file.filename).name

            if not safe_filename:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid filename.",
                )

            content = await upload_file.read()

            file_size = len(content)

            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"{safe_filename} is larger than 5 MB.",
                )

            storage_path = f"{user_id}/{backup_id}/{safe_filename}"

            # Upload to Supabase Storage
            supabase.storage.from_(BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={
                    "content-type": upload_file.content_type
                    or "application/octet-stream",
                    "upsert": "false",
                },
            )

            uploaded_paths.append(storage_path)

            backup_file_records.append(
                {
                    "backup_id": backup_id,
                    "user_id": user_id,
                    "file_name": safe_filename,
                    "storage_path": storage_path,
                    "file_size_bytes": file_size,
                    "file_type": upload_file.content_type,
                }
            )

            total_size += file_size

        # -------------------------------------------------
        # Save file records
        # -------------------------------------------------

        if backup_file_records:
            supabase.table("backup_files").insert(
                backup_file_records
            ).execute()

        # -------------------------------------------------
        # Mark backup as successful
        # -------------------------------------------------

        completed_at = datetime.now(timezone.utc).isoformat()

        supabase.table("backups").update(
            {
                "status": "success",
                "total_files": len(backup_file_records),
                "total_size_bytes": total_size,
                "completed_at": completed_at,
            }
        ).eq("id", backup_id).eq("user_id", user_id).execute()

        return {
            "message": "Backup completed successfully.",
            "backup_id": backup_id,
            "backup_name": backup_name,
            "total_files": len(backup_file_records),
            "total_size_bytes": total_size,
            "files": [
                {
                    "file_name": record["file_name"],
                    "storage_path": record["storage_path"],
                    "file_size_bytes": record["file_size_bytes"],
                }
                for record in backup_file_records
            ],
        }

    except HTTPException:

        # Clean up uploaded files
        if uploaded_paths:
            try:
                supabase.storage.from_(BUCKET).remove(uploaded_paths)
            except Exception:
                pass

        supabase.table("backups").update(
            {
                "status": "failed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", backup_id).eq("user_id", user_id).execute()

        raise

    except Exception as error:

        # Clean up uploaded files
        if uploaded_paths:
            try:
                supabase.storage.from_(BUCKET).remove(uploaded_paths)
            except Exception:
                pass

        supabase.table("backups").update(
            {
                "status": "failed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", backup_id).eq("user_id", user_id).execute()

        raise HTTPException(
            status_code=500,
            detail=f"Backup failed: {str(error)}",
        )