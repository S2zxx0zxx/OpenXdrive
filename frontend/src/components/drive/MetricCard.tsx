import type { ComponentType, CSSProperties } from 'react'
import { Card, Statistic } from 'antd'

export function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: ComponentType<{ className?: string; style?: CSSProperties }> }) {
  return (
    <Card className="ox-metric-card">
      <div className="ox-metric-inner">
        <Statistic title={label} value={value} />
        <span className="ox-metric-icon"><Icon style={{ fontSize: 20 }} /></span>
      </div>
    </Card>
  )
}
