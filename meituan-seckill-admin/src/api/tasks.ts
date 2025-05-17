import api, { callApi } from './index'

export interface Task {
    id: number
    title: string
    description: string
    owner_id: number
    owner_name: string
    api_key_id: number
    api_key_name: string
    status: 'running' | 'paused' | 'completed' | 'failed'
    created_at: string
    updated_at: string
    cron_expression: string
    max_tries: number
    current_tries: number
    seckill_url: string
    expected_status: 'running' | 'paused' | 'completed' | 'failed'
}

export interface CreateTaskParams {
    title: string
    description: string
    api_key_id: number
    cron_expression: string
    max_tries: number
    seckill_url: string
}

export interface UpdateTaskParams {
    title?: string
    description?: string
    api_key_id?: number
    cron_expression?: string
    max_tries?: number
    seckill_url?: string
    status?: 'running' | 'paused' | 'completed' | 'failed'
}

// 获取任务列表
export const getTaskList = async () => {
    return callApi('get', '/tasks')
}

// 获取单个任务
export const getTask = async (id: number) => {
    return callApi('get', `/tasks/${id}`)
}

// 创建任务
export const createTask = async (params: CreateTaskParams) => {
    return callApi('post', '/tasks', params)
}

// 更新任务
export const updateTask = async (id: number, params: UpdateTaskParams) => {
    return callApi('put', `/tasks/${id}`, params)
}

// 删除任务
export const deleteTask = async (id: number) => {
    return callApi('delete', `/tasks/${id}`)
}

// 修改任务状态
export const updateTaskStatus = async (id: number, status: 'running' | 'paused') => {
    return callApi('patch', `/tasks/${id}/status`, { status })
} 