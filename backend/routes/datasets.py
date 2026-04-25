"""
Dataset routes — upload, list, delete datasets + built-in Keras datasets
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import uuid
import os
import shutil
import numpy as np
from datetime import datetime, timezone

from auth import get_current_user
from database import get_db, dict_row, db_fetchone, db_fetchall, db_execute, db_commit, db_close
from config import DATASET_STORAGE_PATH

router = APIRouter()

# In-memory store for loaded datasets (project_id -> dataset info + data)
loaded_datasets = {}

# Available built-in datasets
BUILTIN_DATASETS = {
    "mnist": {
        "name": "MNIST",
        "description": "Handwritten digit recognition (0-9)",
        "input_shape": "(28, 28, 1)",
        "num_classes": 10,
        "samples": "60,000 train / 10,000 test",
        "size_mb": 11,
        "category": "image",
    },
    "fashion_mnist": {
        "name": "Fashion MNIST",
        "description": "Clothing item classification",
        "input_shape": "(28, 28, 1)",
        "num_classes": 10,
        "samples": "60,000 train / 10,000 test",
        "size_mb": 30,
        "category": "image",
    },
    "cifar10": {
        "name": "CIFAR-10",
        "description": "10 object categories (cars, planes, etc.)",
        "input_shape": "(32, 32, 3)",
        "num_classes": 10,
        "samples": "50,000 train / 10,000 test",
        "size_mb": 170,
        "category": "image",
    },
    "cifar100": {
        "name": "CIFAR-100",
        "description": "100 fine-grained object categories",
        "input_shape": "(32, 32, 3)",
        "num_classes": 100,
        "samples": "50,000 train / 10,000 test",
        "size_mb": 170,
        "category": "image",
    },
}


class LoadBuiltinRequest(BaseModel):
    dataset_key: str
    project_id: str


def _load_keras_dataset(key: str):
    """Load a built-in Keras dataset. Downloads on first use, cached by TF."""
    import tensorflow as tf

    if key == "mnist":
        (x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
    elif key == "fashion_mnist":
        (x_train, y_train), (x_test, y_test) = tf.keras.datasets.fashion_mnist.load_data()
    elif key == "cifar10":
        (x_train, y_train), (x_test, y_test) = tf.keras.datasets.cifar10.load_data()
    elif key == "cifar100":
        (x_train, y_train), (x_test, y_test) = tf.keras.datasets.cifar100.load_data()
    else:
        raise ValueError(f"Unknown dataset: {key}")

    # Normalize to float32 [0,1]
    x_train = x_train.astype(np.float32) / 255.0
    x_test = x_test.astype(np.float32) / 255.0

    # Add channel dim for grayscale
    if x_train.ndim == 3:
        x_train = x_train[..., np.newaxis]
        x_test = x_test[..., np.newaxis]

    # Squeeze labels if needed
    y_train = y_train.squeeze()
    y_test = y_test.squeeze()

    num_classes = int(y_train.max()) + 1

    return x_train, y_train, x_test, y_test, num_classes


@router.get("/datasets/builtin")
async def list_builtin_datasets():
    """List all available built-in Keras datasets."""
    return BUILTIN_DATASETS


@router.post("/datasets/builtin/load")
async def load_builtin_dataset(
    request: LoadBuiltinRequest,
    user_id: str = Depends(get_current_user),
):
    """Load a built-in Keras dataset for a project. Downloads on first use."""
    key = request.dataset_key
    project_id = request.project_id

    if key not in BUILTIN_DATASETS:
        raise HTTPException(status_code=400, detail=f"Unknown dataset: {key}")

    info = BUILTIN_DATASETS[key]

    try:
        x_train, y_train, x_test, y_test, num_classes = _load_keras_dataset(key)

        # Store in memory for training
        loaded_datasets[project_id] = {
            "key": key,
            "name": info["name"],
            "x_train": x_train,
            "y_train": y_train,
            "x_test": x_test,
            "y_test": y_test,
            "num_classes": num_classes,
            "input_shape": x_train.shape[1:],
            "num_train": len(x_train),
            "num_test": len(x_test),
        }

        return {
            "status": "loaded",
            "dataset": key,
            "name": info["name"],
            "input_shape": str(x_train.shape[1:]),
            "num_classes": num_classes,
            "num_train": len(x_train),
            "num_test": len(x_test),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {str(e)}")


@router.get("/datasets/{project_id}/active")
async def get_active_dataset(
    project_id: str,
    user_id: str = Depends(get_current_user),
):
    """Get the currently loaded dataset for a project."""
    ds = loaded_datasets.get(project_id)
    if not ds:
        return {"active": False}

    return {
        "active": True,
        "key": ds["key"],
        "name": ds["name"],
        "input_shape": str(ds["input_shape"]),
        "num_classes": ds["num_classes"],
        "num_train": ds["num_train"],
        "num_test": ds["num_test"],
    }


# ---- File upload routes (existing) ----

@router.post("/datasets/{project_id}/upload")
async def upload_dataset(
    project_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """Upload a dataset file for a project."""
    conn = get_db()
    try:
        row = await db_fetchone(
            conn,
            "SELECT id FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user_id),
        )
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")

        dataset_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        project_dir = os.path.join(DATASET_STORAGE_PATH, project_id)
        os.makedirs(project_dir, exist_ok=True)

        file_path = os.path.join(project_dir, f"{dataset_id}_{file.filename}")
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        file_size = os.path.getsize(file_path)
        file_type = "csv" if file.filename.endswith(".csv") else "image" if file.content_type and file.content_type.startswith("image/") else "other"

        await db_execute(
            """INSERT INTO datasets (id, project_id, user_id, file_name, file_path, file_size, file_type, uploaded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (dataset_id, project_id, user_id, file.filename, file_path, file_size, file_type, now),
        )
        await db_commit(conn)

        return {
            "id": dataset_id,
            "project_id": project_id,
            "file_name": file.filename,
            "file_size": file_size,
            "file_type": file_type,
            "uploaded_at": now,
        }
    finally:
        await db_close(conn)


@router.get("/datasets/{project_id}")
async def list_datasets(
    project_id: str,
    user_id: str = Depends(get_current_user),
):
    """List all datasets for a project."""
    conn = get_db()
    try:
        rows = await db_fetchall(
            conn,
            "SELECT * FROM datasets WHERE project_id = ? AND user_id = ? ORDER BY uploaded_at DESC",
            (project_id, user_id),
        )
        return [dict_row(r) for r in rows]
    finally:
        await db_close(conn)


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    user_id: str = Depends(get_current_user),
):
    """Delete a dataset."""
    conn = get_db()
    try:
        row = await db_fetchone(
            conn,
            "SELECT * FROM datasets WHERE id = ? AND user_id = ?",
            (dataset_id, user_id),
        )
        if not row:
            raise HTTPException(status_code=404, detail="Dataset not found")

        dataset = dict_row(row)

        if os.path.exists(dataset["file_path"]):
            os.remove(dataset["file_path"])

        await db_execute(conn, "DELETE FROM datasets WHERE id = ?", (dataset_id,))
        await db_commit(conn)
        return {"message": "Dataset deleted"}
    finally:
        await db_close(conn)
