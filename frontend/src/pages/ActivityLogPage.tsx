import { useEffect, useState } from 'react'
import { Alert, Button, Card, Empty, Space, Table, Tag, Typography, type TableColumnsType } from 'antd'
import { ReloadOutlined, HistoryOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/drive/PageHeader'
import { apiFetch, formatDate } from '@/lib/api'

type AuditLog = { id:string;action:string;entityType:string;entityId:string|null;metadata:unknown;createdAt:string }
function metadataSummary(raw:unknown) {
  if (raw == null) return '—'
  let data: unknown = raw
  if (typeof raw === 'string') {
    try {data=JSON.parse(raw)}catch{return raw.slice(0,200)}
  }
  if (typeof data !== 'object' || !data) return String(data)
  const obj=data as Record<string,unknown>
  return ['name','fileName','folderName','count'].map(k=>obj[k] == null?'':`${k}: ${String(obj[k])}`).filter(Boolean).join(' · ') || 'Additional metadata'
}
function actionColor(action:string) {
  if (/DELETE|TRASH/i.test(action))return 'red'
  if (/CREATE|UPLOAD/i.test(action))return 'green'
  if (/SYNC|RESTORE/i.test(action))return 'gold'
  return 'blue'
}
export function ActivityLogPage() {
  const [logs,setLogs] = useState<AuditLog[]>([])
  const [loading,setLoading] = useState(false)
  const [error,setError] = useState('')
  async function load() {
    setLoading(true);setError('')
    try {const response=await apiFetch<{logs:AuditLog[]}>('/audit-logs');setLogs(response.logs)}
    catch(e){setError(e instanceof Error?e.message:'Activity unavailable')}
    finally{setLoading(false)}
  }
  useEffect(()=>{load().catch(()=>undefined)},[])
  const columns:TableColumnsType<AuditLog>=[
    {title:'Event',dataIndex:'action',key:'action',render:(v:string)=><Tag bordered={false} color={actionColor(v)}>{v.replaceAll('_',' ')}</Tag>,filters:[{text:'Uploads',value:'UPLOAD'},{text:'Deletion',value:'DELETE'},{text:'Sync',value:'SYNC'}],
      onFilter:(v,record)=>record.action.includes(String(v))},
    {title:'Resource',dataIndex:'entityType',key:'entityType',render:(v:string)=><Typography.Text style={{textTransform:'capitalize'}}>{v}</Typography.Text>},
    {title:'Details',dataIndex:'metadata',key:'metadata',render:(_:unknown,row)=><Typography.Text type="secondary" ellipsis style={{maxWidth:350,display:'block'}}>{metadataSummary(row.metadata)}</Typography.Text>},
    {title:'Time',dataIndex:'createdAt',key:'createdAt',sorter:(a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime(),
      defaultSortOrder:'descend',render:(v:string)=>formatDate(v)},
  ]
  return <>
    <PageHeader title="Activity log" description="Auditable file and folder operations recorded for your account."
      actions={<Button icon={<ReloadOutlined />} onClick={()=>load()} loading={loading}>Refresh</Button>} />
    {error && <Alert type="error" showIcon message={error} style={{marginBottom:18}} />}
    <Card title={<Space><HistoryOutlined />Event history</Space>} extra={<Typography.Text type="secondary">{logs.length} events</Typography.Text>}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={logs} scroll={{x:730}}
        pagination={{pageSize:20,showSizeChanger:true,pageSizeOptions:['20','50','100']}}
        locale={{emptyText:<Empty description="Actions on your files and folders will appear here" />}} />
    </Card>
  </>
}
