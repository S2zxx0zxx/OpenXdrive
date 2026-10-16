import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Empty, Row, Skeleton, Space, Statistic, Timeline, Typography } from 'antd'
import { ClockCircleOutlined, FileAddOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/drive/PageHeader'
import { FileTable } from '@/components/drive/FileTable'
import { apiFetch, formatDate } from '@/lib/api'
import { toFileItem, type FileResponse } from '@/lib/file-presentation'

type EventRow = { id: string; action: string; entityType: string; createdAt: string; metadata?: unknown }
export function RecentPage() {
  const [files,setFiles] = useState<FileResponse[]>([])
  const [events,setEvents] = useState<EventRow[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  async function load() {
    setLoading(true);setError('')
    try {
      const [f,e]=await Promise.all([
        apiFetch<{ files: FileResponse[] }>('/files'),
        apiFetch<{ logs: EventRow[] }>('/audit-logs'),
      ])
      setFiles(f.files);setEvents(e.logs)
    } catch(err) { setError(err instanceof Error?err.message:'Could not load recent activity') }
    finally { setLoading(false) }
  }
  useEffect(()=>{load().catch(()=>undefined)},[])
  return <>
    <PageHeader title="Recent activity" description="Your latest uploads and actual workspace events." actions={<Button icon={<ReloadOutlined />} onClick={()=>load()} loading={loading}>Refresh</Button>} />
    {error && <Alert type="error" showIcon message={error} style={{marginBottom:18}} />}
    <Row gutter={[16,16]} style={{marginBottom:20}}>
      <Col xs={12} md={8}><Card><Statistic title="Active files" value={files.length} prefix={<FileAddOutlined />} /></Card></Col>
      <Col xs={12} md={8}><Card><Statistic title="Recorded events" value={events.length} prefix={<HistoryOutlined />} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Latest event" value={events[0] ? formatDate(events[0].createdAt) : 'None'} valueStyle={{fontSize:17}} prefix={<ClockCircleOutlined />} /></Card></Col>
    </Row>
    <Card title="Workspace timeline" style={{marginBottom:18}}>
      {loading?<Skeleton active paragraph={{rows:3}} />:events.length===0?<Empty description="No recorded activity yet" />:
        <Timeline items={events.slice(0,8).map(e=>({ color:'blue', children:<Space direction="vertical" size={1}><Typography.Text strong>{e.action.replaceAll('_',' ')}</Typography.Text><Typography.Text type="secondary">{e.entityType} · {formatDate(e.createdAt)}</Typography.Text></Space> }))} />}
    </Card>
    <Card title="Recently added files" extra={<Typography.Text type="secondary">{files.length} total</Typography.Text>}>
      {loading?<Skeleton active paragraph={{rows:5}} />:<FileTable files={files.slice(0,30).map(toFileItem)} />}
    </Card>
  </>
}
