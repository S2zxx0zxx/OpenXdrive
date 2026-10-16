import type { ComponentType } from 'react'
import {
  FolderOutlined, FolderOpenOutlined, FileOutlined, FileTextOutlined,
  FileImageOutlined, FileZipOutlined, VideoCameraOutlined,
  CloudOutlined, CloudUploadOutlined, CloudDownloadOutlined, HddOutlined,
  DatabaseOutlined, DesktopOutlined, PictureOutlined, AudioOutlined,
  CodeOutlined, BookOutlined, CalendarOutlined, ClockCircleOutlined,
  TeamOutlined, UserOutlined, ShareAltOutlined, LockOutlined,
  SafetyCertificateOutlined, StarOutlined, HeartOutlined, RocketOutlined,
  AppstoreOutlined, ShoppingOutlined, ContainerOutlined, GiftOutlined,
} from '@ant-design/icons'
import { cn } from '@/lib/utils'
import type { FolderItem } from '@/data/drive-data'

const legacyColorMap: Record<string, string> = {
  'text-blue-500': '#3b82f6',
  'text-lime-500': '#84cc16',
  'text-cyan-400': '#22d3ee',
  'text-yellow-400': '#facc15',
  'text-orange-500': '#f97316',
}


export const defaultFolderColor = '#1677ff'

// Persisted icon identifiers are maintained for compatibility with existing
// database values. Their SVGs are rendered locally using Ant Design Icons.
// No network calls are made to iconify.
export const defaultFolderIconUrl = 'https://api.iconify.design/lucide:folder.svg'
export const folderIconOptions = [
  { label: 'Folder', url: 'https://api.iconify.design/lucide:folder.svg' },
  { label: 'Folder Open', url: 'https://api.iconify.design/lucide:folder-open.svg' },
  { label: 'Folders', url: 'https://api.iconify.design/lucide:folders.svg' },
  { label: 'Files', url: 'https://api.iconify.design/lucide:files.svg' },
  { label: 'File Text', url: 'https://api.iconify.design/lucide:file-text.svg' },
  { label: 'File Image', url: 'https://api.iconify.design/lucide:file-image.svg' },
  { label: 'File Video', url: 'https://api.iconify.design/lucide:file-video.svg' },
  { label: 'File Music', url: 'https://api.iconify.design/lucide:file-music.svg' },
  { label: 'File Code', url: 'https://api.iconify.design/lucide:file-code.svg' },
  { label: 'File Archive', url: 'https://api.iconify.design/lucide:file-archive.svg' },
  { label: 'Briefcase', url: 'https://api.iconify.design/lucide:briefcase.svg' },
  { label: 'Archive', url: 'https://api.iconify.design/lucide:archive.svg' },
  { label: 'Cloud', url: 'https://api.iconify.design/lucide:cloud.svg' },
  { label: 'Cloud Upload', url: 'https://api.iconify.design/lucide:cloud-upload.svg' },
  { label: 'Cloud Download', url: 'https://api.iconify.design/lucide:cloud-download.svg' },
  { label: 'Hard Drive', url: 'https://api.iconify.design/lucide:hard-drive.svg' },
  { label: 'Database', url: 'https://api.iconify.design/lucide:database.svg' },
  { label: 'Server', url: 'https://api.iconify.design/lucide:server.svg' },
  { label: 'Image', url: 'https://api.iconify.design/lucide:image.svg' },
  { label: 'Images', url: 'https://api.iconify.design/lucide:images.svg' },
  { label: 'Video', url: 'https://api.iconify.design/lucide:video.svg' },
  { label: 'Film', url: 'https://api.iconify.design/lucide:film.svg' },
  { label: 'Music', url: 'https://api.iconify.design/lucide:music.svg' },
  { label: 'Headphones', url: 'https://api.iconify.design/lucide:headphones.svg' },
  { label: 'Code', url: 'https://api.iconify.design/lucide:code.svg' },
  { label: 'Terminal', url: 'https://api.iconify.design/lucide:terminal.svg' },
  { label: 'Package', url: 'https://api.iconify.design/lucide:package.svg' },
  { label: 'Box', url: 'https://api.iconify.design/lucide:box.svg' },
  { label: 'Book Open', url: 'https://api.iconify.design/lucide:book-open.svg' },
  { label: 'Notebook', url: 'https://api.iconify.design/lucide:notebook.svg' },
  { label: 'Graduation Cap', url: 'https://api.iconify.design/lucide:graduation-cap.svg' },
  { label: 'Receipt', url: 'https://api.iconify.design/lucide:receipt.svg' },
  { label: 'Wallet', url: 'https://api.iconify.design/lucide:wallet.svg' },
  { label: 'Chart', url: 'https://api.iconify.design/lucide:chart-column.svg' },
  { label: 'Calendar', url: 'https://api.iconify.design/lucide:calendar.svg' },
  { label: 'Clock', url: 'https://api.iconify.design/lucide:clock.svg' },
  { label: 'Users', url: 'https://api.iconify.design/lucide:users.svg' },
  { label: 'User Check', url: 'https://api.iconify.design/lucide:user-check.svg' },
  { label: 'Share', url: 'https://api.iconify.design/lucide:share-2.svg' },
  { label: 'Lock', url: 'https://api.iconify.design/lucide:lock.svg' },
  { label: 'Shield', url: 'https://api.iconify.design/lucide:shield.svg' },
  { label: 'Star', url: 'https://api.iconify.design/lucide:star.svg' },
  { label: 'Heart', url: 'https://api.iconify.design/lucide:heart.svg' },
  { label: 'Rocket', url: 'https://api.iconify.design/lucide:rocket.svg' },
  { label: 'Sparkles', url: 'https://api.iconify.design/lucide:sparkles.svg' },
]

