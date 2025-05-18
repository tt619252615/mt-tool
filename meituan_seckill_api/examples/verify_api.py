#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
美团抢购系统API验证工具
用于验证API密钥和任务接口
"""

import requests
import json
import sys
import argparse
from datetime import datetime
import time

# 默认配置
DEFAULT_API_URL = "http://localhost:8000/api"

def print_header(title):
    """打印带有格式的标题"""
    print("\n" + "="*80)
    print(f" {title}")
    print("="*80)

def test_api_key(api_key, base_url):
    """测试API密钥是否有效"""
    print_header("测试API密钥")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    url = f"{base_url}/auth/verify-key"
    
    print(f"请求URL: {url}")
    print(f"请求头: Authorization: Bearer {api_key[:4]}...{api_key[-4:]}")
    
    try:
        response = requests.get(url, headers=headers)
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("API密钥验证成功！")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return True
        else:
            print(f"API密钥验证失败: {response.text}")
            return False
    except Exception as e:
        print(f"请求错误: {e}")
        return False

def get_tasks(api_key, base_url):
    """获取任务列表"""
    print_header("获取任务列表")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    url = f"{base_url}/tasks/api/list"
    
    print(f"请求URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("获取任务列表成功！")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return data
        else:
            print(f"获取任务列表失败: {response.text}")
            return None
    except Exception as e:
        print(f"请求错误: {e}")
        return None

def get_active_tasks(api_key, base_url):
    """获取活跃任务"""
    print_header("获取活跃任务")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    url = f"{base_url}/tasks/api/active"
    
    print(f"请求URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("获取活跃任务成功！")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return data
        else:
            print(f"获取活跃任务失败: {response.text}")
            return None
    except Exception as e:
        print(f"请求错误: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description='美团抢购系统API验证工具')
    parser.add_argument('--key', required=True, help='API密钥')
    parser.add_argument('--url', default=DEFAULT_API_URL, help='API服务器基础URL')
    
    args = parser.parse_args()
    
    print_header("API验证工具")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API服务器: {args.url}")
    print(f"API密钥: {args.key[:4]}...{args.key[-4:] if len(args.key) > 8 else ''}")
    
    # 测试API密钥
    if not test_api_key(args.key, args.url):
        print("API密钥验证失败，无法继续测试")
        return 1
    
    # 等待一秒，避免请求过快
    time.sleep(1)
    
    # 获取任务列表
    tasks_data = get_tasks(args.key, args.url)
    
    if not tasks_data:
        print("获取任务列表失败")
        return 1
    
    # 等待一秒，避免请求过快
    time.sleep(1)
    
    # 获取活跃任务
    active_tasks = get_active_tasks(args.key, args.url)
    
    if not active_tasks:
        print("获取活跃任务失败")
        return 1
    
    print_header("验证完成")
    print("所有API测试成功完成！")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 