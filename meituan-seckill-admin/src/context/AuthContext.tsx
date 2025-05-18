import { createContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { message } from 'antd'
import { getCurrentUser } from '../api/user'

interface AuthContextType {
    isAuthenticated: boolean
    user: any | null
    loading: boolean
    login: (token: string) => void
    logout: () => void
}

export const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    user: null,
    loading: true,
    login: () => { },
    logout: () => { },
})

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState<boolean>(true)

    // 获取用户信息的函数
    const fetchUserInfo = async () => {
        const token = localStorage.getItem('token')
        if (!token) {
            setLoading(false)
            return
        }

        try {
            const userData = await getCurrentUser()
            // 确保userData有效
            if (userData && userData.data && userData.data.username) {
                setUser(userData.data)
                setIsAuthenticated(true)
            } else {
                console.error('获取用户信息失败: 无效的用户数据')
                localStorage.removeItem('token')
                setIsAuthenticated(false)
            }
        } catch (error) {
            console.error('验证令牌失败:', error)
            localStorage.removeItem('token')
            setIsAuthenticated(false)
        } finally {
            setLoading(false)
        }
    }

    // 组件挂载时检查认证状态
    useEffect(() => {
        fetchUserInfo()
    }, [])

    const login = (token: string) => {
        localStorage.setItem('token', token)
        setIsAuthenticated(true)

        // 获取用户信息
        fetchUserInfo()
            .catch((error) => {
                console.error('获取用户信息失败:', error)
                message.error('获取用户信息失败')
                setIsAuthenticated(false)
            })
    }

    const logout = () => {
        localStorage.removeItem('token')
        setIsAuthenticated(false)
        setUser(null)
        message.success('已成功退出登录')
    }

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                user,
                loading,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
} 