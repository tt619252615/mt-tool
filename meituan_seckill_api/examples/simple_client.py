#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
美团抢购系统API简易客户端示例
通过API密钥获取任务并格式化显示
"""

import requests
import json
import sys
from datetime import datetime

# 配置信息 - 请替换为您自己的API密钥
API_KEY = ""  # 从管理后台获取的API密钥
API_BASE_URL = "http://localhost:8000/api"  # API基础URL

def get_tasks(api_key):
    """获取所有任务"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    url = f"{API_BASE_URL}/tasks/api/list"
    
    print(f"请求URL: {url}")
    try:
        response = requests.get(url, headers=headers)
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("获取任务成功！")
            return data
        else:
            print(f"请求失败: {response.text}")
            return None
    except Exception as e:
        print(f"请求错误: {e}")
        return None

def print_task(task):
    """打印任务信息"""
    print("\n" + "="*50)
    print(f"任务ID: {task['id']}")
    print(f"名称: {task['name']}")
    print(f"URL: {task['post_url']}")
    print(f"执行时间: {task['execution_time']}")
    print(f"频率: {task['frequency']} 次/秒")
    print(f"每任务请求数: {task['requests_per_task']}")
    print(f"优先级: {task['priority']}")
    print(f"状态: {'启用' if task['is_active'] else '禁用'}")
    print(f"创建时间: {task['created_at']}")
    print("="*50)

def main():
    global API_KEY
    
    # 从命令行获取API密钥
    if len(sys.argv) > 1:
        API_KEY = sys.argv[1]
    
    if not API_KEY:
        API_KEY = input("请输入API密钥: ")
    
    if not API_KEY:
        print("错误: 未提供API密钥")
        return 1
    
    print(f"使用API密钥: {API_KEY[:4]}...{API_KEY[-4:] if len(API_KEY) > 8 else ''}")
    
    # 获取任务
    result = get_tasks(API_KEY)
    
    if not result:
        print("获取任务失败")
        return 1
    
    # 提取任务列表
    tasks = result.get('data', {}).get('items', [])
    
    if not tasks:
        print("没有任务")
        return 0
    
    # 显示任务
    print(f"\n找到 {len(tasks)} 个任务:")
    
    for task in tasks:
        print_task(task)
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 