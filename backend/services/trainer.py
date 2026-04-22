"""
Model training service — handles model compilation and training
"""
import os
import time
import math
import random
from typing import Dict, Any, List, Callable
from config import MODEL_STORAGE_PATH


def train_model(
    model_code: str,
    training_config: Dict[str, Any],
    on_epoch_end: Callable[[Dict[str, float]], None] = None,
) -> Dict[str, Any]:
    """
    Train a model from compiled Keras code.

    In production, this would:
    1. Execute the compiled code to build the model
    2. Load the dataset
    3. Train with the given config
    4. Call on_epoch_end callback for each epoch

    For MVP, this simulates realistic training metrics.
    """
    epochs = training_config.get("epochs", 10)
    metrics = []

    for epoch in range(1, epochs + 1):
        time.sleep(0.5)  # Simulate computation

        train_loss = max(0.05, 2.5 * math.exp(-0.3 * epoch) + (random.random() * 0.1 - 0.05))
        val_loss = train_loss + 0.05 + random.random() * 0.1
        train_acc = min(0.99, 1 - train_loss * 0.3 + random.random() * 0.02)
        val_acc = train_acc - 0.02 - random.random() * 0.03

        epoch_metrics = {
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            "val_loss": round(val_loss, 4),
            "train_acc": round(train_acc, 4),
            "val_acc": round(val_acc, 4),
        }
        metrics.append(epoch_metrics)

        if on_epoch_end:
            on_epoch_end(epoch_metrics)

    return {
        "status": "completed",
        "final_metrics": metrics[-1] if metrics else {},
        "all_metrics": metrics,
    }


def save_model(model_id: str, model_data: bytes = None) -> str:
    """Save model to local storage. Returns the file path."""
    model_path = os.path.join(MODEL_STORAGE_PATH, f"{model_id}.h5")

    # In production, serialize actual model
    # For MVP, create a placeholder file
    with open(model_path, "wb") as f:
        f.write(model_data or b"PLACEHOLDER_MODEL_DATA")

    return model_path


def load_model(model_id: str):
    """Load a model from storage for inference."""
    model_path = os.path.join(MODEL_STORAGE_PATH, f"{model_id}.h5")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model {model_id} not found")

    # In production: return tf.keras.models.load_model(model_path)
    return {"model_id": model_id, "path": model_path}
