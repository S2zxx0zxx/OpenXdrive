import type { MouseEvent } from 'react'
import { Button, Card, Flex, Typography } from 'antd'
import { MoreOutlined } from '@ant-design/icons'
import type { FolderItem } from '@/data/drive-data'
import { FolderVisual } from '@/components/drive/FolderVisual'

export type FolderSizeScale = 'xs' | 'sm' | 'md' | 'lg'
const minWidths: Record<FolderSizeScale, number> = { xs: 124, sm: 160, md: 208, lg: 268 }
const iconWidths: Record<FolderSizeScale, string> = { xs:'h-8 w-8', sm:'h-10 w-10', md:'h-14 w-14', lg:'h-20 w-20' }

export function FolderGrid({ items, mobileTwoColumns = false, sizeScale = 'md', onFolderMenu, onFolderOpen, onDropItem }: {
  items: FolderItem[]
  mobileTwoColumns?: boolean
  sizeScale?: FolderSizeScale
  onFolderMenu?: (event: MouseEvent<HTMLElement>, folder: FolderItem) => void
  onFolderOpen?: (folder: FolderItem) => void
  onDropItem?: (fileId: string, folderId: string) => void
}) {
  return <div className="ox-folder-grid" style={{
    display:'grid', gap:12, marginTop:16,
    gridTemplateColumns:`repeat(auto-fill,minmax(min(100%,${mobileTwoColumns && sizeScale === 'md' ? 150 : minWidths[sizeScale]}px),1fr))`,
  }}>
    {items.map(folder => <div key={folder.id || folder.name}
      onDragOver={e => {e.preventDefault();e.dataTransfer.dropEffect='move'}}
      onDrop={e => {e.preventDefault();const id=e.dataTransfer.getData('text/plain');if(id&&folder.id)onDropItem?.(id,folder.id)}}
      onContextMenu={e => onFolderMenu?.(e,folder)}>
      <Card hoverable size="small" styles={{body:{padding:16}}} style={{ height:'100%' }} onClick={() => onFolderOpen?.(folder)}>
        <Flex justify="end">
          {onFolderMenu ? <Button type="text" size="small" icon={<MoreOutlined />} onClick={e=>{e.stopPropagation();onFolderMenu(e,folder)}} aria-label={`Actions for ${folder.name}`} /> : <span style={{height:24}} />}
        </Flex>
        <Flex vertical align="center" style={{padding:'8px 4px 12px'}}>
          <FolderVisual folder={folder} className={iconWidths[sizeScale]} />
          <Typography.Text strong ellipsis={{tooltip:folder.name}} style={{fontSize:13,textAlign:'center',width:'100%',marginTop:15}}>{folder.name}</Typography.Text>
          <Typography.Text type="secondary" style={{fontSize:11,marginTop:5}}>{folder.updated}</Typography.Text>
        </Flex>
      </Card>
    </div>)}
  </div>
}
