"""
Project CRUD routes — uses SQLite database
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
import uuid
import json
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
        return [ProjectResponse(**dict_row(r)) for r in rows]
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
        return ProjectResponse(**dict_row(row))
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
        graph = json.dumps(updates.graph_data) if updates.graph_data is not None else current["graph_data"] if isinstance(current["graph_data"], str) else json.dumps(current["graph_data"])
        now = datetime.now(timezone.utc).isoformat()

        conn.execute(
            """UPDATE projects SET name=?, description=?, graph_data=?, updated_at=?
               WHERE id=? AND user_id=?""",
            (name, desc, graph, now, project_id, user_id),
        )
        conn.commit()

        updated = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        return ProjectResponse(**dict_row(updated))
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
