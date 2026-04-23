"""
Model Training Service — REAL TensorFlow/Keras training

Handles:
  1. Using built-in Keras datasets when available
  2. Falling back to synthetic data when no dataset loaded
  3. Running model.fit() with real backpropagation
  4. Collecting real metrics per epoch via Keras callbacks
  5. Saving trained models to disk
"""
import os
import numpy as np
import tensorflow as tf
from typing import Dict, Any, List, Callable, Optional
from config import MODEL_STORAGE_PATH


def generate_synthetic_data(
    input_shape: tuple,
    output_shape: tuple,
    num_samples: int = 1000,
    loss_fn: str = "categorical_crossentropy",
) -> tuple:
    """
    Generate synthetic training data matching the model's input/output shapes.
    Used when no dataset is uploaded -- allows training to work immediately.
    """
    x = np.random.randn(num_samples, *input_shape).astype(np.float32)

    num_classes = output_shape[-1] if len(output_shape) > 0 else 10

    if "crossentropy" in loss_fn.lower() and "sparse" not in loss_fn.lower():
        y = np.zeros((num_samples, num_classes), dtype=np.float32)
        labels = np.random.randint(0, num_classes, num_samples)
        y[np.arange(num_samples), labels] = 1.0
    elif "sparse" in loss_fn.lower():
        y = np.random.randint(0, num_classes, num_samples).astype(np.int32)
    elif "binary" in loss_fn.lower():
        y = np.random.randint(0, 2, (num_samples, 1)).astype(np.float32)
    else:
        y = np.random.randn(num_samples, *output_shape).astype(np.float32)

    return x, y


def apply_preprocessing_config(
    x_train: np.ndarray,
    x_test: np.ndarray,
    y_train: np.ndarray,
    y_test: np.ndarray,
    config: dict,
) -> tuple:
    """
    Apply preprocessing steps based on the project's preprocessing_config.
    Each key corresponds to a toggle the user set in the Preprocessing panel.

    Supported transforms:
      normalize_pixels   — divide by 255.0  (images)
      standardize        — zero-mean, unit-variance per feature  (tabular)
      fill_na_mean       — replace NaN with column mean  (tabular)
      random_flip        — horizontal flip augmentation  (images)
      to_categorical     — handled externally (via loss function)
    """
    cfg = config or {}

    # -- normalize_pixels: scale [0,255] → [0,1] --
    if cfg.get("normalize_pixels"):
        # Only apply if data isn't already in [0,1]
        if x_train.max() > 1.0:
            x_train = x_train.astype(np.float32) / 255.0
            x_test = x_test.astype(np.float32) / 255.0

    # -- standardize: fit on train, apply to both --
    if cfg.get("standardize"):
        flat_train = x_train.reshape(len(x_train), -1)
        flat_test = x_test.reshape(len(x_test), -1)
        mean = flat_train.mean(axis=0)
        std = flat_train.std(axis=0) + 1e-8
        flat_train = (flat_train - mean) / std
        flat_test = (flat_test - mean) / std
        x_train = flat_train.reshape(x_train.shape)
        x_test = flat_test.reshape(x_test.shape)

    # -- fill_na_mean: replace NaN with column mean --
    if cfg.get("fill_na_mean"):
        flat_train = x_train.reshape(len(x_train), -1)
        col_means = np.nanmean(flat_train, axis=0)
        nan_mask = np.isnan(flat_train)
        flat_train[nan_mask] = np.take(col_means, np.where(nan_mask)[1])
        x_train = flat_train.reshape(x_train.shape)

        flat_test = x_test.reshape(len(x_test), -1)
        nan_mask_t = np.isnan(flat_test)
        flat_test[nan_mask_t] = np.take(col_means, np.where(nan_mask_t)[1])
        x_test = flat_test.reshape(x_test.shape)

    # -- random_flip: horizontal flip augmentation (images only) --
    if cfg.get("random_flip") and x_train.ndim == 4:
        flip_mask = np.random.rand(len(x_train)) > 0.5
        x_train[flip_mask] = x_train[flip_mask, :, ::-1, :]

    # -- random_rotation (small angle via np roll approximation) --
    # True rotation needs scipy; skip unless scipy available
    if cfg.get("random_zoom") and x_train.ndim == 4:
        try:
            from scipy.ndimage import zoom as scipy_zoom
            for i in range(len(x_train)):
                factor = np.random.uniform(0.9, 1.1)
                zoomed = scipy_zoom(x_train[i], [factor, factor, 1], order=1)
                # Crop/pad back to original shape
                h, w = x_train.shape[1], x_train.shape[2]
                zh, zw = zoomed.shape[0], zoomed.shape[1]
                if zh > h:
                    start_h = (zh - h) // 2
                    zoomed = zoomed[start_h:start_h+h, :, :]
                else:
                    pad_h = (h - zh) // 2
                    zoomed = np.pad(zoomed, [(pad_h, h-zh-pad_h), (0,0), (0,0)])
                if zw > w:
                    start_w = (zw - w) // 2
                    zoomed = zoomed[:, start_w:start_w+w, :]
                else:
                    pad_w = (w - zw) // 2
                    zoomed = np.pad(zoomed, [(0,0), (pad_w, w-zw-pad_w), (0,0)])
                x_train[i] = zoomed[:h, :w, :]
        except ImportError:
            pass  # scipy not available, skip zoom

    return x_train, x_test, y_train, y_test


