"""
Dataset routes — upload, list, delete datasets
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
import uuid
import os
import shutil
from datetime import datetime, timezone

from auth import get_current_user
from database import get_db, dict_row
from config import DATASET_STORAGE_PATH

router = APIRouter()


@router.post("/datasets/{project_id}/upload")
async def upload_dataset(
    project_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """Upload a dataset file for a project."""
    # Verify project ownership
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")

        dataset_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        # Create project dataset directory
        project_dir = os.path.join(DATASET_STORAGE_PATH, project_id)
        os.makedirs(project_dir, exist_ok=True)

        # Save file to disk
        file_path = os.path.join(project_dir, f"{dataset_id}_{file.filename}")
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        file_size = os.path.getsize(file_path)
        file_type = "csv" if file.filename.endswith(".csv") else "image" if file.content_type and file.content_type.startswith("image/") else "other"

        conn.execute(
            """INSERT INTO datasets (id, project_id, user_id, file_name, file_path, file_size, file_type, uploaded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (dataset_id, project_id, user_id, file.filename, file_path, file_size, file_type, now),
        )
        conn.commit()

        return {
            "id": dataset_id,
            "project_id": project_id,
            "file_name": file.filename,
            "file_size": file_size,
            "file_type": file_type,
            "uploaded_at": now,
        }
    finally:
        conn.close()


@router.get("/datasets/{project_id}")
async def list_datasets(
    project_id: str,
    user_id: str = Depends(get_current_user),
):
    """List all datasets for a project."""
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM datasets WHERE project_id = ? AND user_id = ? ORDER BY uploaded_at DESC",
            (project_id, user_id),
        ).fetchall()
        return [dict_row(r) for r in rows]
    finally:
        conn.close()


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    user_id: str = Depends(get_current_user),
):
    """Delete a dataset."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM datasets WHERE id = ? AND user_id = ?",
            (dataset_id, user_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Dataset not found")

        dataset = dict_row(row)

        # Remove file from disk
        if os.path.exists(dataset["file_path"]):
            os.remove(dataset["file_path"])

        conn.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
        conn.commit()
        return {"message": "Dataset deleted"}
    finally:
        conn.close()
