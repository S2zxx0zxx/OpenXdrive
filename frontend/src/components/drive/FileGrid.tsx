import type { MouseEvent } from 'react'
import { Button, Card, Checkbox, Flex, Tag, Typography } from 'antd'
import { MoreOutlined, StarFilled, StarOutlined, InboxOutlined, EyeOutlined } from '@ant-design/icons'
import { FileIcon } from '@/components/drive/FileIcon'
import type { FileItem } from '@/data/drive-data'

export type FileSizeScale = 'xs' | 'sm' | 'md' | 'lg'
const scale: Record<FileSizeScale, number> = { xs: 124, sm: 158, md: 205, lg: 262 }
export function FileGrid({
  files, selectedFileIds = new Set<string>(), sizeScale = 'md', onFileContextMenu, onToggleFile, onToggleStar, onToggleArchive, onOpenFile,
}: {
  files: FileItem[]
  selectedFileIds?: Set<string>
  sizeScale?: FileSizeScale
  onFileContextMenu?: (event: MouseEvent<HTMLElement>, file: FileItem) => void
  onToggleFile?: (file: FileItem) => void
  onToggleStar?: (file: FileItem) => void
  onToggleArchive?: (file: FileItem) => void
  onOpenFile?: (file: FileItem) => void
}) {
  return <div className="ox-file-grid" style={{ display:'grid', gridTemplateColumns:`repeat(auto-fill,minmax(min(100%,${scale[sizeScale]}px),1fr))`, gap:12, marginTop:16 }}>
    {files.map(file => {
      const selected = selectedFileIds.has(file.id || '')
      return <div key={file.id || file.name} draggable
        onDragStart={e => { e.dataTransfer.setData('text/plain', file.id || ''); e.dataTransfer.effectAllowed='move' }}
        onContextMenu={e => onFileContextMenu?.(e, file)}
        onDoubleClick={e => {e.stopPropagation();onOpenFile?.(file)}}>
        <Card hoverable size="small" styles={{ body: { padding:16 } }}
          style={{ borderColor:selected ? '#1677ff' : undefined, background:selected ? 'var(--ox-selection)' : undefined, height:'100%' }}
          onClick={() => onToggleFile?.(file)}>
          <Flex justify="space-between" align="center">
            {onToggleFile ? <Checkbox checked={selected} onClick={e => e.stopPropagation()} onChange={() => onToggleFile(file)} aria-label={`Select ${file.name}`} /> : <span />}
            {onOpenFile && <Button type="text" size="small" icon={<EyeOutlined />} onClick={e=>{e.stopPropagation();onOpenFile(file)}} aria-label={`Preview ${file.name}`} />}
            {onToggleStar && <Button type="text" size="small" icon={file.starredAt ? <StarFilled style={{color:'#e7a000'}}/> : <StarOutlined />} onClick={e=>{e.stopPropagation();onToggleStar(file)}} aria-label={file.starredAt ? 'Unstar file' : 'Star file'}/>}
            {onToggleArchive && <Button type="text" size="small" icon={<InboxOutlined />} onClick={e=>{e.stopPropagation();onToggleArchive(file)}} aria-label="Archive file" />}
            {onFileContextMenu && <Button type="text" size="small" icon={<MoreOutlined />} aria-label={`Actions for ${file.name}`} onClick={e => {e.stopPropagation();onFileContextMenu(e,file)}} />}
          </Flex>
          <Flex justify="center" style={{ margin:'16px 0 20px' }}><FileIcon kind={file.kind} className="ox-grid-file-icon" /></Flex>
          <Typography.Text strong ellipsis={{ tooltip: file.name }} style={{ display:'block', textAlign:'center' }}>{file.name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize:11, display:'block', textAlign:'center', marginTop:5 }}>{file.date}</Typography.Text>
          <Flex justify="center" gap={5} wrap="wrap" style={{ marginTop:14 }}>
            <Tag bordered={false} style={{ margin:0 }}>{file.size}</Tag>
            <Tag bordered={false} style={{ margin:0 }}>{file.access}</Tag>
          </Flex>
        </Card>
      </div>
    })}
  </div>
}
