import { type MouseEvent } from 'react'
import { Button, Card, Checkbox, Flex, Grid, List, Space, Table, Tooltip, Typography, type TableColumnsType } from 'antd'
import { FolderOpenOutlined, MoreOutlined, StarFilled, StarOutlined, InboxOutlined, UndoOutlined, FileOutlined, EyeOutlined } from '@ant-design/icons'
import { FileIcon } from '@/components/drive/FileIcon'
import type { FileItem } from '@/data/drive-data'

type Mode = 'default' | 'shared' | 'recent' | 'starred' | 'archived'
type Props = {
  files: FileItem[]
  mode?: Mode
  selectedFileIds?: Set<string>
  allSelected?: boolean
  onFileContextMenu?: (event: MouseEvent<HTMLElement>, file: FileItem) => void
  onToggleFile?: (file: FileItem) => void
  onToggleAll?: () => void
  onToggleStar?: (file: FileItem) => void
  onToggleArchive?: (file: FileItem) => void
  onOpenFile?: (file: FileItem) => void
}

export function FileTable({ files, mode = 'default', selectedFileIds = new Set<string>(), allSelected = false, onFileContextMenu, onToggleFile, onToggleAll, onToggleStar, onToggleArchive, onOpenFile }: Props) {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm
  const columns: TableColumnsType<FileItem> = [
    {
      title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, record) => <Space size={11} className="min-w-0">
        {<FileIcon kind={record.kind} />}
        {record.starredAt && <StarFilled style={{ color: '#e7a000' }} aria-label="Starred" />}
        <Typography.Text strong ellipsis={{ tooltip: record.name }} style={{ maxWidth: 245, display: 'inline-block', verticalAlign: 'middle' }}>{record.name}</Typography.Text>
      </Space>,
    },
    ...(mode === 'default' ? [{
      title: 'Folder', dataIndex: 'folderName', key: 'folderName',
      render: (folderName: string | undefined) => folderName ? <Space size={5}><FolderOpenOutlined style={{ color: '#1677ff' }} />{folderName}</Space> : <Typography.Text type="secondary">—</Typography.Text>,
    }] as TableColumnsType<FileItem> : []),
    ...(mode === 'shared' ? [{ title: 'Owner', dataIndex: 'owner', key: 'owner' }] as TableColumnsType<FileItem> : []),
    ...(mode === 'recent' ? [{ title: 'Last opened', dataIndex: 'openedDate', key: 'openedDate' }] as TableColumnsType<FileItem> : []),
    ...(mode === 'starred' ? [{ title: 'Starred on', dataIndex: 'starredDate', key: 'starredDate' }] as TableColumnsType<FileItem> : []),
    ...(mode === 'archived' ? [{ title: 'Archived', dataIndex: 'archivedDate', key: 'archivedDate' }] as TableColumnsType<FileItem> : []),
    { title: mode === 'archived' ? 'Original location' : 'Modified', dataIndex: mode === 'archived' ? 'location' : 'date', key: 'date' },
    {
      title: 'Size', dataIndex: 'size', key: 'size', width: 125,
      sorter: (a, b) => Number(a.sizeBytes ?? '0') - Number(b.sizeBytes ?? '0'),
      render: (value: string) => <Typography.Text type="secondary">{value}</Typography.Text>,
    },
    {
      title: 'Access', key: 'access', width: 170,
      render: (_, record) => <Typography.Text type={record.shared > 0 ? 'success' : 'secondary'}>{record.access}</Typography.Text>,
    },
    {
      title: '', key: 'actions', width: 185, align: 'right',
      render: (_, record) => <Space size={2}>
        {onOpenFile && <Tooltip title="Preview file"><Button type="text" size="small" icon={<EyeOutlined />} aria-label={`Preview ${record.name}`} onClick={e=>{e.stopPropagation();onOpenFile(record)}} /></Tooltip>}
        {onToggleStar && <Tooltip title={record.starredAt ? 'Remove from Starred' : 'Add to Starred'}><Button type="text" size="small" icon={record.starredAt ? <StarFilled style={{color:'#e7a000'}}/> : <StarOutlined />} aria-label={record.starredAt ? 'Unstar file' : 'Star file'} onClick={e=>{e.stopPropagation();onToggleStar(record)}} /></Tooltip>}
        {onToggleArchive && <Tooltip title={record.archivedAt ? 'Restore from Archive' : 'Move to Archive'}><Button type="text" size="small" icon={record.archivedAt ? <UndoOutlined/> : <InboxOutlined/>} aria-label={record.archivedAt ? 'Restore archived file' : 'Archive file'} onClick={e=>{e.stopPropagation();onToggleArchive(record)}} /></Tooltip>}
        {onFileContextMenu && <Button size="small" type="text" icon={<MoreOutlined />} aria-label={`More actions for ${record.name}`}
          onClick={event => { event.stopPropagation(); onFileContextMenu(event, record) }} />}
      </Space>,
    },
  ]

  if (isMobile) {
    return <div className="ox-file-table" style={{ padding: 12 }}>
      {onToggleAll && <Flex justify="space-between" align="center" style={{ padding: '7px 7px 13px' }}>
        <Typography.Text strong>Files ({files.length})</Typography.Text>
        <Checkbox checked={allSelected} onChange={onToggleAll}>Select all</Checkbox>
      </Flex>}
      <List dataSource={files} pagination={files.length > 20 ? { pageSize: 20, size: 'small' } : false} renderItem={file => (
        <List.Item style={{ padding: 0, marginBottom: 8 }}>
          <Card size="small" style={{ width: '100%', borderColor: selectedFileIds.has(file.id ?? '') ? '#1677ff' : undefined }}
            onContextMenu={event => onFileContextMenu?.(event, file)} onClick={() => onToggleFile?.(file)}>
            <Flex align="center" gap={12} style={{ padding: 4 }}>
              {onToggleFile && <Checkbox checked={selectedFileIds.has(file.id ?? '')} onClick={e => e.stopPropagation()} onChange={() => onToggleFile(file)} />}
              <FileIcon kind={file.kind} />
              {file.starredAt && <StarFilled style={{color:'#e7a000'}} aria-label="Starred" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong ellipsis style={{ display: 'block' }}>{file.name}</Typography.Text>
                <Space size={5}><Typography.Text type="secondary" style={{ fontSize: 11 }}>{file.size}</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 11 }}>· {file.date}</Typography.Text></Space>
              </div>
              {onOpenFile && <Button size="small" type="text" icon={<EyeOutlined />} aria-label={`Preview ${file.name}`} onClick={e=>{e.stopPropagation();onOpenFile(file)}} />}
              {onToggleStar && <Button size="small" type="text" icon={file.starredAt ? <StarFilled style={{color:'#e7a000'}}/> : <StarOutlined />} aria-label={file.starredAt ? 'Unstar file' : 'Star file'} onClick={e=>{e.stopPropagation();onToggleStar(file)}} />}
              {onToggleArchive && <Button size="small" type="text" icon={file.archivedAt ? <UndoOutlined/> : <InboxOutlined/>} aria-label={file.archivedAt ? 'Restore archived file' : 'Archive file'} onClick={e=>{e.stopPropagation();onToggleArchive(file)}} />}
              {onFileContextMenu && <Button type="text" icon={<MoreOutlined />} onClick={e => { e.stopPropagation(); onFileContextMenu(e, file) }} aria-label={`More actions for ${file.name}`} />}
            </Flex>
          </Card>
        </List.Item>
      )} />
    </div>
  }
  return <div className="ox-file-table">
    <Table<FileItem>
      rowKey={file => file.id ?? file.name}
      columns={columns}
      dataSource={files}
      size="middle"
      scroll={{ x: 850 }}
      pagination={files.length > 15 ? { pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15','30','50'], showTotal: total => `${total} files` } : false}
      rowSelection={onToggleFile ? {
        selectedRowKeys: Array.from(selectedFileIds),
        onSelect: record => onToggleFile(record),
        onSelectAll: () => onToggleAll?.(),
      } : undefined}
      onRow={file => ({
        draggable: true,
        onDragStart: event => { event.dataTransfer.setData('text/plain', file.id ?? ''); event.dataTransfer.effectAllowed = 'move' },
        onContextMenu: event => onFileContextMenu?.(event, file),
        onDoubleClick: () => onOpenFile?.(file),
        tabIndex: onOpenFile ? 0 : undefined,
        onKeyDown: event => {
          if (onOpenFile && event.key === 'Enter' && event.target === event.currentTarget) {
            event.preventDefault()
            onOpenFile(file)
          }
        },
        onClick: () => onToggleFile?.(file),
        className: selectedFileIds.has(file.id ?? '') ? 'file-selected' : '',
      })}
      locale={{ emptyText: <Space direction="vertical" align="center"><FileOutlined /><Typography.Text type="secondary">No files found</Typography.Text></Space> }}
    />
  </div>
}
