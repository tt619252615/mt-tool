import { useContext } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { AuthContext } from '../context/AuthContext'

interface ProtectedRouteProps {
    children: JSX.Element
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { isAuthenticated, loading } = useContext(AuthContext)
    const location = useLocation()

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" tip="加载中..." />
            </div>
        )
    }

    if (!isAuthenticated) {
        // 重定向到登录页面，但保存当前尝试访问的位置
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return children
}

export default ProtectedRoute 