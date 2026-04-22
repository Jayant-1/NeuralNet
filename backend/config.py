import os
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "layerlab-dev-secret-change-in-production-2024")
MODEL_STORAGE_PATH = os.getenv("MODEL_STORAGE_PATH", "./model_storage")
DATASET_STORAGE_PATH = os.path.join(MODEL_STORAGE_PATH, "datasets")

# Ensure storage directories exist
os.makedirs(MODEL_STORAGE_PATH, exist_ok=True)
os.makedirs(DATASET_STORAGE_PATH, exist_ok=True)
