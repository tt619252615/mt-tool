import { useState, useEffect } from 'react'
import { Table, Card, Row, Col, DatePicker, Button, Space, Tag, Select, Form } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import * as logsApi from '../../api/logs'
import * as keysApi from '../../api/keys'

interface Log {
    id: number
    api_key_id: number
    request_path: string
    request_method: string
    request_ip: string
    request_time: string
    response_status: number
    response_time: number
    user_agent: string
}

interface ApiKey {
    id: number
    name: string
    key: string
}

const { RangePicker } = DatePicker

const OperationLogList = () => {
    const [logs, setLogs] = useState<Log[]>([])
    const [loading, setLoading] = useState(false)
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
    const [form] = Form.useForm()
    const [searchType, setSearchType] = useState<'recent' | 'key' | 'timeRange'>('recent')

    // 获取最近日志（默认24小时）
    const fetchRecentLogs = async (hours: number = 24) => {
        try {
            setLoading(true)
            const res = await logsApi.getRecentLogs(hours)
            if (res && (res as any).items) {
                setLogs((res as any).items)
            }
        } catch (error) {
            console.error('获取最近日志失败:', error)
        } finally {
            setLoading(false)
        }
    }

    // 获取特定API密钥的日志
    const fetchLogsByKey = async (keyId: number) => {
        try {
            setLoading(true)
            const res = await logsApi.getLogsByKey(keyId)
            if (res && (res as any).items) {
                setLogs((res as any).items)
            }
        } catch (error) {
            console.error('获取API密钥日志失败:', error)
        } finally {
            setLoading(false)
        }
    }

    // 获取特定时间范围内的日志
    const fetchLogsByTimeRange = async (startTime: string, endTime: string) => {
        try {
            setLoading(true)
            const res = await logsApi.getLogsByTimeRange(startTime, endTime)
            if (res && (res as any).items) {
                setLogs((res as any).items)
            }
        } catch (error) {
            console.error('获取时间范围内日志失败:', error)
        } finally {
            setLoading(false)
        }
    }

    // 获取所有API密钥
    const fetchApiKeys = async () => {
        try {
            const res = await keysApi.getApiKeyList()
            if (res && (res as any).items) {
                setApiKeys((res as any).items)
            }
        } catch (error) {
            console.error('获取API密钥列表失败:', error)
        }
    }

    useEffect(() => {
        fetchRecentLogs()
        fetchApiKeys()
    }, [])

    const handleSearch = async (values: any) => {
        if (searchType === 'recent') {
            await fetchRecentLogs(values.hours || 24)
        } else if (searchType === 'key') {
            if (values.keyId) {
                await fetchLogsByKey(values.keyId)
            }
        } else if (searchType === 'timeRange') {
            if (values.timeRange && values.timeRange.length === 2) {
                const startTime = values.timeRange[0].toISOString()
                const endTime = values.timeRange[1].toISOString()
                await fetchLogsByTimeRange(startTime, endTime)
            }
        }
    }

    const handleReset = () => {
        form.resetFields()
        setSearchType('recent')
        fetchRecentLogs()
    }

    const columns = [
        {
            title: 'API密钥ID',
            dataIndex: 'api_key_id',
            key: 'api_key_id',
        },
        {
            title: '请求路径',
            dataIndex: 'request_path',
            key: 'request_path',
            ellipsis: true,
        },
        {
            title: '请求方法',
            dataIndex: 'request_method',
            key: 'request_method',
            render: (method: string) => {
                let color = 'default'
                switch (method.toUpperCase()) {
                    case 'GET':
                        color = 'blue'
                        break
                    case 'POST':
                        color = 'green'
                        break
                    case 'PUT':
                        color = 'orange'
                        break
                    case 'DELETE':
                        color = 'red'
                        break
                    default:
                        color = 'default'
                }
                return <Tag color={color}>{method.toUpperCase()}</Tag>
            },
        },
        {
            title: '请求IP',
            dataIndex: 'request_ip',
            key: 'request_ip',
        },
        {
            title: '请求时间',
            dataIndex: 'request_time',
            key: 'request_time',
            render: (text: string) => new Date(text).toLocaleString(),
        },
        {
            title: '响应状态',
            dataIndex: 'response_status',
            key: 'response_status',
            render: (status: number) => {
                let color = 'default'
                if (status >= 200 && status < 300) {
                    color = 'green'
                } else if (status >= 400 && status < 500) {
                    color = 'orange'
                } else if (status >= 500) {
                    color = 'red'
                }
                return <Tag color={color}>{status}</Tag>
            },
        },
        {
            title: '响应时间(ms)',
            dataIndex: 'response_time',
            key: 'response_time',
        },
        {
            title: '用户代理',
            dataIndex: 'user_agent',
            key: 'user_agent',
            ellipsis: true,
        },
    ]

    return (
        <div>
            <Card style={{ marginBottom: 16 }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSearch}
                    initialValues={{ hours: 24 }}
                >
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item label="查询类型">
                                <Select
                                    value={searchType}
                                    onChange={setSearchType}
                                    options={[
                                        { label: '最近日志', value: 'recent' },
                                        { label: '按API密钥查询', value: 'key' },
                                        { label: '按时间范围查询', value: 'timeRange' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>

                        {searchType === 'recent' && (
                            <Col span={8}>
                                <Form.Item name="hours" label="最近小时数">
                                    <Select
                                        options={[
                                            { label: '最近6小时', value: 6 },
                                            { label: '最近12小时', value: 12 },
                                            { label: '最近24小时', value: 24 },
                                            { label: '最近48小时', value: 48 },
                                        ]}
                                    />
                                </Form.Item>
                            </Col>
                        )}

                        {searchType === 'key' && (
                            <Col span={8}>
                                <Form.Item name="keyId" label="API密钥">
                                    <Select
                                        placeholder="选择API密钥"
                                        options={apiKeys.map(key => ({ label: key.name, value: key.id }))}
                                    />
                                </Form.Item>
                            </Col>
                        )}

                        {searchType === 'timeRange' && (
                            <Col span={8}>
                                <Form.Item name="timeRange" label="时间范围">
                                    <RangePicker showTime style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        )}

                        <Col span={8}>
                            <Form.Item label=" " colon={false}>
                                <Space>
                                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                                        搜索
                                    </Button>
                                    <Button onClick={handleReset} icon={<ReloadOutlined />}>
                                        重置
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            <Card>
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showQuickJumper: true,
                        showSizeChanger: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                    }}
                />
            </Card>
        </div>
    )
}

export default OperationLogList 