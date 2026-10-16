import { Avatar, Tooltip } from 'antd'

// Representative member counts without external demo-face services.
export function AvatarStack({ count }: {count:number}) {
  const total=Math.max(0,Math.floor(count))
  if (!total) return null
  const visible=Math.min(total,3)
  return <Avatar.Group max={{count:4}} size="small">
    {Array.from({length:visible},(_,i)=><Tooltip key={i} title="Shared member">
      <Avatar style={{background:'#dbeafe',color:'#175cd3',fontSize:10}}>{i+1}</Avatar>
    </Tooltip>)}
    {total>visible && <Avatar style={{background:'#eef2f7',color:'#334155',fontSize:10}}>+{total-visible}</Avatar>}
  </Avatar.Group>
}
