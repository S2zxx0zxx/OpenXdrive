import { FileImageOutlined, FilePdfOutlined, FileTextOutlined, VideoCameraOutlined } from '@ant-design/icons'
import type { FileItem } from '@/data/drive-data'

export function FileIcon({ kind, className }: { kind: FileItem['kind']; className?: string }) {
  const icon = kind === 'image' ? <FileImageOutlined /> : kind === 'video' ? <VideoCameraOutlined /> : kind === 'pdf' ? <FilePdfOutlined /> : <FileTextOutlined />
  const color = kind === 'image' ? '#0d9488' : kind === 'video' ? '#7c3aed' : kind === 'pdf' ? '#dc2626' : '#1677ff'
  const background = kind === 'image' ? '#e6f8f3' : kind === 'video' ? '#f2edff' : kind === 'pdf' ? '#fff0f0' : '#eaf3ff'
  return <span className={className} style={{ display:'inline-flex', justifyContent:'center', alignItems:'center', height:34, width:34, borderRadius:8, flexShrink:0, color, background, fontSize:17 }} aria-hidden="true">{icon}</span>
}
