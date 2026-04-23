"""
Compile route — convert graph JSON to Keras Python code via AST
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from services.graph_compiler import (
    compile_graph_to_code,
    compile_and_build_model,
)

router = APIRouter()


class CompileRequest(BaseModel):
    layers: List[Dict[str, Any]]
    connections: List[Dict[str, Any]]
    optimizer: str = "adam"
    loss: str = "categorical_crossentropy"
    learning_rate: float = 0.001


class CompileResponse(BaseModel):
    source_code: str
    summary: Optional[str] = None
    layer_count: int = 0
    is_valid: bool = True
    error: Optional[str] = None


@router.post("/compile", response_model=CompileResponse)
async def compile_graph(request: CompileRequest):
    """
    Compile a graph to Keras Python code using AST.
    Optionally validates by actually building the model.
    """
    try:
        # First, just generate the source code (fast, no TF needed)
        source_code = compile_graph_to_code(
            request.layers,
            request.connections,
            request.optimizer,
            request.loss,
            request.learning_rate,
        )

        # Try to actually build the model to validate it
        summary_text = None
        try:
            model, _, summary_text = compile_and_build_model(
                request.layers,
                request.connections,
                request.optimizer,
                request.loss,
                request.learning_rate,
            )
            layer_count = len(model.layers)
        except Exception as e:
            # Code generates fine but model has shape issues etc.
            layer_count = len(request.layers)
            summary_text = f"Warning: {str(e)}"

        return CompileResponse(
            source_code=source_code,
            summary=summary_text,
            layer_count=layer_count,
            is_valid=True,
        )

    except Exception as e:
        return CompileResponse(
            source_code=f"# Compilation error: {str(e)}",
            summary=None,
            layer_count=0,
            is_valid=False,
            error=str(e),
        )
