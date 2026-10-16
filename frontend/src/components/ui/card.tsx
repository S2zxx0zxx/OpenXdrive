import type { HTMLAttributes } from 'react'
import { Card as AntCard } from 'antd'

export function Card({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <AntCard className={className} styles={{ body: { padding: 0 } }} {...rest}>
      {children}
    </AntCard>
  )
}
