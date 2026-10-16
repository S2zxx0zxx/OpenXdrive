import type { FileItem } from '@/data/drive-data'
import { formatBytes, formatDate } from '@/lib/api'
export type FileResponse = {
  id: string; name: string; mimeType: string; sizeBytes: string; createdAt: string;
  folderId?: string | null; folder?: { id: string; name: string } | null;
  starredAt?: string | null; archivedAt?: string | null; _count?: { shares: number };
  connectedAccount?: { id: string; email: string; provider: string } | null
}
export function toFileItem(file: FileResponse): FileItem {
  const mime = file.mimeType ?? ''
  const kind: FileItem['kind'] = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime === 'application/pdf' ? 'pdf' : 'doc'
  return {
    id: file.id, name: file.name, mimeType: mime, sizeBytes: file.sizeBytes,
    date: formatDate(file.createdAt), createdAt: file.createdAt,
    size: formatBytes(file.sizeBytes), kind,
    folderId: file.folderId, folderName: file.folder?.name ?? undefined,
    starredAt: file.starredAt ?? null, archivedAt: file.archivedAt ?? null,
    starredDate: file.starredAt ? formatDate(file.starredAt) : undefined,
    archivedDate: file.archivedAt ? formatDate(file.archivedAt) : undefined,
    location: file.folder?.name ?? 'Workspace root',
    accountEmail: file.connectedAccount?.email,
    accountProvider: file.connectedAccount?.provider,
    access: (file._count?.shares ?? 0)>0 ? 'Shared link' : 'Private', shared: file._count?.shares ?? 0,
  }
}
