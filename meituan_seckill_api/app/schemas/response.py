from typing import Any, Dict, Generic, List, Optional, TypeVar, Union
from pydantic import BaseModel
from pydantic.generics import GenericModel

DataT = TypeVar('DataT')

class ResponseBase(BaseModel):
    """基础响应模型"""
    code: int = 0
    msg: str = "成功"

class Response(ResponseBase):
    """标准响应模型，不包含数据"""
    pass

class DataResponse(ResponseBase, GenericModel, Generic[DataT]):
    """包含数据的响应模型"""
    data: DataT

class ListData(GenericModel, Generic[DataT]):
    """列表数据封装，包含分页信息"""
    items: List[DataT]
    total: int
    page: int = 1
    size: int = 10

class ListResponse(ResponseBase, GenericModel, Generic[DataT]):
    """列表数据响应模型"""
    items: List[DataT]
    total: int
    page: int = 1
    size: int = 10

# 错误响应模型
class ErrorResponse(ResponseBase):
    """错误响应模型"""
    code: int = 1
    msg: str = "操作失败"
    detail: Optional[str] = None

# 响应工厂函数
def success_response(*, data: Any = None, message: str = "成功") -> Union[Response, DataResponse]:
    """
    创建成功响应
    
    Args:
        data: 响应数据
        message: 成功消息
    
    Returns:
        响应模型
    """
    if data is None:
        return Response(msg=message)
    return DataResponse(data=data, msg=message)

def error_response(*, code: int = 1, message: str = "操作失败", detail: Optional[str] = None) -> ErrorResponse:
    """
    创建错误响应
    
    Args:
        code: 错误代码
        message: 错误消息
        detail: 错误详情
    
    Returns:
        错误响应模型
    """
    return ErrorResponse(code=code, msg=message, detail=detail)

def list_response(items: List[Any], total: int, page: int = 1, size: int = 10) -> ListResponse:
    """
    创建列表响应
    
    Args:
        items: 列表项
        total: 总数
        page: 页码
        size: 每页大小
    
    Returns:
        列表响应模型
    """
    return ListResponse(
        items=items,
        total=total,
        page=page,
        size=size
    ) 