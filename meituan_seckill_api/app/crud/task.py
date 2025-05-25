from typing import List, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate

class CRUDTask(CRUDBase[Task, TaskCreate, TaskUpdate]):
    def get_active_tasks(self, db: Session, skip: int = 0, limit: int = 100) -> List[Task]:
        """
        获取活跃任务
        """
        return db.query(self.model).filter(Task.is_active == True).offset(skip).limit(limit).all()
    
    def get_tasks_by_priority(self, db: Session, skip: int = 0, limit: int = 100) -> List[Task]:
        """
        按优先级获取任务
        """
        return db.query(self.model).order_by(Task.priority.desc()).offset(skip).limit(limit).all()
    
    def update_task_status(self, db: Session, *, task_id: int, is_active: bool) -> Optional[Task]:
        """
        更新任务状态
        """
        task = self.get(db, id=task_id)
        if not task:
            return None
        task.is_active = is_active
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

task = CRUDTask(Task) 