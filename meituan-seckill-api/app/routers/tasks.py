from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core.deps import get_current_active_user, get_current_admin_user, get_api_key
from app.db.database import get_db

router = APIRouter()

@router.get("/", response_model=schemas.PaginatedResponse[schemas.Task])
def read_tasks(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_active_user)
) -> Any:
    """
    获取任务列表
    """
    tasks = crud.task.get_multi(db, skip=skip, limit=limit)
    total = crud.task.get_count(db)
    return schemas.PaginatedResponse(
        items=tasks,
        total=total,
        page=skip // limit + 1 if limit > 0 else 1,
        size=limit
    )

@router.post("/", response_model=schemas.ApiResponse[schemas.Task])
def create_task(
    *,
    db: Session = Depends(get_db),
    task_in: schemas.TaskCreate,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    创建新任务
    """
    task = crud.task.create(db=db, obj_in=task_in)
    return schemas.ApiResponse(data=task)

@router.get("/{id}", response_model=schemas.ApiResponse[schemas.Task])
def read_task(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: models.User = Depends(get_current_active_user)
) -> Any:
    """
    获取特定任务
    """
    task = crud.task.get(db=db, id=id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return schemas.ApiResponse(data=task)

@router.put("/{id}", response_model=schemas.ApiResponse[schemas.Task])
def update_task(
    *,
    db: Session = Depends(get_db),
    id: int,
    task_in: schemas.TaskUpdate,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    更新任务
    """
    task = crud.task.get(db=db, id=id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    task = crud.task.update(db=db, db_obj=task, obj_in=task_in)
    return schemas.ApiResponse(data=task)

@router.delete("/{id}", response_model=schemas.ApiResponse)
def delete_task(
    *,
    db: Session = Depends(get_db),
    id: int,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    删除任务
    """
    task = crud.task.get(db=db, id=id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    crud.task.remove(db=db, id=id)
    return schemas.ApiResponse(msg="删除成功")

@router.patch("/{id}/status", response_model=schemas.ApiResponse[schemas.Task])
def update_task_status(
    *,
    db: Session = Depends(get_db),
    id: int,
    status_in: schemas.TaskStatusUpdate,
    current_user: models.User = Depends(get_current_admin_user)
) -> Any:
    """
    更新任务状态（启用/禁用）
    """
    task = crud.task.get(db=db, id=id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    task = crud.task.update_task_status(db=db, task_id=id, is_active=status_in.is_active)
    return schemas.ApiResponse(data=task)

# API密钥访问的任务路由 
@router.get("/api/active", response_model=schemas.ApiResponse[List[schemas.Task]])
def read_active_tasks_api(
    db: Session = Depends(get_db),
    api_key: models.ApiKey = Depends(get_api_key),
    request: Request = None
) -> Any:
    """
    通过API密钥获取活跃任务
    """
    tasks = crud.task.get_active_tasks(db)
    return schemas.ApiResponse(data=tasks) 