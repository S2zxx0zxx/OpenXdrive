import { Alert, Button, Space, Typography } from 'antd'
import { EyeOutlined, SafetyCertificateOutlined } from '@ant-design/icons'

/** Prevent silently disclosing a private preview/share token to an external viewer. */
export function OfficeViewerConsent({ onContinue }: { onContinue: () => void }) {
  return <div style={{ padding: 24, maxWidth: 510, background: 'var(--ox-surface)', borderRadius: 12 }}>
    <Space direction="vertical" size={17} style={{ width: '100%' }}>
      <SafetyCertificateOutlined style={{ color: '#1677ff', fontSize: 33 }} />
      <Typography.Title level={4} style={{ margin: 0 }}>Preview with Office Online?</Typography.Title>
      <Typography.Paragraph style={{ margin: 0 }}>
        Office files cannot be rendered securely in this browser without an external document viewer.
      </Typography.Paragraph>
      <Alert type="warning" showIcon
        message="Your file link will be shared with Microsoft"
        description="Opening this preview sends a file-access URL to Microsoft Office Online so its servers can retrieve the document. Continue only if you are comfortable sharing it with that provider." />
      <Button icon={<EyeOutlined />} type="primary" onClick={onContinue}>
        Continue to Office Online
      </Button>
      <Typography.Text type="secondary">You can close this preview without sharing the file URL.</Typography.Text>
    </Space>
  </div>
}
