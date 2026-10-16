import { useEffect, useState } from 'react'
import { Alert, Button, Card, Result, Skeleton, Space, Tag, Typography } from 'antd'
import { FolderOpenOutlined, ReloadOutlined, StarFilled } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/drive/PageHeader'
import { FileTable } from '@/components/drive/FileTable'
import { apiFetch } from '@/lib/api'
import { toFileItem, type FileResponse } from '@/lib/file-presentation'

export function StarredPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await apiFetch<{ files: FileResponse[] }>('/files?starred=1')
      setFiles(data.files)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Starred files could not be loaded')
    } finally { setLoading(false) }
  }
  useEffect(() => { load().catch(() => undefined) }, [])

  async function unstar(id?: string) {
    if (!id) return
    setBusy(id)
    try {
      await apiFetch(`/files/${id}`, { method: 'PATCH', body: JSON.stringify({ starred: false }) })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove this star')
    } finally { setBusy(null) }
  }

  return <>
    <PageHeader title="Starred" description="Frequently used files, saved to your own workspace."
      actions={<Button icon={<ReloadOutlined />} onClick={() => load()} loading={loading}>Refresh</Button>} />
    {error && <Alert type="error" showIcon message={error} style={{marginBottom:18}} closable onClose={() => setError('')} />}
    <Card title={<Space><StarFilled style={{color:'#e7a000'}}/>Starred files</Space>}
      extra={<Tag color="gold" bordered={false}>{files.length} starred</Tag>}>
      {loading ? <Skeleton active paragraph={{rows:5}} /> : files.length === 0 ?
        <Result icon={<StarFilled style={{color:'#e7a000'}} />} title="No starred files yet"
          subTitle="Star a file in All files to keep it here for quick access."
          extra={<Button type="primary" icon={<FolderOpenOutlined/>} onClick={()=>navigate('/all-files')}>Browse files</Button>} /> :
        <>
          <Typography.Paragraph type="secondary">Remove a star with the star button next to a file. Your cloud file remains unchanged.</Typography.Paragraph>
          <FileTable files={files.map(toFileItem)} mode="starred"
            onToggleStar={file => { if(!busy) unstar(file.id).catch(() => undefined) }} />
        </>}
    </Card>
  </>
}
