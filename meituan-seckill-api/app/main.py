from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import users, tasks, api_keys, auth, logs
from app.core.config import settings

app = FastAPI(
    title="美团秒杀管理系统",
    description="美团外卖自动抢券工具的后端API",
    version="1.0.0",
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/users", tags=["用户"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["任务"])
app.include_router(api_keys.router, prefix="/api/keys", tags=["API密钥"])
app.include_router(logs.router, prefix="/api/logs", tags=["日志"])

@app.get("/")
async def root():
    return {"message": "美团秒杀管理系统API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 