import { useEffect, useState } from 'react'
import { Alert, Button, Card, Result, Skeleton, Space, Tag, Typography } from 'antd'
import { FolderOpenOutlined, InboxOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/drive/PageHeader'
import { FileTable } from '@/components/drive/FileTable'
import { apiFetch } from '@/lib/api'
import { toFileItem, type FileResponse } from '@/lib/file-presentation'

export function ArchivedPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  async function load() {
    setLoading(true);setError('')
    try {
      const data = await apiFetch<{ files: FileResponse[] }>('/files?archived=1')
      setFiles(data.files)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archived files could not be loaded')
    } finally { setLoading(false) }
  }
  useEffect(() => { load().catch(()=>undefined) }, [])
  async function restore(id?:string) {
    if(!id)return
    setBusy(id)
    try {
      await apiFetch(`/files/${id}`, { method:'PATCH', body:JSON.stringify({archived:false}) })
      await load()
    } catch(err){setError(err instanceof Error?err.message:'Could not restore archived file')}
    finally{setBusy(null)}
  }
  return <>
    <PageHeader title="Archive" description="Files you have put aside without deleting them from the cloud."
      actions={<Button icon={<ReloadOutlined/>} onClick={()=>load()} loading={loading}>Refresh</Button>}/>
    {error && <Alert type="error" message={error} showIcon closable onClose={()=>setError('')} style={{marginBottom:18}}/>}
    <Card title={<Space><InboxOutlined/>Archived files</Space>}
      extra={<Tag color="blue" bordered={false}>{files.length} archived</Tag>}>
      {loading ? <Skeleton active paragraph={{rows:5}} /> : files.length===0 ?
        <Result icon={<InboxOutlined style={{color:'#1677ff'}} />} title="Your archive is empty"
          subTitle="Move files to Archive from the All files menu. Archiving changes metadata only, not the stored file."
          extra={<Button type="primary" icon={<FolderOpenOutlined/>} onClick={()=>navigate('/all-files')}>Browse files</Button>}/> :
        <>
          <Typography.Paragraph type="secondary">Archived files stay with your connected storage provider. Choose <UndoOutlined /> to restore them to All files.</Typography.Paragraph>
          <FileTable files={files.map(toFileItem)} mode="archived"
            onToggleArchive={file=>{if(!busy)restore(file.id).catch(()=>undefined)}}/>
        </>}
    </Card>
  </>
}