type VisualIcon = ComponentType<{ className?: string; style?: React.CSSProperties }>
const localIcons: Record<string, VisualIcon> = {
  folder:FolderOutlined, 'folder-open':FolderOpenOutlined, folders:FolderOutlined,
  files:FileOutlined, 'file-text':FileTextOutlined,'file-image':FileImageOutlined,
  'file-video':VideoCameraOutlined,'file-music':AudioOutlined,'file-code':CodeOutlined,
  'file-archive':FileZipOutlined, briefcase:ContainerOutlined, archive:FileZipOutlined,
  cloud:CloudOutlined,'cloud-upload':CloudUploadOutlined,'cloud-download':CloudDownloadOutlined,
  'hard-drive':HddOutlined,database:DatabaseOutlined,server:DesktopOutlined,
  image:PictureOutlined,images:PictureOutlined,video:VideoCameraOutlined,
  film:VideoCameraOutlined,music:AudioOutlined,headphones:AudioOutlined,
  code:CodeOutlined,terminal:CodeOutlined,package:GiftOutlined,box:GiftOutlined,
  'book-open':BookOutlined,notebook:BookOutlined,'graduation-cap':BookOutlined,
  receipt:FileTextOutlined,wallet:ShoppingOutlined,'chart-column':AppstoreOutlined,
  calendar:CalendarOutlined,clock:ClockCircleOutlined,users:TeamOutlined,
  'user-check':UserOutlined,'share-2':ShareAltOutlined,lock:LockOutlined,
  shield:SafetyCertificateOutlined,star:StarOutlined,heart:HeartOutlined,
  rocket:RocketOutlined,sparkles:StarOutlined,
}

export const folderColorOptions = ['#3b82f6', '#84cc16', '#22d3ee', '#facc15', '#f97316', '#ef4444', '#a855f7', '#14b8a6']

export function normalizeFolderColor(color?: string | null) {
  if (color?.startsWith('#')) return color
  return legacyColorMap[color ?? ''] ?? defaultFolderColor
}


export function FolderIcon({ iconUrl, color, className }: { iconUrl?: string | null; color:string; className?:string }) {
  const name=/^https:\/\/api\.iconify\.design\/lucide:([a-z0-9-]+)\.svg$/.exec(iconUrl || defaultFolderIconUrl)?.[1] ?? 'folder'
  const Icon=localIcons[name] ?? FolderOutlined
  return <Icon className={className} style={{fontSize:'inherit',color}} />
}

export function FolderVisual({folder,className,iconClassName}: {
 folder:Pick<FolderItem,'color'|'iconUrl'>;className?:string;iconClassName?:string
}) {
 return <span className={cn('inline-flex items-center justify-center',className)} style={{fontSize:'2em'}}>
  <FolderIcon iconUrl={folder.iconUrl} color={normalizeFolderColor(folder.color)} className={iconClassName} />
 </span>
}
