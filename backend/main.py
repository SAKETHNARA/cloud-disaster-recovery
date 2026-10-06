# main.py
# FastAPI backend for the Cloud-Based Disaster Recovery Management System.

from datetime import datetime, timezone
from pathlib import Path, PurePath
from typing import List

from fastapi import (
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    allow_origins=[
        FRONTEND_URL,
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# PROJECT PATHS
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DEMO_FOLDER = PROJECT_ROOT / "demo_files"
RESTORED_FOLDER = PROJECT_ROOT / "restored_files"


# ---------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------

MAX_FILE_SIZE = 5 * 1024 * 1024
BUCKET = "backups"


# ---------------------------------------------------------
# BASIC ROUTES
# ---------------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Cloud DR backend is running"
    }


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------

@app.get("/api/health")
def health_check():

    result = {
        "backend": "online",
        "cloud_storage": "unknown",
        "database": "unknown",
        "checked_at": datetime.now(
            timezone.utc
        ).isoformat(),
    }

    try:
        buckets = supabase.storage.list_buckets()

        result["cloud_storage"] = "online"
        result["buckets"] = [
            bucket.name
            for bucket in buckets
        ]

    except Exception as error:
        result["cloud_storage"] = "offline"
        result["storage_error"] = str(error)

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
# AUTHENTICATION
# ---------------------------------------------------------

def get_authenticated_user(
    authorization: str | None
):

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

    token = authorization.split(
        " ",
        1
    )[1].strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Access token is missing.",
        )

    try:

        response = supabase.auth.get_user(token)

        if (
            not response
            or not response.user
        ):
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
# CREATE BACKUP
# ---------------------------------------------------------

