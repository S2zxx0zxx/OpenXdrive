import { Folder, FolderOpen, Folders, Files, FileText, FileImage, FileVideo, FileMusic, FileCode, FileArchive, Briefcase, Archive, Cloud, CloudUpload, CloudDownload, HardDrive, Database, Server, Image, Images, Video, Film, Music, Headphones, Code, Terminal, Package, Box, BookOpen, Notebook, GraduationCap, Receipt, Wallet, ChartColumn, Calendar, Clock, Users, UserCheck, Share2, Lock, Shield, Star, Heart, Rocket, Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FolderItem } from '@/data/drive-data'

const legacyColorMap: Record<string, string> = {
  'text-blue-500': '#3b82f6',
  'text-lime-500': '#84cc16',
  'text-cyan-400': '#22d3ee',
  'text-yellow-400': '#facc15',
  'text-orange-500': '#f97316',
}

export const defaultFolderColor = '#3b82f6'

// Keep the persisted legacy-compatible icon identifiers; the browser now renders
// each icon locally from lucide-react rather than calling a third-party SVG host.
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

const localFolderIcons: Record<string, LucideIcon> = {
  'folder': Folder,
  'folder-open': FolderOpen,
  'folders': Folders,
  'files': Files,
  'file-text': FileText,
  'file-image': FileImage,
  'file-video': FileVideo,
  'file-music': FileMusic,
  'file-code': FileCode,
  'file-archive': FileArchive,
  'briefcase': Briefcase,
  'archive': Archive,
  'cloud': Cloud,
  'cloud-upload': CloudUpload,
  'cloud-download': CloudDownload,
  'hard-drive': HardDrive,
  'database': Database,
  'server': Server,
  'image': Image,
  'images': Images,
  'video': Video,
  'film': Film,
  'music': Music,
  'headphones': Headphones,
  'code': Code,
  'terminal': Terminal,
  'package': Package,
  'box': Box,
  'book-open': BookOpen,
  'notebook': Notebook,
  'graduation-cap': GraduationCap,
  'receipt': Receipt,
  'wallet': Wallet,
  'chart-column': ChartColumn,
  'calendar': Calendar,
  'clock': Clock,
  'users': Users,
  'user-check': UserCheck,
  'share-2': Share2,
  'lock': Lock,
  'shield': Shield,
  'star': Star,
  'heart': Heart,
  'rocket': Rocket,
  'sparkles': Sparkles,
}

export const folderColorOptions = ['#3b82f6', '#84cc16', '#22d3ee', '#facc15', '#f97316', '#ef4444', '#a855f7', '#14b8a6']

export function normalizeFolderColor(color?: string | null) {
  if (color?.startsWith('#')) return color
  return legacyColorMap[color ?? ''] ?? defaultFolderColor
}

export function FolderIcon({ iconUrl, color, className }: { iconUrl?: string | null; color: string; className?: string }) {
  const id = /^https:\/\/api\.iconify\.design\/lucide:([a-z0-9-]+)\.svg$/.exec(iconUrl || defaultFolderIconUrl)?.[1] ?? 'folder'
  const Icon = localFolderIcons[id] ?? Folder
  return <Icon className={cn('h-full w-full stroke-current', className)} style={{ color }} aria-hidden="true" strokeWidth={1.8} />
}

export function FolderVisual({ folder, className, iconClassName }: { folder: Pick<FolderItem, 'color' | 'iconUrl'>; className?: string; iconClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center justify-center', className)}>
      <FolderIcon iconUrl={folder.iconUrl} color={normalizeFolderColor(folder.color)} className={iconClassName} />
    </span>
  )
}
