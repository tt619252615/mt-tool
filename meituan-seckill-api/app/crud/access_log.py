from typing import List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.access_log import AccessLog
from app.schemas.access_log import AccessLogDetail

class CRUDAccessLog(CRUDBase[AccessLog, AccessLogDetail, AccessLogDetail]):
    def get_by_api_key(self, db: Session, *, api_key_id: int, skip: int = 0, limit: int = 100) -> List[AccessLog]:
        """
        获取特定API密钥的访问日志
        """
        return db.query(self.model).filter(AccessLog.api_key_id == api_key_id).order_by(AccessLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    def get_recent(self, db: Session, *, hours: int = 24, skip: int = 0, limit: int = 100) -> List[AccessLog]:
        """
        获取最近的访问日志
        """
        time_limit = datetime.utcnow() - timedelta(hours=hours)
        return db.query(self.model).filter(AccessLog.timestamp >= time_limit).order_by(AccessLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    def get_in_time_range(
        self, db: Session, *, start_time: datetime, end_time: datetime = None, skip: int = 0, limit: int = 100
    ) -> List[AccessLog]:
        """
        获取特定时间范围内的访问日志
        """
        query = db.query(self.model).filter(AccessLog.timestamp >= start_time)
        if end_time:
            query = query.filter(AccessLog.timestamp <= end_time)
        return query.order_by(AccessLog.timestamp.desc()).offset(skip).limit(limit).all()

access_log = CRUDAccessLog(AccessLog) 