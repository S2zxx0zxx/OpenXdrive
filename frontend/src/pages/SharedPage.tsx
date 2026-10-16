import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, Col, Empty, Row, Space, Statistic, Table, Tag, Typography, type TableColumnsType } from 'antd'
import { DeleteOutlined, FileOutlined, FolderOutlined, ShareAltOutlined, TeamOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/drive/PageHeader'
import { apiFetch, formatBytes, formatDate } from '@/lib/api'

type Target = { id:string;name:string;type:'file'|'folder';mimeType?:string;sizeBytes?:string }
type Invite = {
 id:string; email:string; role:string;status:string;targetType:'file'|'folder';targetId:string;
 target:Target|null;createdAt:string;acceptedAt:string|null; user:{id:string;name:string;email:string}|null
}
function statusTag(status:string) {
 return <Tag color={status==='accepted'?'green':status==='pending'?'orange':'default'}>{status}</Tag>
}
export function SharedPage() {
 const [sent,setSent]=useState<Invite[]>([])
 const [received,setReceived]=useState<Invite[]>([])
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)
 const { modal, message } = App.useApp()
 async function load() {
  setLoading(true);setError('')
  try {
   const data=await apiFetch<{sent:Invite[];received:Invite[]}>('/invites')
   setSent(data.sent);setReceived(data.received)
  } catch (e) {setError(e instanceof Error?e.message:'Unable to load invitations')}
  finally {setLoading(false)}
 }
 useEffect(()=>{
  load().catch(()=>undefined)
  window.addEventListener('OpenXdrive:invites-changed',load)
  return ()=>window.removeEventListener('OpenXdrive:invites-changed',load)
 },[])
 function revoke(invite:Invite) {
  modal.confirm({
   title:'Revoke this invitation?',
   content:`This invitation for ${invite.email} will no longer be valid.`,
   okText:'Revoke',okButtonProps:{danger:true},
   onOk:async()=>{
    await apiFetch(`/invites/${invite.id}`,{method:'DELETE'})
    message.success('Invitation revoked')
    await load()
   },
  })
 }
 const base:TableColumnsType<Invite>=[
  {title:'Resource',key:'resource',render:(_,row)=><Space>{row.targetType==='folder'?<FolderOutlined style={{color:'#1677ff'}}/>:<FileOutlined style={{color:'#1677ff'}}/>}
   <div><Typography.Text strong>{row.target?.name||'Unavailable resource'}</Typography.Text><Typography.Text type="secondary" style={{display:'block',fontSize:11}}>{row.targetType}{row.target?.sizeBytes?` · ${formatBytes(row.target.sizeBytes)}`:''}</Typography.Text></div></Space>},
  {title:'Access',dataIndex:'role',key:'role',render:(v:string)=><Tag color="blue">{v}</Tag>},
  {title:'Status',dataIndex:'status',key:'status',render:statusTag},
  {title:'Invited',dataIndex:'createdAt',key:'created',render:(v:string)=>formatDate(v)},
 ]
 const sentColumns:TableColumnsType<Invite>=[
  base[0],{title:'Recipient',dataIndex:'email',key:'email'},...base.slice(1),
  {title:'',key:'actions',width:90,render:(_,row)=><Button danger size="small" type="text" icon={<DeleteOutlined/>} onClick={()=>revoke(row)}>Revoke</Button>},
 ]
 const receivedColumns:TableColumnsType<Invite>=[base[0],{title:'Shared by',dataIndex:['user','name'],key:'owner',render:(v:string|undefined,row)=>v||row.email},...base.slice(1)]
 return <>
  <PageHeader title="Shared workspace" description="Invitations, recipients and permissions from your real connected account." />
  {error&&<Alert type="error" message={error} showIcon style={{marginBottom:18}} closable onClose={()=>setError('')}/>}
  <Row gutter={[16,16]} style={{marginBottom:22}}>
   <Col xs={12} lg={8}><Card loading={loading}><Statistic title="Shared resources" value={sent.length+received.length} prefix={<ShareAltOutlined/>}/></Card></Col>
   <Col xs={12} lg={8}><Card loading={loading}><Statistic title="Accepted" value={sent.filter(x=>x.status==='accepted').length} prefix={<TeamOutlined/>}/></Card></Col>
   <Col xs={24} lg={8}><Card loading={loading}><Statistic title="Pending invitations" value={sent.filter(x=>x.status==='pending').length} prefix={<ClockCircleOutlined/>}/></Card></Col>
  </Row>
  <Card title="Shared with you" style={{marginBottom:20}}>
   <Table rowKey="id" size="middle" dataSource={received} loading={loading} columns={receivedColumns} scroll={{x:720}}
    pagination={received.length>10?{pageSize:10}:false}
    locale={{emptyText:<Empty description="No invitations received yet" />}} />
  </Card>
  <Card title="Resources you shared" extra={<Typography.Text type="secondary">{sent.length} invitations</Typography.Text>}>
   <Table rowKey="id" size="middle" dataSource={sent} loading={loading} columns={sentColumns} scroll={{x:810}}
    pagination={sent.length>10?{pageSize:10}:false}
    locale={{emptyText:<Empty description="Share a file or folder to see invitations here" />}} />
  </Card>
 </>
}
