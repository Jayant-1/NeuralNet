# NeuralNet

NeuralNet is a full-stack visual deep learning studio for building, training, and serving neural networks from a drag-and-drop graph interface.

It includes:

- A React + Vite frontend with a node-based model builder
- A FastAPI backend that compiles graph JSON into executable Keras code
- Real TensorFlow model training with live metrics
- One-click deployment and API key-based inference endpoints

## Core Features

- Visual model builder with layer nodes and connections
- Graph-to-code compilation (AST-based) to TensorFlow/Keras
- Real training pipeline with per-epoch and per-batch metrics
- Built-in dataset loader (MNIST, Fashion-MNIST, CIFAR-10, CIFAR-100)
- Dataset upload support for project-specific files
- Project persistence (graph + preprocessing config)
- Model deployment with generated API keys
- Prediction playground for deployed endpoints
- Authenticated multi-project workflow (signup/login/JWT)

## Tech Stack

Frontend

- React 18
- Vite
- Zustand
- Axios
- React Router
- Tailwind CSS
- XYFlow (React Flow)
- Monaco Editor
- Recharts

Backend

- FastAPI
- SQLite (local development) / Turso libsql (production)
- TensorFlow / Keras
- NumPy
- Pydantic

## Repository Structure

- frontend: React application (UI, builder, pages, API client, state)
- backend: FastAPI services and routes
- database: SQL schema artifacts (legacy Supabase schema kept for reference)
- start.sh: helper script to run frontend and backend together

## Architecture Overview

1. User creates a project and designs a neural network in the visual builder.
2. Frontend sends graph data to backend compile/training endpoints.
3. Backend compiles graph layers and connections into executable Keras code.
4. Training runs in background and streams metrics via polling.
5. Trained model is saved as a .keras file in backend/model_storage.
6. Deployment generates endpoint metadata + API key.
7. Inference requests are served through /api/predict/{model_id}.

## Prerequisites

- Python 3.10+ recommended
- Node.js 18+ and npm

## Quick Start

Backend:

    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Frontend:

    cd frontend
    npm install
    npm run dev

Default URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Environment Variables

Backend reads environment variables from backend/.env if present.

Supported settings:

- JWT_SECRET: JWT signing secret
- DATABASE_URL: database connection URL (default local SQLite)
- TURSO_AUTH_TOKEN: auth token for Turso when using a libsql URL
- MODEL_STORAGE_PATH: directory for saved .keras models

Turso examples:

- DATABASE_URL=libsql://neuralnet-jayant.aws-ap-south-1.turso.io
- DATABASE_URL=sqlite+libsql://neuralnet-jayant.aws-ap-south-1.turso.io

The backend auto-converts libsql:// to sqlite+libsql:// for SQLAlchemy compatibility.

If not provided, safe local defaults are used.

## Main API Endpoints

Auth

- POST /api/auth/signup
- POST /api/auth/login

Projects

- POST /api/projects
- GET /api/projects
- GET /api/projects/{project_id}
- PUT /api/projects/{project_id}
- DELETE /api/projects/{project_id}

Datasets

- GET /api/datasets/builtin
- POST /api/datasets/builtin/load
- POST /api/datasets/{project_id}/upload
- GET /api/datasets/{project_id}
- GET /api/datasets/{project_id}/active
- DELETE /api/datasets/{dataset_id}

Training and Compilation

- POST /api/compile
- POST /api/train
- GET /api/metrics/{job_id}
- GET /api/training/jobs/{project_id}

Deployment and Prediction

- POST /api/deploy
- GET /api/deployments
- POST /api/predict/{model_id} (requires X-API-Key header)

Health

- GET /api/health

## Data and Model Persistence

- Local development uses SQLite at backend/layerlab.db
- Production can use Turso via DATABASE_URL=libsql://...
- Trained models are stored under backend/model_storage
- Deployment metadata persists in backend/deployments.json

## Notes

- The active runtime uses local FastAPI + SQLite + JWT auth.
- Some files in the repository (such as database/schema.sql and oldfrontend) represent older or alternate approaches and are not part of the current runtime path.

## Future Improvements

- Persist training jobs/models fully in database tables for cross-restart continuity
- Add tests for route handlers and graph compiler validation
- Add containerized setup (Docker Compose)
- Add role-based auth and project sharing
