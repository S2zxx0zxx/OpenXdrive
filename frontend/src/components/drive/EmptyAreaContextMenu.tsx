import { FolderAddOutlined, FileAddOutlined, SnippetsOutlined } from '@ant-design/icons'
import { CursorMenu } from '@/components/drive/CursorMenu'

type Props = {
  x:number;y:number;open:boolean;canPasteFolder?:boolean;onClose:()=>void;
  onUpload:()=>void;onCreateFolder:()=>void;onPasteFolder?:()=>void
}
export function EmptyAreaContextMenu({x,y,open,canPasteFolder=false,onClose,onUpload,onCreateFolder,onPasteFolder}:Props) {
  if (!open) return null
  return <CursorMenu x={x} y={y} open={open} onClose={onClose}
    onSelect={key=>{
      if(key==='upload')onUpload()
      if(key==='folder')onCreateFolder()
      if(key==='paste')onPasteFolder?.()
    }}
    items={[
      {key:'upload',label:'Upload files',icon:<FileAddOutlined/>},
      {key:'folder',label:'New folder',icon:<FolderAddOutlined/>},
      ...(canPasteFolder&&onPasteFolder?[{key:'paste',label:'Paste folder here',icon:<SnippetsOutlined/>}]:[]),
    ]} />
}
