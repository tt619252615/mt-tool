import { callApi } from './index'

export interface User {
    id: number
    username: string
    is_admin: boolean
    is_active: boolean
    created_at: string
}

export interface CreateUserParams {
    username: string
    password: string
    is_admin: boolean
}

export interface UpdateUserParams {
    is_active?: boolean
    is_admin?: boolean
}

// 获取用户列表
export const getUserList = async () => {
    return callApi('get', '/users')
}

// 获取单个用户
export const getUser = async (id: number) => {
    return callApi('get', `/users/${id}`)
}

// 创建用户
export const createUser = async (params: CreateUserParams) => {
    return callApi('post', '/users', params)
}

// 更新用户
export const updateUser = async (id: number, params: UpdateUserParams) => {
    return callApi('put', `/users/${id}`, params)
}

// 删除用户
export const deleteUser = async (id: number) => {
    return callApi('delete', `/users/${id}`)
}

// 获取当前用户信息
export const getCurrentUser = async () => {
    return callApi('get', '/auth/me')
}

// 用户登录
export const login = async (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    return callApi('post', '/auth/login', formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })
} 