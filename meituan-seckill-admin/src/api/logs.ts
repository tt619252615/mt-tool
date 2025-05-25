import { callApi } from './index'

export interface Log {
    id: number
    task_id: number
    task_name: string
    status: 'success' | 'failure'
    message: string
    created_at: string
}

export interface LogFilterParams {
    task_id?: number
    status?: 'success' | 'failure'
    start_date?: string
    end_date?: string
}

// 获取日志列表
export const getLogList = async (params?: LogFilterParams) => {
    return callApi('get', '/logs', { params })
}

// 获取单个日志
export const getLog = async (id: number) => {
    return callApi('get', `/logs/${id}`)
}

// 删除日志
export const deleteLog = async (id: number) => {
    return callApi('delete', `/logs/${id}`)
}

// 清空所有日志
export const clearAllLogs = async () => {
    return callApi('delete', '/logs/clear-all')
}

// 获取最近日志
export const getRecentLogs = async (hours: number = 24) => {
    return callApi('get', '/logs/recent', { params: { hours } })
}

// 获取特定API密钥的日志
export const getLogsByKey = async (keyId: number) => {
    return callApi('get', '/logs/key', { params: { key_id: keyId } })
}

// 获取特定时间范围内的日志
export const getLogsByTimeRange = async (startTime: string, endTime: string) => {
    return callApi('get', '/logs/time-range', { params: { start_time: startTime, end_time: endTime } })
} 