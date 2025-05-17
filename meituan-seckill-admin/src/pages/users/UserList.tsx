import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Switch, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleFilled } from '@ant-design/icons'
import * as userApi from '../../api/user'

interface User {
    id: number
    username: string
    is_admin: boolean
    is_active: boolean
    created_at: string
}

interface CreateUserParams {
    username: string
    password: string
    is_admin: boolean
}

const UserList = () => {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(false)
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [form] = Form.useForm()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [modalTitle, setModalTitle] = useState('创建用户')

    // 添加删除确认对话框相关状态
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteUsername, setDeleteUsername] = useState<string>('');

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const res = await userApi.getUserList()
            if (res && res.items) {
                setUsers(res.items)
            }
        } catch (error) {
            console.error('获取用户列表失败:', error)
            message.error('获取用户列表失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const showCreateModal = () => {
        setCurrentUser(null)
        setModalTitle('创建用户')
        form.resetFields()
        setIsModalVisible(true)
    }

    const showEditModal = (record: User) => {
        setCurrentUser(record)
        setModalTitle('编辑用户')
        form.setFieldsValue({
            username: record.username,
            is_admin: record.is_admin,
            is_active: record.is_active,
        })
        setIsModalVisible(true)
    }

    const handleOk = async () => {
        try {
            const values = await form.validateFields()

            if (currentUser) {
                // 更新用户
                await userApi.updateUser(currentUser.id, {
                    is_admin: values.is_admin,
                    is_active: values.is_active,
                })
                message.success('更新用户成功')
            } else {
                // 创建用户
                const params: CreateUserParams = {
                    username: values.username,
                    password: values.password,
                    is_admin: values.is_admin,
                }
                await userApi.createUser(params)
                message.success('创建用户成功')
            }

            setIsModalVisible(false)
            fetchUsers()
        } catch (error) {
            console.error('操作失败:', error)
            message.error('操作失败')
        }
    }

    const handleDelete = (id: number, username: string) => {
        console.log('删除按钮被点击，ID:', id, '用户名:', username);
        setDeleteId(id);
        setDeleteUsername(username);
        setDeleteConfirmVisible(true);
    };

    const confirmDelete = async () => {
        if (deleteId === null) return;

        try {
            console.log('执行删除操作，ID:', deleteId);
            const response = await userApi.deleteUser(deleteId);
            console.log('删除用户响应:', response);
            message.success('删除用户成功');
            fetchUsers();
        } catch (error) {
            console.error('删除用户失败:', error);
            message.error('删除用户失败，请稍后重试');
        } finally {
            setDeleteConfirmVisible(false);
            setDeleteId(null);
            setDeleteUsername('');
        }
    };

    const columns = [
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: '管理员',
            dataIndex: 'is_admin',
            key: 'is_admin',
            render: (isAdmin: boolean) => (
                isAdmin ? <Tag color="blue">是</Tag> : <Tag color="default">否</Tag>
            ),
        },
        {
            title: '状态',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (isActive: boolean) => (
                isActive ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>
            ),
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (text: string) => new Date(text).toLocaleString(),
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: User) => (
                <Space size="middle">
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => showEditModal(record)}
                    >
                        编辑
                    </Button>
                    <Button
                        danger
                        type="primary"
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => {
                            console.log('点击删除按钮');
                            handleDelete(record.id, record.username);
                        }}
                    >
                        删除
                    </Button>
                </Space>
            ),
        },
    ]

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showCreateModal}
                >
                    创建用户
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={modalTitle}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
            >
                <Form
                    form={form}
                    layout="vertical"
                >
                    {!currentUser && (
                        <>
                            <Form.Item
                                name="username"
                                label="用户名"
                                rules={[{ required: true, message: '请输入用户名' }]}
                            >
                                <Input />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                label="密码"
                                rules={[{ required: true, message: '请输入密码' }]}
                            >
                                <Input.Password />
                            </Form.Item>
                        </>
                    )}

                    <Form.Item
                        name="is_admin"
                        label="管理员"
                        valuePropName="checked"
                        initialValue={false}
                    >
                        <Switch />
                    </Form.Item>

                    {currentUser && (
                        <Form.Item
                            name="is_active"
                            label="启用状态"
                            valuePropName="checked"
                            initialValue={true}
                        >
                            <Switch />
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ExclamationCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />
                        <span>确认删除</span>
                    </div>
                }
                open={deleteConfirmVisible}
                onOk={confirmDelete}
                onCancel={() => setDeleteConfirmVisible(false)}
                okText="确认删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
            >
                <div style={{ padding: '20px 0' }}>
                    <p>您确定要删除以下用户吗？</p>
                    <p style={{ fontWeight: 'bold', margin: '10px 0' }}>{deleteUsername}</p>
                    <p style={{ color: '#ff4d4f' }}>警告：此操作不可恢复，删除后用户数据将永久丢失！</p>
                </div>
            </Modal>
        </div>
    )
}

export default UserList 