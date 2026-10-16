import { Drawer, Descriptions, Typography, Tag } from 'antd'
import { formatBytes, formatDate } from '@/lib/api'
import type { FileItem } from '@/data/drive-data'

function labelProvider(provider?: string) {
  return provider === 'google_drive' ? 'Google Drive' : provider === 's3' ? 'S3-compatible storage' : 'Unknown provider'
}

export function FileDetailsDrawer({ open, file, onClose }: { open: boolean; file: FileItem | null; onClose: () => void }) {
  return <Drawer open={open} onClose={onClose} title="File details" width={430} destroyOnHidden>
    {file && <>
      <Typography.Title level={4} style={{ marginTop: 0, overflowWrap: 'anywhere' }}>{file.name}</Typography.Title>
      <Tag color="blue" style={{ marginBottom: 20 }}>{labelProvider(file.accountProvider)}</Tag>
      <Descriptions column={1} bordered size="middle" styles={{ label: { width: 145 } }} items={[
        { key: 'name', label: 'Name', children: file.name },
        { key: 'size', label: 'File size', children: file.sizeBytes ? formatBytes(file.sizeBytes) : file.size },
        { key: 'upload', label: 'Uploaded at', children: file.createdAt ? formatDate(file.createdAt) : file.date },
        { key: 'owner', label: 'Account', children: file.accountEmail ?? file.access },
        { key: 'provider', label: 'Provider', children: labelProvider(file.accountProvider) },
        { key: 'folder', label: 'Folder', children: file.folderName ?? 'Root' },
        { key: 'mime', label: 'Content type', children: file.mimeType ?? 'Unknown' },
      ]} />
    </>}
  </Drawer>
}
