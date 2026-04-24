"""
Project CRUD routes — uses SQLite database
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
import json
import sqlite3
from datetime import datetime, timezone

from auth import get_current_user
from models.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from database import get_db, dict_row

router = APIRouter()


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    user_id: str = Depends(get_current_user),
):
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    graph_json = json.dumps(project.graph_data or {"nodes": [], "edges": []})
    preproc_json = json.dumps(project.preprocessing_config or {})

    conn = get_db()
    try:
        conn.execute(
            """INSERT INTO projects (id, user_id, name, description, template, graph_data, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (project_id, user_id, project.name, project.description,
             project.template, graph_json, now, now),
        )
        conn.commit()

        return ProjectResponse(
            id=project_id, name=project.name, description=project.description,
            template=project.template, graph_data=project.graph_data,
            preprocessing_config=project.preprocessing_config or {},
            problem_type=project.problem_type or "classification",
            input_type=project.input_type or "tabular",
            created_at=now, updated_at=now,
        )
    finally:
        conn.close()


@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(user_id: str = Depends(get_current_user)):
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        results = []
        for r in rows:
            d = dict_row(r)
            # Fill defaults if columns are missing (old DB rows)
            d.setdefault("preprocessing_config", {})
            d.setdefault("problem_type", "classification")
            d.setdefault("input_type", "tabular")
            results.append(ProjectResponse(**d))
        return results
    finally:
        conn.close()


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user_id: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        d = dict_row(row)
        d.setdefault("preprocessing_config", {})
        d.setdefault("problem_type", "classification")
        d.setdefault("input_type", "tabular")
        return ProjectResponse(**d)
    finally:
        conn.close()


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    updates: ProjectUpdate,
    user_id: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")

        current = dict_row(row)
        name = updates.name if updates.name is not None else current["name"]
        desc = updates.description if updates.description is not None else current["description"]
        graph = (json.dumps(updates.graph_data) if updates.graph_data is not None
                 else json.dumps(current.get("graph_data", {})))
        preproc = (json.dumps(updates.preprocessing_config) if updates.preprocessing_config is not None
                   else json.dumps(current.get("preprocessing_config", {})))
        now = datetime.now(timezone.utc).isoformat()

        conn.execute(
            """UPDATE projects SET name=?, description=?, graph_data=?,
               preprocessing_config=?, updated_at=?
               WHERE id=? AND user_id=?""",
            (name, desc, graph, preproc, now, project_id, user_id),
        )
        conn.commit()

        updated = dict_row(conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone())
        updated.setdefault("preprocessing_config", {})
        updated.setdefault("problem_type", "classification")
        updated.setdefault("input_type", "tabular")
        return ProjectResponse(**updated)
    finally:
        conn.close()


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user),
):
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")

        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
        return {"message": "Project deleted"}
    finally:
        conn.close()
