import { callApi } from './index'

export interface Task {
    id: number
    name: string
    post_url: string
    execution_time: string  // 格式: "HH:MM:SS:mmm"
    frequency: number
    requests_per_task: number
    priority: number
    is_active: boolean
    created_at: string
    updated_at: string | null
}

export interface TaskListResponse {
    items: Task[]
    total: number
    page: number
    size: number
}

export interface CreateTaskParams {
    name: string
    post_url: string
    execution_time: string  // 格式: "HH:MM:SS:mmm"
    frequency: number
    requests_per_task: number
    priority: number
    is_active: boolean
}

export interface UpdateTaskParams {
    name: string
    post_url: string
    execution_time: string
    frequency: number
    requests_per_task: number
    priority: number
    is_active: boolean
}

export interface UpdateTaskStatusParams {
    is_active: boolean
}

// 获取任务列表
export const getTaskList = async () => {
    console.log('调用getTaskList API');
    try {
        const response = await callApi('get', '/tasks');
        console.log('获取任务列表原始响应:', response);
        return response;
    } catch (error) {
        console.error('getTaskList API错误:', error);
        throw error;
    }
}

// 获取单个任务
export const getTask = async (id: number) => {
    return await callApi('get', `/tasks/${id}`);
}

// 创建任务
export const createTask = async (params: CreateTaskParams) => {
    console.log('创建任务参数:', params);
    try {
        const response = await callApi('post', '/tasks', params);
        console.log('创建任务响应:', response);
        return response;
    } catch (error) {
        console.error('创建任务错误:', error);
        throw error;
    }
}

// 更新任务
export const updateTask = async (id: number, params: UpdateTaskParams) => {
    console.log('更新任务参数:', id, params);
    try {
        const response = await callApi('put', `/tasks/${id}`, params);
        console.log('更新任务响应:', response);
        return response;
    } catch (error) {
        console.error('更新任务错误:', error);
        throw error;
    }
}

// 删除任务
export const deleteTask = async (id: number) => {
    console.log('删除任务ID:', id);
    try {
        const response = await callApi('delete', `/tasks/${id}`);
        console.log('删除任务响应:', response);
        return response;
    } catch (error) {
        console.error('删除任务错误:', error);
        throw error;
    }
}

// 修改任务状态
export const updateTaskStatus = async (id: number, params: UpdateTaskStatusParams) => {
    console.log('更新任务状态参数:', id, params);
    try {
        const response = await callApi('patch', `/tasks/${id}/status`, params);
        console.log('更新任务状态响应:', response);
        return response;
    } catch (error) {
        console.error('更新任务状态错误:', error);
        throw error;
    }
} 