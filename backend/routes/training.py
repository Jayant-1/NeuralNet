"""
Training routes — REAL model training with TensorFlow/Keras

Flow:
  1. POST /train — receives graph data + training config
  2. compile_and_build_model() builds a LIVE keras model from AST
  3. trainer.train_model() runs model.fit() with synthetic data
  4. Real metrics (loss, accuracy) are collected per epoch
  5. Trained model is saved to disk for later inference
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import uuid
from datetime import datetime, timezone

from auth import get_current_user
from models.schemas import TrainingConfig, TrainingJobResponse, EpochMetric
from services.graph_compiler import compile_and_build_model, compile_graph_to_code
from services.trainer import train_model, save_model

router = APIRouter()

# In-memory training jobs store (stores status + metrics)
training_jobs: dict = {}

# In-memory store for trained models (model_id -> keras model object)
trained_models: dict = {}


def run_training(job_id: str, config: TrainingConfig):
    """
    Background training task — REAL model training.
    1. Build model from graph via AST
    2. Train with model.fit()
    3. Save model to disk
    """
    job = training_jobs[job_id]
    job["status"] = "running"
    job["started_at"] = datetime.now(timezone.utc).isoformat()

    try:
        if not config.graph_data:
            raise ValueError("No graph data provided. Build a model first.")

        # Step 1: Compile graph -> live Keras model using AST
        layers = [layer.model_dump() for layer in config.graph_data.layers]
        connections = [conn.model_dump() for conn in config.graph_data.connections]

        model, source_code, summary = compile_and_build_model(
            layers, connections,
            optimizer=config.optimizer,
            loss=config.loss,
            learning_rate=config.learning_rate,
        )
        job["compiled_code"] = source_code
        job["model_summary"] = summary

        # Step 2: Train the model with model.fit()
        def on_epoch_end(metrics):
            """Callback to store epoch metrics in real-time."""
            epoch_metric = EpochMetric(**metrics)
            job["metrics"].append(epoch_metric.model_dump())

        # batch_metrics list — collector appends to this directly
        job_batch_metrics = job["batch_metrics"]

        training_config = {
            "epochs": config.epochs,
            "batch_size": config.batch_size,
            "validation_split": config.validation_split,
            "loss": config.loss,
        }

        # Check if project has a loaded dataset
        from routes.datasets import loaded_datasets
        dataset_info = loaded_datasets.get(config.project_id)

        # Load project's preprocessing config from DB
        from database import get_db, dict_row
        preprocessing_config = {}
        try:
            conn = get_db()
            row = conn.execute(
                "SELECT preprocessing_config FROM projects WHERE id = ?",
                (config.project_id,)
            ).fetchone()
            conn.close()
            if row:
                import json
                raw = row[0]
                preprocessing_config = json.loads(raw) if isinstance(raw, str) else (raw or {})
        except Exception:
            pass

        result = train_model(
            model, training_config,
            on_epoch_end=on_epoch_end,
            dataset_info=dataset_info,
            preprocessing_config=preprocessing_config,
            job_batch_metrics=job_batch_metrics,
        )
        job["dataset_used"] = result.get("dataset_used", "synthetic")

        # Step 3: Save the trained model to disk
        model_id = str(uuid.uuid4())[:8]
        model_path = save_model(model, model_id)
        job["model_id"] = model_id
        job["model_path"] = model_path

        # Keep model in memory for fast inference
        trained_models[model_id] = model

        job["status"] = "completed"
        job["completed_at"] = datetime.now(timezone.utc).isoformat()

    except Exception as e:
        job["status"] = "failed"
        job["error_message"] = str(e)
        import traceback
        job["traceback"] = traceback.format_exc()


@router.post("/train", response_model=TrainingJobResponse)
async def start_training(
    config: TrainingConfig,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    """Start a real training job. Model is compiled from graph via AST and trained with model.fit()."""
    job_id = str(uuid.uuid4())

    training_jobs[job_id] = {
        "job_id": job_id,
        "user_id": user_id,
        "project_id": config.project_id,
        "status": "pending",
        "metrics": [],
        "batch_metrics": [],
        "error_message": None,
        "compiled_code": None,
        "model_summary": None,
        "model_id": None,
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
    """Get real-time training metrics for a running or completed job."""
    job = training_jobs.get(job_id)
    if not job or job["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Training job not found")

    return TrainingJobResponse(
        job_id=job["job_id"],
        status=job["status"],
        metrics=[EpochMetric(**m) for m in job["metrics"]],
        batch_metrics=job.get("batch_metrics", []),
        error_message=job.get("error_message"),
        compiled_code=job.get("compiled_code"),
        model_id=job.get("model_id"),
    )


@router.get("/training/jobs/{project_id}")
async def list_training_jobs(
    project_id: str,
    user_id: str = Depends(get_current_user),
):
    """List all training jobs for a project."""
    jobs = [
        TrainingJobResponse(
            job_id=j["job_id"],
            status=j["status"],
            metrics=[EpochMetric(**m) for m in j["metrics"]],
            error_message=j.get("error_message"),
            compiled_code=j.get("compiled_code"),
            model_id=j.get("model_id"),
        )
        for j in training_jobs.values()
        if j["user_id"] == user_id and j["project_id"] == project_id
    ]
    return jobs
