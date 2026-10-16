import { useEffect, useState, type FormEvent } from 'react'
import { Alert, App, Button, Card, Col, Descriptions, Empty, Form, Input, Modal, Row, Space, Statistic, Table, Tabs, Tag, Typography, type TableColumnsType } from 'antd'
import { ApiOutlined, CheckCircleOutlined, CopyOutlined, DeleteOutlined, KeyOutlined, PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/drive/PageHeader'
import { API_URL, apiFetch, formatDate } from '@/lib/api'

type ApiKey = {
 id:string;name:string;keyPrefix:string;scopes:string[];status:string;
 lastUsedAt:string|null;expiresAt:string|null;revokedAt:string|null;createdAt:string
}
const uploadUrl = `${API_URL}/api/v1/uploads`
const curlExample = [
 `curl -X POST "${uploadUrl}"`,
 '  -H "Authorization: Bearer <YOUR_API_KEY>"',
 '  -F \'filesMeta=[{"fieldName":"file-0","fileName":"hello.txt","mimeType":"text/plain","sizeBytes":"12"}]\'',
 '  -F "file-0=@hello.txt;type=text/plain"',
].join(' \\'+String.fromCharCode(10))
const jsExample = [
 'const form = new FormData()',
 "form.append('filesMeta', JSON.stringify([{",
 "  fieldName: 'file-0', fileName: file.name, mimeType: file.type, sizeBytes: String(file.size)",
 '}]))',
 "form.append('file-0', file)",
 `await fetch('${uploadUrl}', {`,
 "  method: 'POST',",
 "  headers: { Authorization: 'Bearer <YOUR_API_KEY>' },",
 '  body: form,',
 '})',
].join(String.fromCharCode(10))

export function ApiManagementPage() {
 const {modal,message}=App.useApp()
 const [keys,setKeys]=useState<ApiKey[]>([])
 const [createOpen,setCreateOpen]=useState(false)
 const [name,setName]=useState('')
 const [secret,setSecret]=useState('')
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 async function load() {
  try { const data=await apiFetch<{apiKeys:ApiKey[]}>('/api-keys');setKeys(data.apiKeys) }
  catch(err){setError(err instanceof Error?err.message:'Could not load API keys')}
 }
 useEffect(()=>{load().catch(()=>undefined)},[])
 async function create(event:FormEvent) {
  event.preventDefault();setLoading(true);setError('')
  try {
   const data=await apiFetch<{apiKey:ApiKey;secret:string}>('/api-keys',{method:'POST',body:JSON.stringify({name:name.trim()})})
   setSecret(data.secret);setName('');setCreateOpen(false);await load()
  }catch(err){setError(err instanceof Error?err.message:'Could not create API key')}
  finally{setLoading(false)}
 }
 function revoke(item:ApiKey) {
  modal.confirm({
   title:'Revoke this API key?',content:'Any integrations using this key will stop working immediately.',
   okText:'Revoke',okButtonProps:{danger:true},
   onOk:async()=>{await apiFetch(`/api-keys/${item.id}`,{method:'DELETE'});await load();message.success('Key revoked')},
  })
 }
 async function copy(value:string) {
  try {await navigator.clipboard.writeText(value);message.success('Copied to clipboard')}
  catch{message.error('Unable to copy; use a secure browser context')}
 }
 const columns:TableColumnsType<ApiKey>=[
  {title:'Key name',dataIndex:'name',key:'name',render:(v:string)=><Space><KeyOutlined style={{color:'#1677ff'}}/><Typography.Text strong>{v}</Typography.Text></Space>},
  {title:'Prefix',dataIndex:'keyPrefix',key:'prefix',render:(v:string)=><Typography.Text code>{v}...</Typography.Text>},
  {title:'Scope',dataIndex:'scopes',key:'scopes',render:(v:string[])=><Space wrap>{v.map(x=><Tag key={x}>{x}</Tag>)}</Space>},
  {title:'Status',dataIndex:'status',key:'status',render:(v:string)=><Tag color={v==='active'?'green':'default'}>{v}</Tag>},
  {title:'Last used',dataIndex:'lastUsedAt',key:'lastUsed',render:(v:string|null)=>v?formatDate(v):'Never'},
  {title:'Created',dataIndex:'createdAt',key:'created',render:(v:string)=>formatDate(v)},
  {title:'',key:'action',align:'right',render:(_,item)=><Button danger type="text" icon={<DeleteOutlined />} size="small" disabled={item.status!=='active'} onClick={()=>revoke(item)}>Revoke</Button>},
 ]
 return <>
  <PageHeader title="Developer API" description="Generate scoped credentials to upload files from your applications."
   actions={<Button type="primary" icon={<PlusOutlined/>} onClick={()=>setCreateOpen(true)}>Create API key</Button>} />
  {error&&<Alert type="error" showIcon message={error} closable onClose={()=>setError('')} style={{marginBottom:18}}/>}
  {secret&&<Alert type="warning" showIcon style={{marginBottom:18}}
   message="Save your new key now — it will not be displayed again."
   description={<Space style={{marginTop:8}} wrap><Typography.Text code copyable={{text:secret}}>{secret}</Typography.Text><Button size="small" icon={<CopyOutlined/>} onClick={()=>copy(secret)}>Copy</Button><Button size="small" type="text" onClick={()=>setSecret('')}>Dismiss</Button></Space>} />}
  <Row gutter={[16,16]} style={{marginBottom:20}}>
   <Col xs={12} md={8}><Card><Statistic title="Active API keys" value={keys.filter(x=>x.status==='active').length} prefix={<KeyOutlined/>}/></Card></Col>
   <Col xs={12} md={8}><Card><Statistic title="Keys used" value={keys.filter(x=>x.lastUsedAt).length} prefix={<CheckCircleOutlined/>}/></Card></Col>
   <Col xs={24} md={8}><Card><Statistic title="Upload endpoints" value={1} prefix={<ApiOutlined/>}/></Card></Col>
  </Row>
  <Card title="API keys" extra={<Tag color="blue" bordered={false} icon={<SafetyCertificateOutlined/>}>Upload-only scope</Tag>} style={{marginBottom:20}}>
   <Table rowKey="id" columns={columns} dataSource={keys} scroll={{x:920}}
    pagination={keys.length>10?{pageSize:10}:false}
    locale={{emptyText:<Empty description="No keys created. Create one to integrate your application."/>}} />
  </Card>
  <Card title="Upload API documentation">
   <Descriptions column={1} size="small" bordered items={[
    {key:'endpoint',label:'Endpoint',children:<Space wrap><Typography.Text code>POST {uploadUrl}</Typography.Text><Button type="text" size="small" icon={<CopyOutlined/>} onClick={()=>copy(uploadUrl)}/></Space>},
    {key:'auth',label:'Authentication',children:<Typography.Text code>Authorization: Bearer &lt;YOUR_API_KEY&gt;</Typography.Text>},
    {key:'content',label:'Content type',children:'multipart/form-data'},
   ]} />
   <Tabs style={{marginTop:19}} items={[
    {key:'curl',label:'cURL',children:<div><Button style={{marginBottom:10}} icon={<CopyOutlined/>} onClick={()=>copy(curlExample)}>Copy example</Button><pre style={{whiteSpace:'pre-wrap',overflowX:'auto',background:'#111827',color:'#f2f7ff',padding:16,borderRadius:9}}>{curlExample}</pre></div>},
    {key:'js',label:'JavaScript',children:<div><Button style={{marginBottom:10}} icon={<CopyOutlined/>} onClick={()=>copy(jsExample)}>Copy example</Button><pre style={{whiteSpace:'pre-wrap',overflowX:'auto',background:'#111827',color:'#f2f7ff',padding:16,borderRadius:9}}>{jsExample}</pre></div>},
   ]} />
  </Card>
  <Modal open={createOpen} title="Create API key" onCancel={()=>setCreateOpen(false)} footer={null} destroyOnHidden>
   <Typography.Paragraph type="secondary">A new key can upload files to your connected cloud accounts. Save its value when shown.</Typography.Paragraph>
   <form onSubmit={create}><Form.Item label="Key name"><Input autoFocus value={name} maxLength={120} onChange={e=>setName(e.target.value)} placeholder="Production integration" required /></Form.Item>
    <Space style={{display:'flex',justifyContent:'end'}}><Button onClick={()=>setCreateOpen(false)}>Cancel</Button><Button type="primary" htmlType="submit" loading={loading}>Create key</Button></Space>
   </form>
  </Modal>
 </>
}
