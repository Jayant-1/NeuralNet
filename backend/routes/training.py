"""
Training routes — start training and get metrics
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import uuid
import math
import time
import random
from datetime import datetime, timezone

from auth import get_current_user
from models.schemas import TrainingConfig, TrainingJobResponse, EpochMetric
from services.graph_compiler import compile_graph_to_model

router = APIRouter()

# In-memory training jobs store
training_jobs: dict = {}


def run_training(job_id: str, config: TrainingConfig):
    """Background training task — simulates model training."""
    job = training_jobs[job_id]
    job["status"] = "running"
    job["started_at"] = datetime.now(timezone.utc).isoformat()

    try:
        # If graph_data is provided, compile it
        if config.graph_data:
            model_code = compile_graph_to_model(
                [layer.model_dump() for layer in config.graph_data.layers],
                [conn.model_dump() for conn in config.graph_data.connections],
            )
            job["compiled_code"] = model_code

        # Simulate training epochs
        for epoch in range(1, config.epochs + 1):
            time.sleep(0.5)  # Simulate computation time

            train_loss = max(0.05, 2.5 * math.exp(-0.3 * epoch) + (random.random() * 0.1 - 0.05))
            val_loss = train_loss + 0.05 + random.random() * 0.1
            train_acc = min(0.99, 1 - train_loss * 0.3 + random.random() * 0.02)
            val_acc = train_acc - 0.02 - random.random() * 0.03

            metric = EpochMetric(
                epoch=epoch,
                train_loss=round(train_loss, 4),
                val_loss=round(val_loss, 4),
                train_acc=round(train_acc, 4),
                val_acc=round(val_acc, 4),
            )
            job["metrics"].append(metric.model_dump())

        job["status"] = "completed"
        job["completed_at"] = datetime.now(timezone.utc).isoformat()

    except Exception as e:
        job["status"] = "failed"
        job["error_message"] = str(e)


@router.post("/train", response_model=TrainingJobResponse)
async def start_training(
    config: TrainingConfig,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    job_id = str(uuid.uuid4())

    training_jobs[job_id] = {
        "job_id": job_id,
        "user_id": user_id,
        "project_id": config.project_id,
        "status": "pending",
        "metrics": [],
        "error_message": None,
        "config": config.model_dump(),
    }

    background_tasks.add_task(run_training, job_id, config)

    return TrainingJobResponse(
        job_id=job_id,
        status="pending",
        metrics=[],
    )


@router.get("/metrics/{job_id}", response_model=TrainingJobResponse)
async def get_metrics(
    job_id: str,
    user_id: str = Depends(get_current_user),
):
    job = training_jobs.get(job_id)
    if not job or job["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Training job not found")

    return TrainingJobResponse(
        job_id=job["job_id"],
        status=job["status"],
        metrics=[EpochMetric(**m) for m in job["metrics"]],
        error_message=job.get("error_message"),
    )


@router.get("/training/jobs/{project_id}")
async def list_training_jobs(
    project_id: str,
    user_id: str = Depends(get_current_user),
):
    jobs = [
        TrainingJobResponse(
            job_id=j["job_id"],
            status=j["status"],
            metrics=[EpochMetric(**m) for m in j["metrics"]],
            error_message=j.get("error_message"),
        )
        for j in training_jobs.values()
        if j["user_id"] == user_id and j["project_id"] == project_id
    ]
    return jobs
