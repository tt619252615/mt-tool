#!/usr/bin/env python3
"""
美团秒杀API接口测试脚本
"""
import os
import sys
import json
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from app.core.logger import logger, api_log

# API基础URL
BASE_URL = "http://localhost:8000/api"
# 测试用户凭证
TEST_USER = {"username": "admin", "password": "admin123"}
# 保存测试过程中创建的资源ID
test_resources = {
    "user_id": None,
    "api_key_id": None,
    "task_id": None,
}

# 控制台输出美化
EMOJI_PASS = "✅"
EMOJI_FAIL = "❌"
EMOJI_INFO = "ℹ️"
EMOJI_WARN = "⚠️"

def print_header(title: str) -> None:
    """打印测试标题"""
    print("\n" + "=" * 80)
    print(f"{title:^80}")
    print("=" * 80)

def print_result(name: str, success: bool, response: Optional[Dict[str, Any]] = None) -> None:
    """打印测试结果"""
    status = f"{EMOJI_PASS} 成功" if success else f"{EMOJI_FAIL} 失败"
    print(f"{name:<50} {status:>10}")
    
    if not success and response:
        print(f"  {EMOJI_INFO} 错误信息: {json.dumps(response, ensure_ascii=False)[:100]}")

class APITester:
    """API测试器"""

    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
    
    def login(self) -> bool:
        """登录并获取访问令牌"""
        print_header("🔐 认证测试")
        
        url = f"{BASE_URL}/auth/login"
        try:
            response = self.session.post(
                url,
                data=TEST_USER,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            data = response.json()
            
            success = response.status_code == 200 and data.get("data", {}).get("access_token")
            print_result("登录测试", success, data if not success else None)
            
            if success:
                self.access_token = data["data"]["access_token"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.access_token}"
                })
                api_log(f"用户 {TEST_USER['username']} 登录成功", "SUCCESS")
            return success
        except Exception as e:
            logger.error(f"登录测试失败: {e}")
            print_result("登录测试", False)
            return False
    
    def test_me(self) -> bool:
        """测试获取当前用户信息"""
        url = f"{BASE_URL}/auth/me"
        try:
            response = self.session.get(url)
            data = response.json()
            
            success = response.status_code == 200 and data.get("username") == TEST_USER["username"]
            print_result("获取当前用户信息", success, data if not success else None)
            return success
        except Exception as e:
            logger.error(f"获取用户信息测试失败: {e}")
            print_result("获取当前用户信息", False)
            return False
    
    def test_users(self) -> bool:
        """测试用户相关接口"""
        print_header("👥 用户管理测试")
        success_count = 0
        total_tests = 5
        
        # 1. 获取用户列表
        try:
            url = f"{BASE_URL}/users"
            response = self.session.get(url)
            data = response.json()
            
            success = response.status_code == 200 and isinstance(data.get("items"), list)
            print_result("获取用户列表", success, data if not success else None)
            if success:
                success_count += 1
        except Exception as e:
            logger.error(f"获取用户列表测试失败: {e}")
            print_result("获取用户列表", False)
        
        # 2. 创建新用户
        try:
            url = f"{BASE_URL}/users"
            new_user = {
                "username": f"testuser_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "password": "testpassword123",
                "is_admin": False
            }
            response = self.session.post(url, json=new_user)
            data = response.json()
            
            success = response.status_code == 200 and data.get("data", {}).get("username") == new_user["username"]
            print_result("创建新用户", success, data if not success else None)
            
            if success:
                success_count += 1
                test_resources["user_id"] = data["data"]["id"]
                api_log(f"创建测试用户: {new_user['username']}", "SUCCESS")
        except Exception as e:
            logger.error(f"创建用户测试失败: {e}")
            print_result("创建新用户", False)
        
        # 3. 获取特定用户
        if test_resources["user_id"]:
            try:
                url = f"{BASE_URL}/users/{test_resources['user_id']}"
                response = self.session.get(url)
                data = response.json()
                
                success = response.status_code == 200 and data.get("data", {}).get("id") == test_resources["user_id"]
                print_result("获取特定用户", success, data if not success else None)
                
                if success:
                    success_count += 1
            except Exception as e:
                logger.error(f"获取特定用户测试失败: {e}")
                print_result("获取特定用户", False)
        
        # 4. 更新用户
        if test_resources["user_id"]:
            try:
                url = f"{BASE_URL}/users/{test_resources['user_id']}"
                update_data = {
                    "is_active": True,
                }
                response = self.session.put(url, json=update_data)
                data = response.json()
                
                success = response.status_code == 200 and data.get("data", {}).get("is_active") == True
                print_result("更新用户", success, data if not success else None)
                
                if success:
                    success_count += 1
            except Exception as e:
                logger.error(f"更新用户测试失败: {e}")
                print_result("更新用户", False)
        
        # 5. 删除用户
        if test_resources["user_id"]:
            try:
                url = f"{BASE_URL}/users/{test_resources['user_id']}"
                response = self.session.delete(url)
                data = response.json()
                
                success = response.status_code == 200 and data.get("msg") == "删除成功"
                print_result("删除用户", success, data if not success else None)
                
                if success:
                    success_count += 1
                    test_resources["user_id"] = None
            except Exception as e:
                logger.error(f"删除用户测试失败: {e}")
                print_result("删除用户", False)
        
        return success_count == total_tests
    
    def test_api_keys(self) -> bool:
        """测试API密钥相关接口"""
        print_header("🔑 API密钥管理测试")
        success_count = 0
        total_tests = 5
        
        # 1. 获取API密钥列表
        try:
            url = f"{BASE_URL}/keys"
            response = self.session.get(url)
            data = response.json()
            
            success = response.status_code == 200 and isinstance(data.get("items"), list)
            print_result("获取API密钥列表", success, data if not success else None)
            if success:
                success_count += 1
        except Exception as e:
            logger.error(f"获取API密钥列表测试失败: {e}")
            print_result("获取API密钥列表", False)
        
        # 2. 创建新API密钥
        try:
            url = f"{BASE_URL}/keys"
            new_api_key = {
                "name": f"测试密钥_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "description": "API测试脚本创建的测试密钥",
                "max_usage": 1000
            }
            response = self.session.post(url, json=new_api_key)
            data = response.json()
            
            success = response.status_code == 200 and data.get("data", {}).get("name") == new_api_key["name"]
            print_result("创建新API密钥", success, data if not success else None)
            
            if success:
                success_count += 1
                test_resources["api_key_id"] = data["data"]["id"]
                # 打印API密钥，便于手动测试
                api_log(f"创建的API密钥: {data['data']['key']}", "INFO")
        except Exception as e:
            logger.error(f"创建API密钥测试失败: {e}")
            print_result("创建新API密钥", False)
        
        # 3. 获取特定API密钥
        if test_resources["api_key_id"]:
            try:
                url = f"{BASE_URL}/keys/{test_resources['api_key_id']}"
                response = self.session.get(url)
                data = response.json()
                
                success = response.status_code == 200 and data.get("data", {}).get("id") == test_resources["api_key_id"]
                print_result("获取特定API密钥", success, data if not success else None)
                
                if success:
                    success_count += 1
            except Exception as e:
                logger.error(f"获取特定API密钥测试失败: {e}")
                print_result("获取特定API密钥", False)
        
        # 4. 更新API密钥
        if test_resources["api_key_id"]:
            try:
                url = f"{BASE_URL}/keys/{test_resources['api_key_id']}"
                update_data = {
                    "description": "已更新描述",
                    "max_usage": 2000
                }
                response = self.session.put(url, json=update_data)
                data = response.json()
                
                success = (
                    response.status_code == 200 
                    and data.get("data", {}).get("description") == update_data["description"]
                    and data.get("data", {}).get("max_usage") == update_data["max_usage"]
                )
                print_result("更新API密钥", success, data if not success else None)
                
                if success:
                    success_count += 1
            except Exception as e:
                logger.error(f"更新API密钥测试失败: {e}")
                print_result("更新API密钥", False)
        
        # 5. 重置API密钥使用次数
        if test_resources["api_key_id"]:
            try:
                url = f"{BASE_URL}/keys/{test_resources['api_key_id']}/reset-usage"
                response = self.session.post(url)
                data = response.json()
                
                success = response.status_code == 200 and data.get("data", {}).get("current_usage") == 0
                print_result("重置API密钥使用次数", success, data if not success else None)
                
                if success:
                    success_count += 1
            except Exception as e:
                logger.error(f"重置API密钥使用次数测试失败: {e}")
                print_result("重置API密钥使用次数", False)
        
        return success_count == total_tests
    
    def test_tasks(self) -> bool:
        """测试抢券任务相关接口"""
        print_header("📋 抢券任务管理测试")
        success_count = 0
        total_tests = 5
        
        # 1. 获取任务列表
        try:
            url = f"{BASE_URL}/tasks"
            response = self.session.get(url)
            data = response.json()
            
            success = response.status_code == 200 and isinstance(data.get("items"), list)
            print_result("获取任务列表", success, data if not success else None)
            if success:
                success_count += 1
        except Exception as e:
            logger.error(f"获取任务列表测试失败: {e}")
            print_result("获取任务列表", False)
        
        # 2. 创建新任务
        try:
            url = f"{BASE_URL}/tasks"
            new_task = {
                "name": f"测试任务_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "post_url": "https://promotion.waimai.meituan.com/lottery/couponcomponent/fetchcomponent/v2?couponReferId=12345",
                "execution_time": "12:00:00:000",
                "frequency": 100,
                "requests_per_task": 3,
                "priority": 1,
                "is_active": True
            }
            response = self.session.post(url, json=new_task)
            data = response.json()
            
            success = response.status_code == 200 and data.get("data", {}).get("name") == new_task["name"]
            print_result("创建新任务", success, data if not success else None)
            
            if success:
                success_count += 1
                test_resources["task_id"] = data["data"]["id"]
        except Exception as e:
            logger.error(f"创建任务测试失败: {e}")
            print_result("创建新任务", False)
        
        # 3. 获取特定任务
        if test_resources["task_id"]:
            try:
                url = f"{BASE_URL}/tasks/{test_resources['task_id']}"
                response = self.session.get(url)
                data = response.json()
                
                success = response.status_code == 200 and data.get("data", {}).get("id") == test_resources["task_id"]
                print_result("获取特定任务", success, data if not success else None)
                
                if success:
                    success_count += 1
            except Exception as e:
                logger.error(f"获取特定任务测试失败: {e}")
                print_result("获取特定任务", False)
        
        # 4. 更新任务状态
        if test_resources["task_id"]:
            try:
                url = f"{BASE_URL}/tasks/{test_resources['task_id']}/status"
                update_data = {
                    "is_active": False
                }
                response = self.session.patch(url, json=update_data)
                data = response.json()
                
                success = response.status_code == 200 and data.get("data", {}).get("is_active") == False
                print_result("更新任务状态", success, data if not success else None)
                
                if success:
                    success_count += 1
            except Exception as e:
                logger.error(f"更新任务状态测试失败: {e}")
                print_result("更新任务状态", False)
        
        # 5. 删除任务
        if test_resources["task_id"]:
            try:
                url = f"{BASE_URL}/tasks/{test_resources['task_id']}"
                response = self.session.delete(url)
                data = response.json()
                
                success = response.status_code == 200 and data.get("msg") == "删除成功"
                print_result("删除任务", success, data if not success else None)
                
                if success:
                    success_count += 1
                    test_resources["task_id"] = None
            except Exception as e:
                logger.error(f"删除任务测试失败: {e}")
                print_result("删除任务", False)
        
        return success_count == total_tests
    
    def test_logs(self) -> bool:
        """测试访问日志相关接口"""
        print_header("📊 访问日志测试")
        success_count = 0
        total_tests = 3
        
        # 1. 获取最近日志
        try:
            url = f"{BASE_URL}/logs/recent?hours=24"
            response = self.session.get(url)
            data = response.json()
            
            success = response.status_code == 200 and isinstance(data.get("items"), list)
            print_result("获取最近日志", success, data if not success else None)
            if success:
                success_count += 1
        except Exception as e:
            logger.error(f"获取最近日志测试失败: {e}")
            print_result("获取最近日志", False)
        
        # 2. 获取特定API密钥的日志
        if test_resources["api_key_id"]:
            try:
                url = f"{BASE_URL}/logs/by-key/{test_resources['api_key_id']}"
                response = self.session.get(url)
                data = response.json()
                
                success = response.status_code == 200 and isinstance(data.get("items"), list)
                print_result("获取特定API密钥的日志", success, data if not success else None)
                
                if success:
                    success_count += 1
            except Exception as e:
                logger.error(f"获取特定API密钥的日志测试失败: {e}")
                print_result("获取特定API密钥的日志", False)
        else:
            print_result("获取特定API密钥的日志", False, {"msg": "没有测试API密钥ID"})
        
        # 3. 获取特定时间范围内的日志
        try:
            now = datetime.utcnow()
            yesterday = now - timedelta(days=1)
            url = f"{BASE_URL}/logs/time-range?start_time={yesterday.isoformat()}&end_time={now.isoformat()}"
            response = self.session.get(url)
            data = response.json()
            
            success = response.status_code == 200 and isinstance(data.get("items"), list)
            print_result("获取时间范围内的日志", success, data if not success else None)
            
            if success:
                success_count += 1
        except Exception as e:
            logger.error(f"获取时间范围内的日志测试失败: {e}")
            print_result("获取时间范围内的日志", False)
        
        return success_count == total_tests
    
    def cleanup(self) -> None:
        """清理测试数据"""
        print_header("🧹 清理测试数据")
        
        # 清理测试用户
        if test_resources["user_id"]:
            try:
                url = f"{BASE_URL}/users/{test_resources['user_id']}"
                response = self.session.delete(url)
                success = response.status_code == 200
                print_result("清理测试用户", success)
                if success:
                    test_resources["user_id"] = None
            except Exception:
                print_result("清理测试用户", False)
        
        # 清理测试API密钥
        if test_resources["api_key_id"]:
            try:
                url = f"{BASE_URL}/keys/{test_resources['api_key_id']}"
                response = self.session.delete(url)
                success = response.status_code == 200
                print_result("清理测试API密钥", success)
                if success:
                    test_resources["api_key_id"] = None
            except Exception:
                print_result("清理测试API密钥", False)
        
        # 清理测试任务
        if test_resources["task_id"]:
            try:
                url = f"{BASE_URL}/tasks/{test_resources['task_id']}"
                response = self.session.delete(url)
                success = response.status_code == 200
                print_result("清理测试任务", success)
                if success:
                    test_resources["task_id"] = None
            except Exception:
                print_result("清理测试任务", False)
    
    def run_all_tests(self) -> None:
        """运行所有测试"""
        if not self.login():
            logger.error("登录失败，无法继续测试")
            return
        
        if not self.test_me():
            logger.error("获取用户信息失败，无法继续测试")
            return
        
        test_results = [
            ("👥 用户管理测试", self.test_users()),
            ("🔑 API密钥管理测试", self.test_api_keys()),
            ("📋 抢券任务管理测试", self.test_tasks()),
            ("📊 访问日志测试", self.test_logs()),
        ]
        
        # 清理测试数据
        self.cleanup()
        
        # 打印测试总结
        print_header("📝 测试结果总结")
        for name, result in test_results:
            status = f"{EMOJI_PASS} 通过" if result else f"{EMOJI_FAIL} 失败"
            print(f"{name:<50} {status:>10}")
        
        # 统计成功率
        success_count = sum(1 for _, result in test_results if result)
        total_count = len(test_results)
        success_rate = success_count / total_count * 100 if total_count > 0 else 0
        
        print(f"\n{EMOJI_INFO} 总测试数: {total_count}, 成功: {success_count}, 失败: {total_count - success_count}")
        print(f"{EMOJI_INFO} 成功率: {success_rate:.1f}%")
        
        if success_count == total_count:
            print(f"\n{EMOJI_PASS} 恭喜！所有测试都通过了！")
        else:
            print(f"\n{EMOJI_WARN} 有一些测试未通过，请查看详细日志。")

if __name__ == "__main__":
    print_header("🚀 美团秒杀系统 API 测试")
    print(f"{EMOJI_INFO} 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{EMOJI_INFO} 基础URL: {BASE_URL}")
    
    tester = APITester()
    tester.run_all_tests() 