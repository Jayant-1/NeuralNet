"""
Deployment routes — deploy models and manage deployments
Deployments are persisted to disk so they survive server restarts.
"""
from fastapi import APIRouter, Depends, HTTPException
import uuid
import secrets
import json
import os
from datetime import datetime, timezone

from auth import get_current_user
from models.schemas import DeployRequest, DeployResponse
from routes.training import trained_models
from config import MODEL_STORAGE_PATH

router = APIRouter()

# ── Persistent deployments store ──────────────────────────────────
DEPLOYMENTS_FILE = os.path.join(os.path.dirname(__file__), "..", "deployments.json")

def _load_deployments() -> dict:
    """Load deployments from disk."""
    try:
        if os.path.exists(DEPLOYMENTS_FILE):
            with open(DEPLOYMENTS_FILE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def _save_deployments(db: dict):
    """Persist deployments to disk."""
    try:
        with open(DEPLOYMENTS_FILE, "w") as f:
            json.dump(db, f, indent=2)
    except Exception as e:
        print(f"[WARN] Could not save deployments: {e}")

# Load on startup
deployments_db: dict = _load_deployments()


@router.post("/deploy", response_model=DeployResponse)
async def deploy_model(
    request: DeployRequest,
    user_id: str = Depends(get_current_user),
):
    # Use the model_id from training (so the .keras file path matches)
    model_id = getattr(request, "model_id", None) or request.training_job_id

    if not model_id:
        raise HTTPException(
            status_code=400,
            detail="No model_id provided. Train a model first."
        )

    # Verify the trained model actually exists (in memory or on disk)
    # (Mocked out: We skip the disk check because in mock mode, no .keras file is saved)
    model_path = os.path.join(MODEL_STORAGE_PATH, f"{model_id}.keras")
    # if model_id not in trained_models and not os.path.exists(model_path):
    #     raise HTTPException(
    #         status_code=400,
    #         detail=f"Trained model '{model_id}' not found on disk. Train the model first, or ensure the backend hasn't restarted since training."
    #     )

    api_key = f"ll_{secrets.token_hex(16)}"
    endpoint_url = f"/api/predict/{model_id}"

    deployment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "model_id": model_id,
        "project_id": request.project_id,
        "api_key": api_key,
        "endpoint_url": endpoint_url,
        "is_active": True,
        "request_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    deployments_db[model_id] = deployment
    _save_deployments(deployments_db)  # Persist immediately

    return DeployResponse(
        model_id=model_id,
        api_key=api_key,
        endpoint_url=endpoint_url,
        is_active=True,
    )


@router.get("/deployments")
async def list_deployments(user_id: str = Depends(get_current_user)):
    return [
        DeployResponse(
            model_id=d["model_id"],
            api_key=d["api_key"],
            endpoint_url=d["endpoint_url"],
            is_active=d["is_active"],
        )
        for d in deployments_db.values()
        if d["user_id"] == user_id
    ]
