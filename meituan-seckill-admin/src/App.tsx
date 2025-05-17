import { Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

// 导入布局和页面组件
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import UserList from './pages/users/UserList'
import ApiKeyList from './pages/keys/ApiKeyList'
import TaskList from './pages/tasks/TaskList'
import LogList from './pages/logs/LogList'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

// 导入验证相关组件
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
    return (
        <ConfigProvider locale={zhCN}>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route path="/" element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Dashboard />} />
                        <Route path="users" element={<UserList />} />
                        <Route path="keys" element={<ApiKeyList />} />
                        <Route path="tasks" element={<TaskList />} />
                        <Route path="logs" element={<LogList />} />
                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </ConfigProvider>
    )
}

export default App 