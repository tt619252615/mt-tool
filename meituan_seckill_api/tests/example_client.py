#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
美团抢购系统API客户端示例
演示如何使用API密钥直接获取任务，无需登录
"""

import sys
import json
import requests
from datetime import datetime
import argparse

# 配置信息
API_BASE_URL = "http://localhost:8000/api"  # 修改为你的API基础URL
API_KEY = ""  # 将此替换为你创建的API密钥

def get_active_tasks(api_key, base_url=None):
    """使用API密钥获取活跃任务列表"""
    if base_url is None:
        base_url = API_BASE_URL
        
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    url = f"{base_url}/tasks/api/active"
    
    try:
        print(f"请求URL: {url}")
        print(f"请求头: {headers}")
        response = requests.get(url, headers=headers)
        
        # 打印完整的响应信息以便调试
        print(f"状态码: {response.status_code}")
        print(f"响应头: {response.headers}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"响应成功: {json.dumps(data, indent=2, ensure_ascii=False)}")
            return data.get('data', [])
        else:
            print(f"请求失败: {response.text}")
            return None
    except Exception as e:
        print(f"请求发生错误: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description='美团抢购系统API客户端示例')
    parser.add_argument('--key', required=False, help='API密钥')
    parser.add_argument('--url', default='http://localhost:8000/api', help='API服务器地址')
    
    args = parser.parse_args()
    
    # 如果命令行没有提供API密钥，则使用全局变量中的密钥
    api_key = args.key if args.key else API_KEY
    
    print(f"===== 美团抢购系统API客户端示例 =====")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API服务器: {args.url}")
    print(f"API密钥: {api_key[:4]}...{api_key[-4:] if len(api_key) > 8 else ''}")
    print("=====================================")
    
    # 获取活跃任务
    print("\n=== 获取活跃任务 ===")
    tasks = get_active_tasks(api_key, args.url)
    
    if tasks is None:
        print("获取任务失败!")
        return 1
        
    print(f"\n成功获取 {len(tasks)} 个活跃任务:")
    
    for i, task in enumerate(tasks, 1):
        print(f"\n任务 #{i}:")
        print(f"  ID: {task.get('id')}")
        print(f"  名称: {task.get('name')}")
        print(f"  URL: {task.get('post_url')}")
        print(f"  执行时间: {task.get('execution_time')}")
        print(f"  频率: {task.get('frequency')} 次/秒")
        print(f"  每任务请求数: {task.get('requests_per_task')}")
        print(f"  优先级: {task.get('priority')}")
        print(f"  状态: {'启用' if task.get('is_active') else '禁用'}")
        print(f"  创建时间: {task.get('created_at')}")
        
    print("\n示例：你可以使用上面的URL执行实际的抢购操作")
    

    print(f"  状态: {'启用' if task.get('is_active') else '禁用'}")
    
    return 0

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] != '--key' and sys.argv[1] != '--url':
        # 如果提供了命令行参数，且不是参数标志，使用它作为API密钥
        API_KEY = sys.argv[1]
    
    if not API_KEY and len(sys.argv) == 1:
        print("请提供API密钥作为命令行参数，或在脚本中设置API_KEY变量")
        sys.exit(1)
    
    sys.exit(main()) 