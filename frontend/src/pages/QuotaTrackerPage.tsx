import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Empty, Flex, Progress, Row, Select, Space, Statistic, Switch, Tag, Typography } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, CloudOutlined, DatabaseOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/drive/PageHeader'
import { apiFetch, formatBytes } from '@/lib/api'

type StorageSummary = { totalBytes: string | null; usedBytes: string; availableBytes: string | null }
type ConnectedAccount = { id:string;email:string;displayName?:string|null;provider:string;status:string;storageAccount?:{totalBytes:string|null;usedBytes:string;availableBytes:string|null;lastSyncedAt:string|null}|null }
type RoutingMode = 'most_available'|'round_robin'|'priority'
type RoutingPolicy = { mode:RoutingMode;priorityAccountIds:string[];roundRobinCursor:number }
function providerName(value:string){return value==='s3'?'S3-compatible':'Google Drive'}
function usedPercent(a:ConnectedAccount){const total=Number(a.storageAccount?.totalBytes??0);const used=Number(a.storageAccount?.usedBytes??0);return total>0?Math.min(100,Math.round(used/total*100)):0}
function bytesOrUnlimited(value:string|null|undefined){return value==null?'Unlimited / unknown':formatBytes(value)}

export function QuotaTrackerPage() {
 const [summary,setSummary]=useState<StorageSummary|null>(null)
 const [accounts,setAccounts]=useState<ConnectedAccount[]>([])
 const [policy,setPolicy]=useState<RoutingPolicy>({mode:'most_available',priorityAccountIds:[],roundRobinCursor:0})
 const [error,setError]=useState('')
 const [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false)
 const [syncId,setSyncId]=useState<string|null>(null)
 const [autoRefresh,setAutoRefresh]=useState(false)
 async function load() {
  setBusy(true);setError('')
  try {
   const [s,a,p]=await Promise.all([
    apiFetch<StorageSummary>('/storage/summary'),
    apiFetch<{accounts:ConnectedAccount[]}>('/connected-accounts'),
    apiFetch<{policy:RoutingPolicy}>('/storage/routing-policy'),
   ])
   setSummary(s);setAccounts(a.accounts);setPolicy(p.policy)
  }catch(err){setError(err instanceof Error?err.message:'Storage information could not be loaded')}
  finally{setBusy(false)}
 }
 useEffect(()=>{load().catch(()=>undefined)},[])
 useEffect(()=>{
  if(!autoRefresh)return
  const timer=window.setInterval(()=>{load().catch(()=>undefined)},35000)
  return ()=>window.clearInterval(timer)
 },[autoRefresh])
 useEffect(()=>{
  function onMessage(e:MessageEvent){
   if(e.origin!==window.location.origin||e.data?.type!=='GOOGLE_CONNECTED')return
   setMessage(e.data.status==='success'?'Google Drive connected.':'Drive connection failed.')
   load().catch(()=>undefined)
  }
  window.addEventListener('message',onMessage);return ()=>window.removeEventListener('message',onMessage)
 },[])
 async function connectDrive(){
  const popup=window.open('','google-drive-connect','width=540,height=720')
  try {
   const {url}=await apiFetch<{url:string}>('/connected-accounts/google/connect-url')
   if(popup)popup.location.href=url;else window.location.href=url
  }catch(err){popup?.close();setError(err instanceof Error?err.message:'Unable to connect Drive')}
 }
 async function sync(id:string){
  setSyncId(id)
  try{await apiFetch(`/connected-accounts/${id}/sync-quota`,{method:'POST'});await load();setMessage('Storage quota updated.')}
  catch(err){setError(err instanceof Error?err.message:'Quota sync failed')}
  finally{setSyncId(null)}
 }
 async function savePolicy(next:RoutingPolicy){
  const before=policy;setPolicy(next)
  try{
   const data=await apiFetch<{policy:RoutingPolicy}>('/storage/routing-policy',{method:'PATCH',body:JSON.stringify({mode:next.mode,priorityAccountIds:next.priorityAccountIds})})
   setPolicy(data.policy);setMessage('Upload routing policy saved.')
  }catch(err){setPolicy(before);setError(err instanceof Error?err.message:'Could not save routing policy')}
 }
 const idMap=new Map(accounts.map(a=>[a.id,a]))
 const saved=policy.priorityAccountIds.map(id=>idMap.get(id)).filter((a):a is ConnectedAccount=>Boolean(a))
 const savedIds=new Set(saved.map(a=>a.id))
 const ordered=[...saved,...accounts.filter(a=>!savedIds.has(a.id))]
 function move(id:string,delta:-1|1){
  const ids=ordered.map(a=>a.id),ix=ids.indexOf(id),target=ix+delta
  if(ix<0||target<0||target>=ids.length)return
  const next=[...ids];const [removed]=next.splice(ix,1);next.splice(target,0,removed)
  savePolicy({...policy,priorityAccountIds:next}).catch(()=>undefined)
 }
 return <>
  <PageHeader title="Storage insights" description="Real-time capacity, connected providers and upload routing decisions."
   actions={<Space wrap><Space><Typography.Text type="secondary">Auto refresh</Typography.Text><Switch size="small" checked={autoRefresh} onChange={setAutoRefresh}/></Space><Button icon={<ReloadOutlined/>} loading={busy} onClick={()=>load()}>Refresh</Button><Button type="primary" icon={<LinkOutlined/>} onClick={connectDrive}>Connect Drive</Button></Space>} />
  {error&&<Alert type="error" showIcon message={error} closable onClose={()=>setError('')} style={{marginBottom:16}} />}
  {message&&<Alert type="success" showIcon message={message} closable onClose={()=>setMessage('')} style={{marginBottom:16}} />}
  <Row gutter={[16,16]} style={{marginBottom:24}}>
   <Col xs={12} lg={6}><Card loading={busy}><Statistic title="Total storage" value={bytesOrUnlimited(summary?.totalBytes)} valueStyle={{fontSize:20}} /></Card></Col>
   <Col xs={12} lg={6}><Card loading={busy}><Statistic title="Used space" value={formatBytes(summary?.usedBytes)} valueStyle={{fontSize:20}} /></Card></Col>
   <Col xs={12} lg={6}><Card loading={busy}><Statistic title="Available" value={bytesOrUnlimited(summary?.availableBytes)} valueStyle={{fontSize:20}} /></Card></Col>
   <Col xs={12} lg={6}><Card loading={busy}><Statistic title="Connected accounts" value={accounts.length} valueStyle={{fontSize:20}} /></Card></Col>
  </Row>
  <Card title="Upload routing policy" extra={<Tag color="blue" bordered={false}>Smart distribution</Tag>} style={{marginBottom:24}}>
   <Flex justify="space-between" align="center" wrap="wrap" gap={14} style={{marginBottom:18}}>
    <Typography.Text type="secondary">Choose the account selection method for new uploads.</Typography.Text>
    <Select value={policy.mode} style={{width:210}} onChange={v=>{savePolicy({...policy,mode:v}).catch(()=>undefined)}} options={[
     {value:'most_available',label:'Most available capacity'},
     {value:'round_robin',label:'Round robin'},
     {value:'priority',label:'Priority order'},
    ]}/>
   </Flex>
   {ordered.length===0?<Empty description="Connect storage accounts to configure routing." />:
    ordered.map((a,i)=><Flex key={a.id} justify="space-between" align="center" wrap="wrap" gap={10} style={{padding:'11px 0',borderBottom:'1px solid var(--ox-outline)'}}>
     <Space size={12}>{a.provider==='s3'?<DatabaseOutlined style={{fontSize:22,color:'#1677ff'}}/>:<CloudOutlined style={{fontSize:22,color:'#1677ff'}}/>}
      <div><Typography.Text strong style={{display:'block'}}>{a.displayName||a.email}</Typography.Text><Typography.Text type="secondary" style={{fontSize:12}}>{providerName(a.provider)} · {formatBytes(a.storageAccount?.usedBytes)} used</Typography.Text></div></Space>
     <Space><Button size="small" icon={<ArrowUpOutlined/>} disabled={i===0||policy.mode!=='priority'} onClick={()=>move(a.id,-1)} aria-label="Move account up"/><Button size="small" icon={<ArrowDownOutlined/>} disabled={i===ordered.length-1||policy.mode!=='priority'} onClick={()=>move(a.id,1)} aria-label="Move account down"/></Space>
    </Flex>)}
  </Card>
  <Typography.Title level={5} style={{marginBottom:14}}>Connected storage accounts</Typography.Title>
  {accounts.length===0 ? <Card><Empty description="No connected accounts yet" ><Button type="primary" onClick={connectDrive}>Connect a Google Drive</Button></Empty></Card>:
   <Row gutter={[16,16]}>{accounts.map(a=><Col xs={24} md={12} key={a.id}><Card title={<Space>{a.provider==='s3'?<DatabaseOutlined/>:<CloudOutlined/>}<span>{a.displayName||a.email}</span></Space>}
    extra={<Tag color={a.status==='connected'?'green':'orange'}>{a.status}</Tag>}>
    <Typography.Text type="secondary">{providerName(a.provider)} · {a.email}</Typography.Text>
    <Flex justify="space-between" style={{marginTop:22}}><Typography.Text strong>{formatBytes(a.storageAccount?.usedBytes??'0')}</Typography.Text><Typography.Text type="secondary">{bytesOrUnlimited(a.storageAccount?.totalBytes)}</Typography.Text></Flex>
    <Progress percent={usedPercent(a)} size="small" status={usedPercent(a)>=90?'exception':'normal'} />
    <Flex align="center" justify="space-between" style={{marginTop:12}}><Typography.Text type="secondary">Available: {bytesOrUnlimited(a.storageAccount?.availableBytes)}</Typography.Text>
      <Button size="small" icon={<ReloadOutlined/>} loading={syncId===a.id} onClick={()=>sync(a.id)}>Sync quota</Button></Flex>
   </Card></Col>)}</Row>}
 </>
}
