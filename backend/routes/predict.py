"""
Prediction routes — run REAL inference on trained models
"""
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import numpy as np

from models.schemas import PredictRequest, PredictResponse
from routes.deployment import deployments_db
from routes.training import trained_models
from services.trainer import load_model, predict_with_model

router = APIRouter()


@router.post("/predict/{model_id}", response_model=PredictResponse)
async def predict(
    model_id: str,
    request: PredictRequest,
    x_api_key: Optional[str] = Header(None),
):
    """Run real inference on a deployed model."""
    # Find deployment
    deployment = deployments_db.get(model_id)
    if not deployment:
        raise HTTPException(status_code=404, detail="Model not found or not deployed")

    # Validate API key
    if not x_api_key or x_api_key != deployment["api_key"]:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if not deployment["is_active"]:
        raise HTTPException(status_code=503, detail="Model is not active")

    # Increment request count
    deployment["request_count"] = deployment.get("request_count", 0) + 1

    # Get or load the model
    model = trained_models.get(model_id)
    if model is None:
        try:
            model = load_model(model_id)
            trained_models[model_id] = model  # Cache in memory
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Trained model file not found")

    # Run REAL inference
    try:
        result = predict_with_model(model, request.input)
        return PredictResponse(
            status="success",
            model_id=model_id,
            predictions=result["predictions"],
            predicted_class=result["predicted_class"],
            confidence=result["confidence"],
            inference_time_ms=result["inference_time_ms"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Inference failed: {str(e)}. Ensure input shape matches model."
        )
