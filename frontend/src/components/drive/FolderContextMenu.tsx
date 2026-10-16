import { CopyOutlined, DeleteOutlined, EditOutlined, ScissorOutlined, UserAddOutlined } from '@ant-design/icons'
import type { FolderItem } from '@/data/drive-data'
import { CursorMenu } from '@/components/drive/CursorMenu'

type Props = {
  x:number;y:number;folder:FolderItem|null;onClose:()=>void;onCut:()=>void;
  onRename:()=>void;onInvite:()=>void;onCopyLink:()=>void;onDelete:()=>void
}
export function FolderContextMenu({x,y,folder,onClose,onCut,onRename,onInvite,onCopyLink,onDelete}:Props) {
  if (!folder) return null
  const actions:Record<string,()=>void>={copy:onCopyLink,cut:onCut,rename:onRename,invite:onInvite,delete:onDelete}
  return <CursorMenu x={x} y={y} open={Boolean(folder)} onClose={onClose} onSelect={key=>actions[key]?.()}
    items={[
      {key:'copy',label:'Copy link',icon:<CopyOutlined/>},
      {key:'cut',label:'Cut',icon:<ScissorOutlined/>},
      {key:'rename',label:'Rename folder',icon:<EditOutlined/>},
      {key:'invite',label:'Invite member',icon:<UserAddOutlined/>},
      {type:'divider'},
      {key:'delete',label:'Delete folder',icon:<DeleteOutlined/>,danger:true},
    ]} />
}
