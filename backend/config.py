import os
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "layerlab-dev-secret-change-in-production-2024")
DATABASE_URL = os.getenv(
	"DATABASE_URL",
	f"sqlite:///{os.path.join(os.path.dirname(__file__), 'layerlab.db')}",
)
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")
MODEL_STORAGE_PATH = os.getenv("MODEL_STORAGE_PATH", "./model_storage")
DATASET_STORAGE_PATH = os.path.join(MODEL_STORAGE_PATH, "datasets")

# Ensure storage directories exist
os.makedirs(MODEL_STORAGE_PATH, exist_ok=True)
os.makedirs(DATASET_STORAGE_PATH, exist_ok=True)
