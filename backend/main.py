"""
NeuralNet FastAPI Backend — Main Entry Point
Uses SQLite database with local JWT auth.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

import database  # noqa: F401 — auto-initializes DB on import
import config    # noqa: F401 — ensures MODEL_STORAGE_PATH is created

from routes import auth, projects, training, deployment, predict, datasets, compile


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[START] NeuralNet backend starting...")
    await database.initialize_database()
    yield
    print("[STOP] NeuralNet backend shutting down...")


app = FastAPI(
    title="NeuralNet API",
    description="Backend API for NeuralNet neural network builder",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://neural-net-blond.vercel.app", "neural-net-blond.vercel.app", "neuralnet.jayantpotdar.in", "https://neuralnet.jayantpotdar.in", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(projects.router, prefix="/api", tags=["Projects"])
app.include_router(training.router, prefix="/api", tags=["Training"])
app.include_router(deployment.router, prefix="/api", tags=["Deployment"])
app.include_router(predict.router, prefix="/api", tags=["Prediction"])
app.include_router(datasets.router, prefix="/api", tags=["Datasets"])
app.include_router(compile.router, prefix="/api", tags=["Compile"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "NeuralNet API"}
