import { useEffect, useState } from 'react'
import { Alert, Button, Card, Empty, Space, Table, Typography, type TableColumnsType } from 'antd'
import { DeleteOutlined, FileOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/drive/PageHeader'
import { apiFetch, formatBytes } from '@/lib/api'

type TrashFile = {
  id: string
  name: string
  mimeType: string
  sizeBytes: string
  provider: string
  deletedAt: string
  connectedAccount: {
    email: string
    provider: string
  }
}

export function TrashPage() {
  const [files, setFiles] = useState<TrashFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  async function loadTrash() {
    setLoading(true)
    try {
      const data = await apiFetch<{ files: TrashFile[] }>('/files/trash')
      setFiles(data.files)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load trash')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrash().catch(() => undefined)
  }, [])

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function toggleSelectAll() {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)))
    }
  }

  async function handleRestore(ids: string[]) {
    if (ids.length === 0) return
    setLoading(true)
    setMessage('')
    try {
      await apiFetch('/files/batch/restore', {
        method: 'POST',
        body: JSON.stringify({ fileIds: ids })
      })
      setFiles((prev) => prev.filter((f) => !ids.includes(f.id)))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      setMessage(`Successfully restored ${ids.length} file(s).`)
      setMessageType('success')
      window.dispatchEvent(new Event('OpenXdrive:storage-changed'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to restore files')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  async function handlePermanentDelete(ids: string[]) {
    if (ids.length === 0) return
    if (!confirm(`Are you sure you want to permanently delete ${ids.length} file(s)? This action cannot be undone.`)) return
    setLoading(true)
    setMessage('')
    try {
      await apiFetch('/files/batch/permanent', {
        method: 'DELETE',
        body: JSON.stringify({ fileIds: ids })
      })
      setFiles((prev) => prev.filter((f) => !ids.includes(f.id)))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      setMessage(`Permanently deleted ${ids.length} file(s).`)
      setMessageType('success')
      window.dispatchEvent(new Event('OpenXdrive:storage-changed'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to permanently delete files')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const columns:TableColumnsType<TrashFile> = [
    {title:'File name',dataIndex:'name',key:'name',render:(name:string)=><Space><FileOutlined style={{color:'#1677ff'}}/><Typography.Text strong ellipsis style={{maxWidth:250,display:'block'}}>{name}</Typography.Text></Space>},
    {title:'Cloud account',key:'account',render:(_,file)=><Typography.Text type="secondary">{file.connectedAccount.email} ({file.provider})</Typography.Text>},
    {title:'Size',dataIndex:'sizeBytes',key:'size',render:(value:string)=>formatBytes(value)},
    {title:'Deleted at',dataIndex:'deletedAt',key:'date',sorter:(a,b)=>new Date(a.deletedAt).getTime()-new Date(b.deletedAt).getTime(),
      render:(value:string)=>new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))},
    {title:'Actions',key:'actions',align:'right',width:165,render:(_,file)=><Space size={3}>
      <Button size="small" icon={<UndoOutlined />} onClick={()=>handleRestore([file.id])} loading={loading}>Restore</Button>
      <Button danger type="text" size="small" icon={<DeleteOutlined />} onClick={()=>handlePermanentDelete([file.id])} disabled={loading} aria-label={`Permanently delete ${file.name}`} />
    </Space>},
  ]
  return <>
    <PageHeader title="Recycle bin" description="Review and restore deleted files before permanently removing them."
      actions={<Space wrap>
        <Button icon={<ReloadOutlined />} onClick={()=>loadTrash()} loading={loading}>Refresh</Button>
        {selectedIds.size>0&&<Button icon={<UndoOutlined />} onClick={()=>handleRestore(Array.from(selectedIds))} disabled={loading}>Restore ({selectedIds.size})</Button>}
        {selectedIds.size>0&&<Button danger icon={<DeleteOutlined />} onClick={()=>handlePermanentDelete(Array.from(selectedIds))} disabled={loading}>Delete ({selectedIds.size})</Button>}
      </Space>} />
    {message&&<Alert type={messageType==='success'?'success':'error'} message={message} showIcon closable onClose={()=>setMessage('')} style={{marginBottom:17}} />}
    <Card title={<Space><DeleteOutlined />Deleted files</Space>} extra={<Typography.Text type="secondary">{files.length} items</Typography.Text>}>
      <Table<TrashFile> rowKey="id" columns={columns} dataSource={files} loading={loading}
        rowSelection={{selectedRowKeys:Array.from(selectedIds),onSelect:file=>toggleSelect(file.id),onSelectAll:()=>toggleSelectAll()}}
        pagination={files.length>20?{pageSize:20,showSizeChanger:true}:false}
        scroll={{x:780}}
        locale={{emptyText:<Empty description="Your recycle bin is empty" />}} />
    </Card>
  </>
}
