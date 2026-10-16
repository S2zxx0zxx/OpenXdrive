import { Dropdown, type MenuProps } from 'antd'

export function CursorMenu({ x, y, open, items, onClose, onSelect }: {
  x:number; y:number; open:boolean; items:MenuProps['items']
  onClose:()=>void; onSelect:(key:string)=>void
}) {
  if (!open) return null
  const safeX = Math.max(12, Math.min(x, window.innerWidth - 28))
  const safeY = Math.max(12, Math.min(y, window.innerHeight - 28))
  return (
    <Dropdown
      open={open}
      trigger={['click']}
      placement="bottomLeft"
      autoAdjustOverflow
      onOpenChange={visible => { if (!visible) onClose() }}
      menu={{ items, onClick: ({ key }) => {onSelect(key);onClose()} }}
    >
      <button type="button" tabIndex={-1} aria-label="Context menu position"
        style={{ position:'fixed',zIndex:85,left:safeX,top:safeY,width:2,height:2,opacity:0,pointerEvents:'none',padding:0 }} />
    </Dropdown>
  )
}
