# API密钥使用指南

本指南演示如何使用API密钥访问美团抢券系统的API，获取任务信息并执行抢券操作。

## API密钥认证

在所有API请求中，需要在HTTP请求头中添加`Authorization: Bearer YOUR_API_KEY`，其中`YOUR_API_KEY`是在管理后台创建的API密钥。

## 主要API端点

### 获取活跃任务列表

```
GET /api/tasks/api/active
```

### 获取所有任务列表

```
GET /api/tasks/api/list
```

## 编程语言示例

### Python

```python
import requests

def get_active_tasks(api_key, base_url="http://localhost:8000/api"):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{base_url}/tasks/api/active", headers=headers)
    
    if response.status_code == 200:
        return response.json().get('data', [])
    else:
        print(f"请求失败: {response.text}")
        return None

# 使用示例
api_key = "your_api_key_here"
tasks = get_active_tasks(api_key)

for task in tasks:
    print(f"任务ID: {task['id']}")
    print(f"名称: {task['name']}")
    print(f"URL: {task['post_url']}")
    print(f"执行时间: {task['execution_time']}")
    # 根据任务信息执行抢券操作
```

### JavaScript

```javascript
async function getActiveTasks(apiKey, baseUrl = "http://localhost:8000/api") {
  try {
    const response = await fetch(`${baseUrl}/tasks/api/active`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('获取任务失败:', error);
    return null;
  }
}

// 使用示例
const apiKey = "your_api_key_here";

getActiveTasks(apiKey).then(tasks => {
  if (tasks) {
    tasks.forEach(task => {
      console.log(`任务ID: ${task.id}`);
      console.log(`名称: ${task.name}`);
      console.log(`URL: ${task.post_url}`);
      console.log(`执行时间: ${task.execution_time}`);
      // 根据任务信息执行抢券操作
    });
  }
});
```

### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import org.json.JSONObject;
import org.json.JSONArray;

public class TaskClient {
    
    public static JSONArray getActiveTasks(String apiKey, String baseUrl) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/tasks/api/active"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .GET()
            .build();
            
        HttpResponse<String> response = client.send(request, 
            HttpResponse.BodyHandlers.ofString());
            
        if (response.statusCode() != 200) {
            throw new RuntimeException("API请求失败: " + response.body());
        }
        
        JSONObject jsonResponse = new JSONObject(response.body());
        return jsonResponse.getJSONArray("data");
    }
    
    public static void main(String[] args) {
        try {
            String apiKey = "your_api_key_here";
            String baseUrl = "http://localhost:8000/api";
            
            JSONArray tasks = getActiveTasks(apiKey, baseUrl);
            
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject task = tasks.getJSONObject(i);
                System.out.println("任务ID: " + task.getInt("id"));
                System.out.println("名称: " + task.getString("name"));
                System.out.println("URL: " + task.getString("post_url"));
                System.out.println("执行时间: " + task.getString("execution_time"));
                // 根据任务信息执行抢券操作
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

## 返回的任务数据格式

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 3,
      "name": "test",
      "post_url": "https://pypi.org/project/pydantic-settings/",
      "execution_time": "18:04:04:400",
      "frequency": 100,
      "requests_per_task": 3,
      "priority": 1,
      "is_active": true,
      "created_at": "2025-05-17T10:20:28",
      "updated_at": null
    }
  ]
}
```

## 常见错误处理

- 401 Unauthorized: API密钥无效或缺失
- 403 Forbidden: API密钥已禁用或使用次数已达上限
- 429 Too Many Requests: 请求频率过高
- 500 Internal Server Error: 服务器内部错误

## 实际应用示例

请查看`example_client.py`文件，该文件提供了一个完整的Python示例，演示如何使用API密钥获取任务并执行操作。 