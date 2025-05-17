import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Progress, Modal, Form, Input, InputNumber, Switch, message, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons'
import * as keysApi from '../../api/keys'

interface ApiKey {
    id: number
    key: string
    name: string
    description: string
    created_at: string
    updated_at: string
    max_usage: number
    current_usage: number
    is_active: boolean
}

interface CreateApiKeyParams {
    name: string
    description: string
    max_usage: number
}

interface UpdateApiKeyParams {
    name?: string
    description?: string
    max_usage?: number
    is_active?: boolean
}

const { Text } = Typography

const ApiKeyList = () => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
    const [loading, setLoading] = useState(false)
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [form] = Form.useForm()
    const [currentApiKey, setCurrentApiKey] = useState<ApiKey | null>(null)
    const [modalTitle, setModalTitle] = useState('创建API密钥')
    const [newApiKey, setNewApiKey] = useState<string>('')

    const fetchApiKeys = async () => {
        try {
            setLoading(true)
            const res = await keysApi.getApiKeyList()
            if (res && res.items) {
                setApiKeys(res.items)
            }
        } catch (error) {
            console.error('获取API密钥列表失败:', error)
            message.error('获取API密钥列表失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchApiKeys()
    }, [])

    const showCreateModal = () => {
        setCurrentApiKey(null)
        setModalTitle('创建API密钥')
        form.resetFields()
        setNewApiKey('')
        setIsModalVisible(true)
    }

    const showEditModal = (record: ApiKey) => {
        setCurrentApiKey(record)
        setModalTitle('编辑API密钥')
        form.setFieldsValue({
            name: record.name,
            description: record.description,
            max_usage: record.max_usage,
            is_active: record.is_active,
        })
        setNewApiKey('')
        setIsModalVisible(true)
    }

    const handleOk = async () => {
        try {
            const values = await form.validateFields()

            if (currentApiKey) {
                // 更新API密钥
                await keysApi.updateApiKey(currentApiKey.id, {
                    name: values.name,
                    description: values.description,
                    max_usage: values.max_usage,
                    is_active: values.is_active,
                })
                message.success('更新API密钥成功')
            } else {
                // 创建API密钥
                const params: CreateApiKeyParams = {
                    name: values.name,
                    description: values.description,
                    max_usage: values.max_usage,
                }
                const res = await keysApi.createApiKey(params)
                if (res && res.data && res.data.key) {
                    setNewApiKey(res.data.key)
                    message.success('创建API密钥成功')
                }
            }

            if (!newApiKey) {
                setIsModalVisible(false)
            }
            fetchApiKeys()
        } catch (error) {
            console.error('操作失败:', error)
            message.error('操作失败')
        }
    }

    const handleDelete = (id: number) => {
        console.log('删除API密钥按钮被点击，ID:', id);

        // 使用原生confirm，避免antd Modal可能的问题
        if (window.confirm('确定要删除这个API密钥吗？此操作不可恢复。')) {
            console.log('用户确认删除');
            try {
                // 使用立即执行的异步函数
                (async () => {
                    try {
                        console.log('执行删除操作，ID:', id);
                        const response = await keysApi.deleteApiKey(id);
                        console.log('删除API密钥响应:', response);
                        message.success('删除API密钥成功');
                        fetchApiKeys();
                    } catch (error) {
                        console.error('删除API密钥失败:', error);
                        message.error('删除API密钥失败，请稍后重试');
                    }
                })();
            } catch (error) {
                console.error('执行删除时出错:', error);
            }
        } else {
            console.log('用户取消删除');
        }
    };

    const handleResetUsage = (id: number) => {
        console.log('重置API密钥使用次数按钮被点击，ID:', id);

        // 使用原生confirm，避免antd Modal可能的问题
        if (window.confirm('确定要重置这个API密钥的使用次数吗？')) {
            console.log('用户确认重置');
            try {
                // 使用立即执行的异步函数
                (async () => {
                    try {
                        console.log('执行重置操作，ID:', id);
                        const response = await keysApi.resetApiKeyUsage(id);
                        console.log('重置API密钥使用次数响应:', response);
                        message.success('重置API密钥使用次数成功');
                        fetchApiKeys();
                    } catch (error) {
                        console.error('重置API密钥使用次数失败:', error);
                        message.error('重置API密钥使用次数失败，请稍后重试');
                    }
                })();
            } catch (error) {
                console.error('执行重置时出错:', error);
            }
        } else {
            console.log('用户取消重置');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(
            () => {
                message.success('复制成功')
            },
            () => {
                message.error('复制失败')
            }
        )
    }

    const columns = [
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: '描述',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: '使用情况',
            key: 'usage',
            render: (record: ApiKey) => (
                <div>
                    <Progress
                        percent={Math.round((record.current_usage / record.max_usage) * 100)}
                        size="small"
                        status={record.current_usage >= record.max_usage ? 'exception' : 'normal'}
                    />
                    <div>{record.current_usage} / {record.max_usage}</div>
                </div>
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
            render: (_: any, record: ApiKey) => (
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
                        type="primary"
                        icon={<ReloadOutlined />}
                        size="small"
                        onClick={() => {
                            console.log('点击重置按钮');
                            handleResetUsage(record.id);
                        }}
                    >
                        重置使用次数
                    </Button>
                    <Button
                        danger
                        type="primary"
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => {
                            console.log('点击删除按钮');
                            handleDelete(record.id);
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
                    创建API密钥
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={apiKeys}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={modalTitle}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
                footer={newApiKey ? [
                    <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={() => copyToClipboard(newApiKey)}>
                        复制密钥
                    </Button>,
                    <Button key="close" onClick={() => setIsModalVisible(false)}>
                        关闭
                    </Button>
                ] : undefined}
            >
                {newApiKey ? (
                    <div>
                        <p>请保存好您的API密钥，它不会再次显示：</p>
                        <Text copyable code style={{ wordBreak: 'break-all' }}>
                            {newApiKey}
                        </Text>
                    </div>
                ) : (
                    <Form
                        form={form}
                        layout="vertical"
                    >
                        <Form.Item
                            name="name"
                            label="名称"
                            rules={[{ required: true, message: '请输入名称' }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="描述"
                            rules={[{ required: true, message: '请输入描述' }]}
                        >
                            <Input.TextArea rows={3} />
                        </Form.Item>

                        <Form.Item
                            name="max_usage"
                            label="最大使用次数"
                            rules={[{ required: true, message: '请输入最大使用次数' }]}
                            initialValue={1000}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>

                        {currentApiKey && (
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
                )}
            </Modal>
        </div>
    )
}

export default ApiKeyList 