def prepare_dataset_for_model(
    dataset_info: Dict[str, Any],
    model: tf.keras.Model,
    loss_fn: str = "categorical_crossentropy",
) -> tuple:
    """
    Prepare a loaded Keras dataset for the model.
    Handles one-hot encoding and shape matching.
    """
    x_train = dataset_info["x_train"]
    y_train = dataset_info["y_train"]
    x_test = dataset_info["x_test"]
    y_test = dataset_info["y_test"]
    num_classes = dataset_info["num_classes"]

    # One-hot encode labels for categorical crossentropy
    if "crossentropy" in loss_fn.lower() and "sparse" not in loss_fn.lower():
        y_train = tf.keras.utils.to_categorical(y_train, num_classes)
        y_test = tf.keras.utils.to_categorical(y_test, num_classes)

    return x_train, y_train, x_test, y_test


class MetricsCollector(tf.keras.callbacks.Callback):
    """
    Keras callback that collects metrics per epoch
    and optionally calls an external callback function.
    """

    def __init__(self, on_epoch_end_fn: Optional[Callable] = None):
        super().__init__()
        self.epoch_metrics: List[Dict[str, float]] = []
        self.on_epoch_end_fn = on_epoch_end_fn

    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        metrics = {
            "epoch": epoch + 1,
            "train_loss": round(float(logs.get("loss", 0)), 4),
            "train_acc": round(float(logs.get("accuracy", 0)), 4),
            "val_loss": round(float(logs.get("val_loss", 0)), 4),
            "val_acc": round(float(logs.get("val_accuracy", 0)), 4),
        }
        self.epoch_metrics.append(metrics)

        if self.on_epoch_end_fn:
            self.on_epoch_end_fn(metrics)


def train_model(
    model: tf.keras.Model,
    training_config: Dict[str, Any],
    on_epoch_end: Optional[Callable[[Dict[str, float]], None]] = None,
    dataset_info: Optional[Dict[str, Any]] = None,
    preprocessing_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Train a REAL Keras model with model.fit().

    Args:
        model: A compiled tf.keras model (from compile_and_build_model)
        training_config: Dict with epochs, batch_size, validation_split, loss
        on_epoch_end: Optional callback called after each epoch with metrics
        dataset_info: If provided, use this real dataset instead of synthetic
        preprocessing_config: Dict of preprocessing toggles from project wizard

    Returns:
        Dict with status, all_metrics, final_metrics, dataset_used
    """
    epochs = training_config.get("epochs", 10)
    batch_size = training_config.get("batch_size", 32)
    validation_split = training_config.get("validation_split", 0.2)
    loss_fn = training_config.get("loss", "categorical_crossentropy")

    dataset_used = "synthetic"

    if dataset_info:
        # Use REAL dataset
        x_train, y_train, x_test, y_test = prepare_dataset_for_model(
            dataset_info, model, loss_fn
        )
        dataset_used = dataset_info.get("name", "uploaded")

        # Apply user-defined preprocessing config
        if preprocessing_config:
            x_train, x_test, y_train, y_test = apply_preprocessing_config(
                x_train, x_test, y_train, y_test, preprocessing_config
            )
        collector = MetricsCollector(on_epoch_end_fn=on_epoch_end)

        # Run REAL training with real data and a real validation set
        history = model.fit(
            x_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(x_test, y_test),
            callbacks=[collector],
            verbose=0,
        )
    else:
        # Fallback: synthetic data
        from services.graph_compiler import get_model_input_shape, get_model_output_shape
        input_shape = get_model_input_shape(model)
        output_shape = get_model_output_shape(model)

        num_samples = max(500, batch_size * 20)
        x_data, y_data = generate_synthetic_data(
            input_shape, output_shape, num_samples, loss_fn
        )

        collector = MetricsCollector(on_epoch_end_fn=on_epoch_end)

        history = model.fit(
            x_data, y_data,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            callbacks=[collector],
            verbose=0,
        )

    return {
        "status": "completed",
        "dataset_used": dataset_used,
        "final_metrics": collector.epoch_metrics[-1] if collector.epoch_metrics else {},
        "all_metrics": collector.epoch_metrics,
    }


def save_model(model: tf.keras.Model, model_id: str) -> str:
    """Save a trained Keras model to disk. Returns the file path."""
    os.makedirs(MODEL_STORAGE_PATH, exist_ok=True)
    model_path = os.path.join(MODEL_STORAGE_PATH, f"{model_id}.keras")
    model.save(model_path)
    return model_path


def load_model(model_id: str) -> tf.keras.Model:
    """Load a saved Keras model from disk for inference."""
    model_path = os.path.join(MODEL_STORAGE_PATH, f"{model_id}.keras")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model {model_id} not found at {model_path}")

    return tf.keras.models.load_model(model_path)


def predict_with_model(model: tf.keras.Model, input_data: Any) -> Dict[str, Any]:
    """
    Run real inference on a loaded model.
    """
    import time

    x = np.array(input_data, dtype=np.float32)

    if len(x.shape) == len(model.input_shape) - 1:
        x = np.expand_dims(x, axis=0)

    start = time.time()
    predictions = model.predict(x, verbose=0)
    inference_time = round((time.time() - start) * 1000, 2)

    preds = predictions[0].tolist()
    max_idx = int(np.argmax(predictions[0]))
    confidence = float(np.max(predictions[0]))

    return {
        "predictions": [round(p, 6) for p in preds],
        "predicted_class": max_idx,
        "confidence": round(confidence, 6),
        "inference_time_ms": inference_time,
    }
