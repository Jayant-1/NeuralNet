"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import ConfigDict


# ======================== Graph ========================
class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    params: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    source: str  # renamed from 'from' for Python compat
    target: str  # renamed from 'to'


class GraphData(BaseModel):
    layers: List[GraphNode]
    connections: List[GraphEdge]


# ======================== Projects ========================
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    template: Optional[str] = "custom"
    graph_data: Optional[Dict[str, Any]] = {"nodes": [], "edges": []}
    preprocessing_config: Optional[Dict[str, Any]] = {}
    problem_type: Optional[str] = "classification"  # classification|regression|nlp|custom
    input_type: Optional[str] = "tabular"           # image|tabular|text

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    graph_data: Optional[Dict[str, Any]] = None
    preprocessing_config: Optional[Dict[str, Any]] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    template: Optional[str]
    graph_data: Optional[Dict[str, Any]]
    preprocessing_config: Optional[Dict[str, Any]] = {}
    problem_type: Optional[str] = "classification"
    input_type: Optional[str] = "tabular"
    created_at: Optional[str]
    updated_at: Optional[str]


# ======================== Training ========================
class TrainingConfig(BaseModel):
    project_id: str
    optimizer: str = "adam"
    loss: str = "categorical_crossentropy"
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001
    validation_split: float = 0.2
    graph_data: Optional[GraphData] = None


class EpochMetric(BaseModel):
    epoch: int
    train_loss: float
    val_loss: float
    train_acc: float
    val_acc: float


class TrainingJobResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    job_id: str
    status: str
    metrics: List[EpochMetric] = []
    batch_metrics: List[dict] = []
    error_message: Optional[str] = None
    compiled_code: Optional[str] = None
    model_id: Optional[str] = None


# ======================== Deployment ========================
class DeployRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    project_id: str
    model_id: Optional[str] = None         # The trained model_id from training job
    training_job_id: Optional[str] = None  # Legacy fallback


class DeployResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_id: str
    api_key: str
    endpoint_url: str
    is_active: bool = True


# ======================== Prediction ========================
class PredictRequest(BaseModel):
    input: Any  # flexible input format


class PredictResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    status: str
    model_id: str
    predictions: Any
    predicted_class: Optional[int] = None
    confidence: Optional[float] = None
    inference_time_ms: Optional[float] = None