@app.post("/api/backups")
async def create_backup(
    files: List[UploadFile] = File(...),
    backup_name: str = Form("Manual Backup"),
    authorization: str | None = Header(default=None),
):

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

        for upload_file in files:

            if not upload_file.filename:
                raise HTTPException(
                    status_code=400,
                    detail="One of the selected files has no filename.",
                )

            safe_filename = PurePath(
                upload_file.filename
            ).name

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

            storage_path = (
                f"{user_id}/{backup_id}/{safe_filename}"
            )

            supabase.storage.from_(BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={
                    "content-type": (
                        upload_file.content_type
                        or "application/octet-stream"
                    ),
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

        if backup_file_records:
            supabase.table(
                "backup_files"
            ).insert(
                backup_file_records
            ).execute()

        completed_at = datetime.now(
            timezone.utc
        ).isoformat()

        (
            supabase
            .table("backups")
            .update(
                {
                    "status": "success",
                    "total_files": len(
                        backup_file_records
                    ),
                    "total_size_bytes": total_size,
                    "completed_at": completed_at,
                }
            )
            .eq("id", backup_id)
            .eq("user_id", user_id)
            .execute()
        )

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

        if uploaded_paths:
            try:
                supabase.storage.from_(
                    BUCKET
                ).remove(uploaded_paths)
            except Exception:
                pass

        (
            supabase
            .table("backups")
            .update(
                {
                    "status": "failed",
                    "completed_at": datetime.now(
                        timezone.utc
                    ).isoformat(),
                }
            )
            .eq("id", backup_id)
            .eq("user_id", user_id)
            .execute()
        )

        raise

    except Exception as error:

        if uploaded_paths:
            try:
                supabase.storage.from_(
                    BUCKET
                ).remove(uploaded_paths)
            except Exception:
                pass

        (
            supabase
            .table("backups")
            .update(
                {
                    "status": "failed",
                    "completed_at": datetime.now(
                        timezone.utc
                    ).isoformat(),
                }
            )
            .eq("id", backup_id)
            .eq("user_id", user_id)
            .execute()
        )

        raise HTTPException(
            status_code=500,
            detail=f"Backup failed: {str(error)}",
        )


# ---------------------------------------------------------
# BACKUP HISTORY
# ---------------------------------------------------------

@app.get("/api/backups")
def get_backup_history(
    authorization: str | None = Header(default=None),
):

    user = get_authenticated_user(authorization)
    user_id = str(user.id)

    try:

        backup_response = (
            supabase
            .table("backups")
            .select(
                "id,"
                "backup_name,"
                "status,"
                "total_files,"
                "total_size_bytes,"
                "created_at,"
                "completed_at"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        backups = backup_response.data or []

        if backups:

            backup_ids = [
                backup["id"]
                for backup in backups
            ]

            files_response = (
                supabase
                .table("backup_files")
                .select(
                    "backup_id,"
                    "file_name,"
                    "storage_path,"
                    "file_size_bytes,"
                    "file_type"
                )
                .eq("user_id", user_id)
                .in_("backup_id", backup_ids)
                .order("created_at", desc=False)
                .execute()
            )

            files = files_response.data or []

            files_by_backup = {}

            for file in files:

                backup_id = file["backup_id"]

                if backup_id not in files_by_backup:
                    files_by_backup[backup_id] = []

                files_by_backup[
                    backup_id
                ].append(file)

        else:
            files_by_backup = {}

        for backup in backups:
            backup["files"] = files_by_backup.get(
                backup["id"],
                []
            )

        return {
            "count": len(backups),
            "backups": backups,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Could not load backup history: {str(error)}",
        )


# ---------------------------------------------------------
# DEMO FILES
# ---------------------------------------------------------

@app.get("/api/disaster/files")
def get_demo_files(
    authorization: str | None = Header(default=None),
):

    get_authenticated_user(authorization)

    DEMO_FOLDER.mkdir(
        parents=True,
        exist_ok=True
    )

    files = []

    for path in DEMO_FOLDER.iterdir():

        if path.is_file():

            files.append(
                {
                    "name": path.name,
                    "size": path.stat().st_size,
                }
            )

    return {
        "folder": "demo_files",
        "file_count": len(files),
        "files": files,
    }


# ---------------------------------------------------------
# LATEST DISASTER
# ---------------------------------------------------------

@app.get("/api/disaster/latest")
def get_latest_disaster(
    authorization: str | None = Header(default=None),
):

    user = get_authenticated_user(authorization)
    user_id = str(user.id)

    try:

        response = (
            supabase
            .table("disaster_events")
            .select(
                "id,"
                "disaster_type,"
                "files_affected,"
                "occurred_at,"
                "status"
            )
            .eq("user_id", user_id)
            .order("occurred_at", desc=True)
            .limit(1)
            .execute()
        )

        if not response.data:

            return {
                "active": False,
                "disaster": None,
            }

        disaster = response.data[0]

        return {
            "active": (
                disaster["status"] == "active"
            ),
            "disaster": disaster,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not load disaster "
                f"information: {str(error)}"
            ),
        )


# ---------------------------------------------------------
# DISASTER SIMULATION
# ---------------------------------------------------------

@app.post("/api/disaster/simulate")
def simulate_disaster(
    authorization: str | None = Header(default=None),
):

    user = get_authenticated_user(authorization)
    user_id = str(user.id)

    DEMO_FOLDER.mkdir(
        parents=True,
        exist_ok=True
    )

    demo_files = [
        path
        for path in DEMO_FOLDER.iterdir()
        if path.is_file()
    ]

    if not demo_files:

        raise HTTPException(
            status_code=400,
            detail=(
                "No files are available in "
                "the demo_files folder. "
                "Add a demo file before "
                "simulating a disaster."
            ),
        )

    deleted_files = []

    try:

        for path in demo_files:

            path.unlink()
            deleted_files.append(path.name)

        disaster_response = (
            supabase
            .table("disaster_events")
            .insert(
                {
                    "user_id": user_id,
                    "disaster_type": "accidental_deletion",
                    "files_affected": len(
                        deleted_files
                    ),
                    "occurred_at": datetime.now(
                        timezone.utc
                    ).isoformat(),
                    "status": "active",
                }
            )
            .execute()
        )

        if not disaster_response.data:
            raise Exception(
                "Disaster event was not recorded."
            )

        disaster = disaster_response.data[0]

        return {
            "message": "Disaster simulation completed.",
            "disaster_id": disaster["id"],
            "disaster_type": disaster["disaster_type"],
            "files_affected": len(deleted_files),
            "deleted_files": deleted_files,
            "status": disaster["status"],
            "occurred_at": disaster["occurred_at"],
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Disaster simulation failed: "
                f"{str(error)}"
            ),
        )


# ---------------------------------------------------------
# RESTORE
# ---------------------------------------------------------

class RestoreRequest(BaseModel):
    backup_id: str


@app.post("/api/restore")
def restore_backup(
    request: RestoreRequest,
    authorization: str | None = Header(default=None),
):

    user = get_authenticated_user(authorization)
    user_id = str(user.id)

    disaster_response = (
        supabase
        .table("disaster_events")
        .select(
            "id,"
            "disaster_type,"
            "files_affected,"
            "occurred_at,"
            "status"
        )
        .eq("user_id", user_id)
        .eq("status", "active")
        .order("occurred_at", desc=True)
        .limit(1)
        .execute()
    )

    if not disaster_response.data:
        raise HTTPException(
            status_code=400,
            detail="There is no active disaster to recover.",
        )

    disaster = disaster_response.data[0]

    backup_response = (
        supabase
        .table("backups")
        .select(
            "id,"
            "backup_name,"
            "status,"
            "total_files,"
            "total_size_bytes,"
            "created_at,"
            "completed_at"
        )
        .eq("id", request.backup_id)
        .eq("user_id", user_id)
        .eq("status", "success")
        .limit(1)
        .execute()
    )

    if not backup_response.data:
        raise HTTPException(
            status_code=404,
            detail="Successful backup not found for this user.",
        )

    backup = backup_response.data[0]

    backup_time = datetime.fromisoformat(
        backup["created_at"].replace(
            "Z",
            "+00:00"
        )
    )

    disaster_time = datetime.fromisoformat(
        disaster["occurred_at"].replace(
            "Z",
            "+00:00"
        )
    )

    if backup_time > disaster_time:
        raise HTTPException(
            status_code=400,
            detail=(
                "This backup was created after the disaster. "
                "Choose a backup created before the disaster."
            ),
        )

    files_response = (
        supabase
        .table("backup_files")
        .select(
            "id,"
            "file_name,"
            "storage_path,"
            "file_size_bytes,"
            "file_type"
        )
        .eq("backup_id", request.backup_id)
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )

    backup_files = files_response.data or []

    if not backup_files:
        raise HTTPException(
            status_code=400,
            detail="The selected backup contains no files.",
        )

    RESTORED_FOLDER.mkdir(
        parents=True,
        exist_ok=True
    )

    recovery_started_at = datetime.now(
        timezone.utc
    )

    recovered_files = []
    failed_files = []

    for file_record in backup_files:

        file_name = PurePath(
            file_record["file_name"]
        ).name

        try:

            downloaded = (
                supabase
                .storage
                .from_(BUCKET)
                .download(
                    file_record["storage_path"]
                )
            )

            destination = (
                RESTORED_FOLDER
                / file_name
            )

            destination.write_bytes(downloaded)

            recovered_files.append(
                {
                    "file_name": file_name,
                    "size": len(downloaded),
                    "local_path": str(destination),
                }
            )

        except Exception:
            failed_files.append(file_name)

    recovery_completed_at = datetime.now(
        timezone.utc
    )

    rpo_seconds = max(
        0,
        int(
            (
                disaster_time
                - backup_time
            ).total_seconds()
        )
    )

    rto_seconds = round(
        (
            recovery_completed_at
            - recovery_started_at
        ).total_seconds(),
        2
    )

    if not failed_files:
        recovery_status = "success"
    elif recovered_files:
        recovery_status = "partial"
    else:
        recovery_status = "failed"

    recovery_response = (
        supabase
        .table("recovery_logs")
        .insert(
            {
                "user_id": user_id,
                "disaster_id": disaster["id"],
                "backup_id": backup["id"],
                "files_recovered": len(
                    recovered_files
                ),
                "files_failed": len(
                    failed_files
                ),
                "backup_time": backup["created_at"],
                "disaster_time": disaster["occurred_at"],
                "recovery_started_at": (
                    recovery_started_at.isoformat()
                ),
                "recovery_completed_at": (
                    recovery_completed_at.isoformat()
                ),
                "rpo_seconds": rpo_seconds,
                "rto_seconds": rto_seconds,
                "status": recovery_status,
            }
        )
        .execute()
    )

    if not recovery_response.data:
        raise HTTPException(
            status_code=500,
            detail="Recovery completed, but the recovery log could not be created.",
        )

    if recovery_status == "success":

        (
            supabase
            .table("disaster_events")
            .update(
                {
                    "status": "recovered"
                }
            )
            .eq(
                "id",
                disaster["id"]
            )
            .eq(
                "user_id",
                user_id
            )
            .execute()
        )

    return {
        "message": "Data restoration completed.",
        "backup_id": backup["id"],
        "backup_name": backup["backup_name"],
        "disaster_id": disaster["id"],
        "files_recovered": len(recovered_files),
        "files_failed": len(failed_files),
        "status": recovery_status,
        "rpo_seconds": rpo_seconds,
        "rto_seconds": rto_seconds,
        "recovered_files": recovered_files,
        "failed_files": failed_files,
        "restored_folder": str(RESTORED_FOLDER),
    }


# ---------------------------------------------------------
# RECOVERY HISTORY
# ---------------------------------------------------------

@app.get("/api/recovery-history")
def get_recovery_history(
    authorization: str | None = Header(default=None),
):

    user = get_authenticated_user(authorization)
    user_id = str(user.id)

    try:

        logs_response = (
            supabase
            .table("recovery_logs")
            .select(
                "id,"
                "disaster_id,"
                "backup_id,"
                "files_recovered,"
                "files_failed,"
                "backup_time,"
                "disaster_time,"
                "recovery_started_at,"
                "recovery_completed_at,"
                "rpo_seconds,"
                "rto_seconds,"
                "status"
            )
            .eq("user_id", user_id)
            .order(
                "recovery_started_at",
                desc=True
            )
            .execute()
        )

        logs = logs_response.data or []

        if not logs:

            return {
                "count": 0,
                "recovery_history": [],
            }

        backup_ids = list(
            {
                log["backup_id"]
                for log in logs
                if log.get("backup_id")
            }
        )

        disaster_ids = list(
            {
                log["disaster_id"]
                for log in logs
                if log.get("disaster_id")
            }
        )

        backups = {}
        disasters = {}

        if backup_ids:

            backup_response = (
                supabase
                .table("backups")
                .select(
                    "id,"
                    "backup_name,"
                    "total_files,"
                    "total_size_bytes"
                )
                .eq("user_id", user_id)
                .in_("id", backup_ids)
                .execute()
            )

            for backup in (
                backup_response.data or []
            ):
                backups[backup["id"]] = backup

        if disaster_ids:

            disaster_response = (
                supabase
                .table("disaster_events")
                .select(
                    "id,"
                    "disaster_type,"
                    "files_affected"
                )
                .eq("user_id", user_id)
                .in_("id", disaster_ids)
                .execute()
            )

            for disaster in (
                disaster_response.data or []
            ):
                disasters[
                    disaster["id"]
                ] = disaster

        for log in logs:

            backup = backups.get(
                log.get("backup_id")
            )

            disaster = disasters.get(
                log.get("disaster_id")
            )

            log["backup_name"] = (
                backup["backup_name"]
                if backup
                else "Unknown Backup"
            )

            log["disaster_type"] = (
                disaster["disaster_type"]
                if disaster
                else "Unknown Disaster"
            )

            log["disaster_files_affected"] = (
                disaster["files_affected"]
                if disaster
                else 0
            )

        return {
            "count": len(logs),
            "recovery_history": logs,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not load recovery history: "
                f"{str(error)}"
            ),
        )