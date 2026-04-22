"""
Prediction routes — run inference on deployed models
"""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import random
import time

from models.schemas import PredictRequest, PredictResponse
from routes.deployment import deployments_db

router = APIRouter()


@router.post("/predict/{model_id}", response_model=PredictResponse)
async def predict(
    model_id: str,
    request: PredictRequest,
    x_api_key: Optional[str] = Header(None),
):
    # Find deployment
    deployment = deployments_db.get(model_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Model not found")

    # Validate API key
    if not x_api_key or x_api_key != deployment["api_key"]:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if not deployment["is_active"]:
        raise HTTPException(status_code=503, detail="Model is not active")

    # Increment request count
    deployment["request_count"] = deployment.get("request_count", 0) + 1

    # Simulate inference
    start = time.time()
    predictions = [round(random.random(), 4) for _ in range(10)]
    max_idx = predictions.index(max(predictions))
    inference_time = round((time.time() - start) * 1000, 2)

    return PredictResponse(
        status="success",
        model_id=model_id,
        predictions=predictions,
        predicted_class=max_idx,
        confidence=max(predictions),
        inference_time_ms=inference_time,
    )
