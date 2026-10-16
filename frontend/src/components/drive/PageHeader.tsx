import type { ReactNode } from 'react'
import { Flex, Typography } from 'antd'

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: string; actions?: ReactNode }) {
  return (
    <Flex className="ox-page-header" justify="space-between" align="center" gap={16} wrap="wrap">
      <div className="ox-page-heading">
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 650, letterSpacing: '-.025em' }}>{title}</Typography.Title>
        {description && <Typography.Text type="secondary">{description}</Typography.Text>}
      </div>
      {actions && <Flex gap={8} wrap="wrap" className="ox-page-actions">{actions}</Flex>}
    </Flex>
  )
}
