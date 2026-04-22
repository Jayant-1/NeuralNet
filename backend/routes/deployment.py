"""
Deployment routes — deploy models and manage deployments
"""
from fastapi import APIRouter, Depends, HTTPException
import uuid
import secrets
from datetime import datetime, timezone

from auth import get_current_user
from models.schemas import DeployRequest, DeployResponse

router = APIRouter()

# In-memory deployments store
deployments_db: dict = {}


@router.post("/deploy", response_model=DeployResponse)
async def deploy_model(
    request: DeployRequest,
    user_id: str = Depends(get_current_user),
):
    model_id = str(uuid.uuid4())[:8]
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
