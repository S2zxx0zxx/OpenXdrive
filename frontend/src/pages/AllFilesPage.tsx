import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Button as AntButton, ColorPicker, Empty, Popconfirm, Segmented, Select, Space, Tooltip, Typography, Upload as AntUpload } from 'antd'
import { AppstoreOutlined, InboxOutlined, UnorderedListOutlined } from '@ant-design/icons'
import {
  CheckCircleOutlined as CheckCircle,
  DownloadOutlined as Download,
  FolderOpenOutlined as FolderInput,
  FolderAddOutlined as FolderPlus,
  ReloadOutlined as RefreshCw,
  DeleteOutlined as Trash2,
  UploadOutlined as Upload,
  CloseOutlined as X,
} from '@ant-design/icons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DummyModal } from '@/components/drive/DummyModal'
import { EmptyAreaContextMenu } from '@/components/drive/EmptyAreaContextMenu'
import { FileContextMenu } from '@/components/drive/FileContextMenu'
import { FileDetailsDrawer } from '@/components/drive/FileDetailsDrawer'
import { FileGrid } from '@/components/drive/FileGrid'
import { FileTable } from '@/components/drive/FileTable'
import { FolderContextMenu } from '@/components/drive/FolderContextMenu'
import { FolderGrid, type FolderSizeScale } from '@/components/drive/FolderGrid'
import { defaultFolderColor, defaultFolderIconUrl, folderColorOptions, folderIconOptions, normalizeFolderColor, FolderIcon } from '@/components/drive/FolderVisual'
import { PageHeader } from '@/components/drive/PageHeader'
import { Input } from '@/components/ui/input'
import { API_URL, apiFetch, formatBytes, formatDate } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import { createPlyr, ensurePlyr } from '@/lib/plyr'
import { getPreviewKind, officeViewerUrl } from '@/lib/preview'
import type { FileItem, FolderItem } from '@/data/drive-data'
import { useUpload } from '@/context/UploadContext'
import { useDriveLayoutActions } from '@/layouts/DriveLayout'

type BackendFile = { id: string; name: string; mimeType: string; sizeBytes: string; createdAt: string; folderId?: string | null; connectedAccount?: { email: string; provider: string }; folder?: { id: string; name: string } | null; starredAt?: string | null; archivedAt?: string | null; _count?: { shares: number } }
type BackendFolder = { id: string; name: string; color: string; iconUrl?: string | null; parentId?: string | null; providerFolderId?: string | null; updatedAt: string }
type ConnectedAccount = { id: string; provider: string; email: string; displayName?: string | null; status: string }

type FileViewMode = 'list' | 'grid'

const fileViewStorageKey = 'OpenXdrive:all-files-view-mode'

function getStoredFileViewMode(): FileViewMode {
  const stored = localStorage.getItem(fileViewStorageKey)
  return stored === 'grid' || stored === 'list' ? stored : 'list'
}

function mimeToKind(mimeType: string): FileItem['kind'] {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf')) return 'pdf'
  return 'doc'
}

function mapFile(file: BackendFile): FileItem {
  return { id: file.id, name: file.name, mimeType: file.mimeType, sizeBytes: file.sizeBytes, createdAt: file.createdAt, accountEmail: file.connectedAccount?.email, accountProvider: file.connectedAccount?.provider, date: formatDate(file.createdAt), size: formatBytes(file.sizeBytes), access: (file._count?.shares ?? 0)>0 ? 'Shared link' : 'Private', kind: mimeToKind(file.mimeType), shared: file._count?.shares ?? 0, folderId: file.folderId, folderName: file.folder?.name, starredAt: file.starredAt, archivedAt: file.archivedAt }
}

function mapFolder(folder: BackendFolder): FolderItem {
  return { id: folder.id, name: folder.name, color: folder.color, iconUrl: folder.iconUrl, parentId: folder.parentId, providerFolderId: folder.providerFolderId, updated: `Updated ${formatDate(folder.updatedAt)}` }
}



function FolderAppearanceFields({ color, iconUrl, onColorChange, onIconChange }: { color: string; iconUrl: string; onColorChange: (color: string) => void; onIconChange: (iconUrl: string) => void }) {
  const normalizedColor = normalizeFolderColor(color)
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold">Folder color<ColorPicker value={normalizedColor} showText onChange={value=>onColorChange(value.toHexString())} /></label>
      <Space wrap>{folderColorOptions.map(option => <Tooltip title={option} key={option}>
        <AntButton type="default" size="small" onClick={() => onColorChange(option)} aria-label={`Choose ${option} folder color`}
          style={{ background:option, border:normalizedColor===option?'2px solid #1677ff':'1px solid var(--ox-outline)',width:29,height:29,padding:0 }} />
      </Tooltip>)}</Space>
      <div className="grid gap-2 text-sm font-semibold"><span>Folder icon</span>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{folderIconOptions.map(option => <Tooltip key={option.url} title={option.label}>
          <AntButton type={iconUrl===option.url?'primary':'default'} onClick={() => onIconChange(option.url)}
            aria-label={`Choose ${option.label} folder icon`} style={{height:42,padding:5}}>
            <FolderIcon iconUrl={option.url} color={iconUrl===option.url?'#fff':normalizedColor} className="h-5 w-5" />
          </AntButton>
        </Tooltip>)}</div>
      </div>
    </div>
  )
}

export function AllFilesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFolderId = searchParams.get('folderId')
  const searchQuery = searchParams.get('q')?.trim() ?? ''
  const [uploadOpen, setUploadOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [folderRenameOpen, setFolderRenameOpen] = useState(false)
  const [folderDeleteOpen, setFolderDeleteOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copiedShareLink, setCopiedShareLink] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [allFolders, setAllFolders] = useState<FolderItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [folderName, setFolderName] = useState('')
  const [folderColor, setFolderColor] = useState(defaultFolderColor)
  const [folderIconUrl, setFolderIconUrl] = useState(defaultFolderIconUrl)
  const [renameValue, setRenameValue] = useState('')
  const [folderRenameValue, setFolderRenameValue] = useState('')
  const [folderRenameColor, setFolderRenameColor] = useState(defaultFolderColor)
  const [folderRenameIconUrl, setFolderRenameIconUrl] = useState(defaultFolderIconUrl)
  const [activeFile, setActiveFile] = useState<FileItem | null>(null)
  const [activeFolderForMenu, setActiveFolderForMenu] = useState<FolderItem | null>(null)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [cutFolder, setCutFolder] = useState<FolderItem | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem | null }>({ x: 0, y: 0, file: null })
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: FolderItem | null }>({ x: 0, y: 0, folder: null })
  const [emptyContextMenu, setEmptyContextMenu] = useState<{ x: number; y: number; open: boolean }>({ x: 0, y: 0, open: false })
  const [message, setMessage] = useState('')
  const [gdrivePublicUrl, setGdrivePublicUrl] = useState('')
  const [makingPublic, setMakingPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncingDrive, setSyncingDrive] = useState(false)
  const [fileViewMode, setFileViewMode] = useState<FileViewMode>(getStoredFileViewMode)
  const { uploadFiles } = useUpload()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteTargetType, setInviteTargetType] = useState<'file' | 'folder'>('file')
  const [inviteTargetId, setInviteTargetId] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviting, setInviting] = useState(false)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const [folderSizeScale, setFolderSizeScale] = useState<FolderSizeScale>(() => {
    const v = localStorage.getItem('OpenXdrive:folder-size')
    return (v === 'xs' || v === 'sm' || v === 'md' || v === 'lg') ? v : 'md'
  })
  const { setHeaderActions } = useDriveLayoutActions()
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [selectedTargetAccountId, setSelectedTargetAccountId] = useState('')

  function changeFolderSize(scale: FolderSizeScale) {
    setFolderSizeScale(scale)
    localStorage.setItem('OpenXdrive:folder-size', scale)
  }

  async function loadFiles() {
    const params = new URLSearchParams()
    if (activeFolderId) params.set('folderId', activeFolderId)
    if (searchQuery) params.set('q', searchQuery)

    // Add advanced search filters
    const kind = searchParams.get('kind')
    const accountId = searchParams.get('accountId')
    const minSize = searchParams.get('minSize')
    const maxSize = searchParams.get('maxSize')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (kind) params.set('kind', kind)
    if (accountId) params.set('accountId', accountId)
    if (minSize) params.set('minSize', minSize)
    if (maxSize) params.set('maxSize', maxSize)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    const query = params.toString()
    const path = query ? `/files?${query}` : '/files'
    const data = await apiFetch<{ files: BackendFile[] }>(path)
    setFiles(data.files.map(mapFile))
  }

  async function loadFolders() {
    const visiblePath = activeFolderId ? `/folders?parentId=${activeFolderId}` : '/folders'
    const [visibleData, allData] = await Promise.all([
      apiFetch<{ folders: BackendFolder[] }>(visiblePath),
      apiFetch<{ folders: BackendFolder[] }>('/folders?all=1'),
    ])
    setFolders(visibleData.folders.map(mapFolder))
    setAllFolders(allData.folders.map(mapFolder))
  }

  async function loadAll() {
    await Promise.all([loadFiles(), loadFolders()])
  }

  async function handleDropItem(fileId: string, targetFolderId: string) {
    const fileIds = selectedFileIds.has(fileId) ? Array.from(selectedFileIds) : [fileId]
    setLoading(true)
    setMessage('')
    try {
      await apiFetch('/files/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds, folderId: targetFolderId })
      })
      setMessage(`Successfully moved ${fileIds.length} item(s).`)
      loadAll().catch(() => undefined)
      setSelectedFileIds(new Set())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to move items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll().catch((error) => setMessage(error instanceof Error ? error.message : 'Failed to load files'))
    setSelectedFileIds(new Set())
  }, [activeFolderId, searchQuery])

  useEffect(() => {
    async function loadConnectedAccounts() {
      try {
        const data = await apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts')
        setConnectedAccounts(data.accounts || [])
      } catch (error) {
        console.error('Failed to load connected accounts:', error)
      }
    }
    loadConnectedAccounts()
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setContextMenu({ x: 0, y: 0, file: null })
      if (event.key === 'Escape') setFolderContextMenu({ x: 0, y: 0, folder: null })
      if (event.key === 'Escape') setEmptyContextMenu({ x: 0, y: 0, open: false })
      if (event.ctrlKey && event.key.toLowerCase() === 'x' && activeFolderForMenu) {
        event.preventDefault()
        cutSelectedFolder(activeFolderForMenu)
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'v' && cutFolder) {
        event.preventDefault()
        pasteFolder().catch((error) => setMessage(error instanceof Error ? error.message : 'Failed to paste folder'))
      }
    }

    function onOpenMoveShortcut(e: Event) {
      const file = (e as CustomEvent).detail as FileItem
      setActiveFile(file)
      setSelectedFolderId(file.folderId || '')
      setMoveOpen(true)
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('OpenXdrive:open-move-modal', onOpenMoveShortcut)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('OpenXdrive:open-move-modal', onOpenMoveShortcut)
    }
  }, [activeFolderForMenu, cutFolder, activeFolderId])

  useEffect(() => {
    if (!previewOpen || !activeFile?.mimeType?.startsWith('video/') || !previewVideoRef.current) return undefined
    let disposed = false
    let player: { destroy: () => void } | null = null

    ensurePlyr().then(() => {
      if (disposed || !previewVideoRef.current) return
      player = createPlyr(previewVideoRef.current)
    }).catch(() => undefined)

    return () => {
      disposed = true
      player?.destroy()
    }
  }, [previewOpen, activeFile?.mimeType, previewUrl])

  async function createFolder(event: FormEvent) {
    event.preventDefault()
    await apiFetch('/folders', { method: 'POST', body: JSON.stringify({ name: folderName, color: folderColor, iconUrl: folderIconUrl, parentId: activeFolderId ?? null }) })
    setFolderName('')
    setFolderColor(defaultFolderColor)
    setFolderIconUrl(defaultFolderIconUrl)
    setFolderOpen(false)
    await loadFolders()
  }

  async function uploadFile(event: FormEvent) {
    event.preventDefault()
    if (selectedFiles.length === 0) return
    setLoading(true)
    setMessage('')

    const uploadingFiles = [...selectedFiles]
    const targetFolderId = activeFolderId || selectedFolderId
    const targetAccountId = selectedTargetAccountId || null

    setSelectedFiles([])
    setSelectedFolderId('')
    setSelectedTargetAccountId('')
    setUploadOpen(false)

    try {
      await uploadFiles(uploadingFiles, targetFolderId, targetAccountId)
    } catch (err) {
      console.error('Upload initiation failed:', err)
    } finally {
      setLoading(false)
    }
  }


  async function syncGoogleDrive() {
    setSyncingDrive(true)
    setMessage('')
    try {
      const response = await apiFetch<{ results: { created: number; updated: number; deleted: number }[] }>('/files/sync-google', { method: 'POST', body: JSON.stringify({}) })

      let created = 0, updated = 0, deleted = 0
      for (const res of response.results) {
        created += res.created
        updated += res.updated
        deleted += res.deleted
      }
      const accounts = response.results.length

      setMessage(`Google Drive synced. ${created} added, ${updated} updated, ${deleted} removed across ${accounts} account${accounts === 1 ? '' : 's'}.`)
      await loadAll()
      window.dispatchEvent(new Event('OpenXdrive:storage-changed'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to sync Google Drive')
    } finally {
      setSyncingDrive(false)
    }
  }

  function removeUploadFile(index: number) {
    setSelectedFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))
  }

  function openContext(event: MouseEvent<HTMLElement>, file: FileItem) {
    event.preventDefault()
    event.stopPropagation()
    setActiveFile(file)
    setContextMenu({ x: event.clientX, y: event.clientY, file })
  }

  function toggleFileSelection(file: FileItem) {
    if (!file.id) return
    setSelectedFileIds((current) => {
      const next = new Set(current)
      if (next.has(file.id!)) next.delete(file.id!)
      else next.add(file.id!)
      return next
    })
  }

  function toggleAllVisibleFiles() {
    const visibleIds = files.map((file) => file.id).filter(Boolean) as string[]
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedFileIds.has(id))
    setSelectedFileIds(allSelected ? new Set() : new Set(visibleIds))
  }

  function clearSelection() {
    setSelectedFileIds(new Set())
  }

  function changeFileViewMode(mode: FileViewMode) {
    setFileViewMode(mode)
    localStorage.setItem(fileViewStorageKey, mode)
  }

  function openFolderMenu(event: MouseEvent<HTMLElement>, folder: FolderItem) {
    event.preventDefault()
    event.stopPropagation()
    setActiveFolderForMenu(folder)
    setFolderContextMenu({ x: event.clientX, y: event.clientY, folder })
  }

  function openFolder(folder: FolderItem) {
    if (!folder.id) return
    setSearchParams(searchQuery ? { folderId: folder.id, q: searchQuery } : { folderId: folder.id })
  }

  function openFolderById(folderId: string) {
    setSearchParams(searchQuery ? { folderId, q: searchQuery } : { folderId })
  }

  function openEmptyContextMenu(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    setEmptyContextMenu({ x: event.clientX, y: event.clientY, open: true })
  }

  function closeFolder() {
    setSearchParams(searchQuery ? { q: searchQuery } : {})
  }

  async function viewFile() {
    if (!activeFile?.id) return
    setPreviewUrl('')
    setPreviewError('')
    setPreviewLoading(true)
    setPreviewOpen(true)
    setContextMenu({ x: 0, y: 0, file: null })
    try {
      const data = await apiFetch<{ path?: string; url: string }>(`/files/${activeFile.id}/preview-token`, { method: 'POST' })
      const previewPath = data.path ?? new URL(data.url).pathname
      setPreviewUrl(`${API_URL}${previewPath}`)
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function downloadFile() {
    if (!activeFile?.id) return
    const response = await fetch(`${API_URL}/files/${activeFile.id}/download`, { headers: { Authorization: `Bearer ${getAccessToken()}` } })
    if (!response.ok) throw new Error('Download failed')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = activeFile.name
    link.click()
    URL.revokeObjectURL(url)
    setContextMenu({ x: 0, y: 0, file: null })
  }

  async function downloadBatchAsZip() {
    const selectedIds = [...selectedFileIds]
    if (selectedIds.length === 0) return
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_URL}/files/batch-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ fileIds: selectedIds })
      })
      if (!response.ok) throw new Error('Failed to download ZIP file')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'OpenXdrive-download.zip'
      link.click()
      URL.revokeObjectURL(url)
      clearSelection()
      setMessage('Batch download complete.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Batch download failed')
    } finally {
      setLoading(false)
    }
  }


  async function renameFile(event: FormEvent) {
    event.preventDefault()
    if (!activeFile?.id) return
    await apiFetch(`/files/${activeFile.id}`, { method: 'PATCH', body: JSON.stringify({ name: renameValue }) })
    setRenameOpen(false)
    await loadFiles()
  }

  async function moveFile(event: FormEvent) {
    event.preventDefault()
    const selectedIds = [...selectedFileIds]
    if (selectedIds.length > 0) await apiFetch('/files/batch', { method: 'PATCH', body: JSON.stringify({ fileIds: selectedIds, folderId: selectedFolderId || null }) })
    else if (activeFile?.id) await apiFetch(`/files/${activeFile.id}`, { method: 'PATCH', body: JSON.stringify({ folderId: selectedFolderId || null }) })
    else return
    setMoveOpen(false)
    setSelectedFolderId('')
    clearSelection()
    await loadFiles()
  }

  async function deleteFile() {
    const selectedIds = [...selectedFileIds]
    if (selectedIds.length > 0) await apiFetch('/files/batch', { method: 'DELETE', body: JSON.stringify({ fileIds: selectedIds }) })
    else if (activeFile?.id) await apiFetch(`/files/${activeFile.id}`, { method: 'DELETE' })
    else return
    setDeleteOpen(false)
    clearSelection()
    await loadFiles()
    window.dispatchEvent(new Event('OpenXdrive:storage-changed'))
  }

  async function updateFileCollection(file: FileItem, operation: 'starred' | 'archived') {
    if (!file.id) return
    try {
      const isEnabled = operation === 'starred' ? !file.starredAt : !file.archivedAt
      await apiFetch(`/files/${file.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [operation]: isEnabled }),
      })
      setMessage(operation === 'starred'
        ? (isEnabled ? 'File added to Starred.' : 'File removed from Starred.')
        : (isEnabled ? 'File moved to Archive.' : 'File restored from Archive.'))
      setSelectedFileIds(current => { const next = new Set(current); next.delete(file.id!); return next })
      await loadFiles()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update file.')
    }
  }

  async function shareFile() {
    if (!activeFile?.id) return
    const data = await apiFetch<{ url: string }>(`/files/${activeFile.id}/share`, { method: 'POST' })
    setShareUrl(data.url)
    setCopiedShareLink(false)
    setGdrivePublicUrl('')
    setMakingPublic(false)
    setShareOpen(true)
    setContextMenu({ x: 0, y: 0, file: null })
  }

  async function copyShareLinkDirect() {
    if (!activeFile?.id) return
    try {
      const data = await apiFetch<{ url: string | null }>(`/files/${activeFile.id}/view-url`)
      if (data.url) {
        await navigator.clipboard.writeText(data.url)
        setMessage('Google Drive link copied to clipboard!')
        setTimeout(() => setMessage(''), 2500)
      } else {
        const shareData = await apiFetch<{ url: string }>(`/files/${activeFile.id}/share`, { method: 'POST' })
        await navigator.clipboard.writeText(shareData.url)
        setMessage('Share link copied to clipboard!')
        setTimeout(() => setMessage(''), 2500)
      }
    } catch (err: any) {
      setMessage('Failed to copy link: ' + (err.message || err))
      setTimeout(() => setMessage(''), 2500)
    }
    setContextMenu({ x: 0, y: 0, file: null })
  }

  async function inviteToFile() {
    if (!activeFile?.id) return
    setInviteTargetType('file')
    setInviteTargetId(activeFile.id)
    setInviteOpen(true)
    setContextMenu({ x: 0, y: 0, file: null })
  }

  async function inviteToFolder() {
    if (!activeFolderForMenu?.id) return
    setInviteTargetType('folder')
    setInviteTargetId(activeFolderForMenu.id)
    setInviteOpen(true)
    setFolderContextMenu({ x: 0, y: 0, folder: null })
  }

  async function copyFolderLink() {
    if (!activeFolderForMenu?.id) return
    let url = `${window.location.origin}/all-files?folderId=${activeFolderForMenu.id}`
    if (activeFolderForMenu.providerFolderId) {
      url = `https://drive.google.com/open?id=${activeFolderForMenu.providerFolderId}`
    }
    await navigator.clipboard.writeText(url)
    setMessage('Folder link copied to clipboard!')
    setTimeout(() => setMessage(''), 2500)
    setFolderContextMenu({ x: 0, y: 0, folder: null })
  }

  async function sendInvite(event: FormEvent) {
    event.preventDefault()
    if (!inviteTargetId) return
    setInviting(true)
    setInviteMessage('')
    try {
      await apiFetch('/invites', { method: 'POST', body: JSON.stringify({ email: inviteEmail, role: inviteRole, targetType: inviteTargetType, targetId: inviteTargetId }) })
      setInviteEmail('')
      setInviteRole('viewer')
      setInviteMessage('Invite saved. Member will appear in Shared.')
      window.dispatchEvent(new Event('OpenXdrive:invites-changed'))
    } catch (error) {
      setInviteMessage(error instanceof Error ? error.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopiedShareLink(true)
    window.setTimeout(() => setCopiedShareLink(false), 1600)
  }

  async function renameFolder(event: FormEvent) {
    event.preventDefault()
    if (!activeFolderForMenu?.id) return
    await apiFetch(`/folders/${activeFolderForMenu.id}`, { method: 'PATCH', body: JSON.stringify({ name: folderRenameValue, color: folderRenameColor, iconUrl: folderRenameIconUrl }) })
    setFolderRenameOpen(false)
    await loadFolders()
  }

  async function deleteFolder() {
    if (!activeFolderForMenu?.id) return
    await apiFetch(`/folders/${activeFolderForMenu.id}`, { method: 'DELETE' })
    setFolderDeleteOpen(false)
    await loadFolders()
  }

  function cutSelectedFolder(folder: FolderItem | null) {
    if (!folder?.id) return
    setCutFolder(folder)
    setFolderContextMenu({ x: 0, y: 0, folder: null })
    setMessage(`Folder "${folder.name}" ready to move. Open target folder and press Ctrl+V.`)
  }

  async function pasteFolder() {
    if (!cutFolder?.id) return
    await apiFetch(`/folders/${cutFolder.id}`, { method: 'PATCH', body: JSON.stringify({ parentId: activeFolderId ?? null }) })
    setMessage(`Folder "${cutFolder.name}" moved.`)
    setCutFolder(null)
    await loadFolders()
  }

  function closePreview() {
    setPreviewUrl('')
    setPreviewError('')
    setPreviewLoading(false)
    setPreviewOpen(false)
  }

  useEffect(() => {
    function handleUploadCompleted() {
      loadAll().catch(() => undefined)
    }
    window.addEventListener('OpenXdrive:upload-completed', handleUploadCompleted)
    return () => window.removeEventListener('OpenXdrive:upload-completed', handleUploadCompleted)
  }, [activeFolderId])

  useEffect(() => {
    const sizeLabels: FolderSizeScale[] = ['xs', 'sm', 'md', 'lg']
    setHeaderActions(
      <div className="flex items-center gap-2">
        <Segmented aria-label="Folder tile size" value={folderSizeScale} onChange={value => changeFolderSize(value as FolderSizeScale)}
          options={sizeLabels.map(value => ({value,label:value.toUpperCase()}))} size="small" />
        {/* Divider */}
        <div className="hidden sm:block h-6 w-px bg-slate-200" />
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="h-3.5 w-3.5" />Upload
        </Button>
        <Button size="sm" variant="outline" onClick={() => setFolderOpen(true)}>
          <FolderPlus className="h-3.5 w-3.5" />New Folder
        </Button>
        <Button size="sm" variant="outline" disabled={syncingDrive} onClick={syncGoogleDrive}>
          <RefreshCw className={syncingDrive ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          {syncingDrive ? 'Syncing...' : 'Sync'}
        </Button>
      </div>
    )
    return () => setHeaderActions(null)
  }, [syncingDrive, folderSizeScale])


  const recentFolders = folders.slice(0, 4)
  const moreFolders = folders.slice(4)
  const activeFolder = allFolders.find((folder) => folder.id === activeFolderId)
  const folderBreadcrumbs = (() => {
    if (!activeFolder) return []
    const foldersById = new Map(allFolders.map((folder) => [folder.id, folder]))
    const path: FolderItem[] = []
    const visited = new Set<string>()
    let current: FolderItem | undefined = activeFolder
    while (current?.id && !visited.has(current.id)) {
      path.unshift(current)
      visited.add(current.id)
      current = current.parentId ? foldersById.get(current.parentId) : undefined
    }
    return path
  })()
  const allVisibleSelected = files.length > 0 && files.every((file) => file.id && selectedFileIds.has(file.id))
  const activePreviewKind = getPreviewKind(activeFile?.mimeType)

  return (
    <>
      <div onContextMenu={openEmptyContextMenu} className="min-h-[620px] w-full min-w-0">
      <PageHeader title={activeFolder ?
        <span style={{display:'inline-flex',alignItems:'baseline',gap:8,flexWrap:'wrap'}}>
          <Typography.Link href="#" onClick={e=>{e.preventDefault();closeFolder()}}>All files</Typography.Link>
          {folderBreadcrumbs.map((folder,index)=><span key={folder.id} style={{display:'inline-flex',gap:8,alignItems:'baseline'}}>
            <Typography.Text type="secondary">/</Typography.Text>
            {index===folderBreadcrumbs.length-1 ? <Typography.Text strong>{folder.name}</Typography.Text> :
              <Typography.Link href="#" onClick={e=>{e.preventDefault();folder.id&&openFolderById(folder.id)}}>{folder.name}</Typography.Link>}
          </span>)}
        </span> : 'All files'} />

      {/* Action buttons row — visible on mobile/tablet, hidden on desktop (desktop uses header slot) */}
      <div className="mt-4 flex flex-wrap items-center gap-2 lg:hidden">
        <Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="h-3.5 w-3.5" />Upload</Button>
        <Button size="sm" variant="outline" onClick={() => setFolderOpen(true)}><FolderPlus className="h-3.5 w-3.5" />New Folder</Button>
        <Button size="sm" variant="outline" disabled={syncingDrive} onClick={syncGoogleDrive}><RefreshCw className={syncingDrive ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />{syncingDrive ? 'Syncing...' : 'Sync'}</Button>
        <Segmented aria-label="Folder tile size" value={folderSizeScale}
          onChange={value => changeFolderSize(value as FolderSizeScale)}
          size="small" options={(['xs','sm','md','lg'] as FolderSizeScale[]).map(value=>({value,label:value.toUpperCase()}))}/>

      </div>
      {message ? <Alert style={{marginTop:16}} type="info" showIcon closable message={message} onClose={()=>setMessage('')} /> : null}
      {!activeFolder && (recentFolders.length > 0 ? <FolderGrid items={recentFolders} mobileTwoColumns sizeScale={folderSizeScale} onFolderMenu={openFolderMenu} onFolderOpen={openFolder} onDropItem={handleDropItem} /> : <Card className="mt-4 p-3"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No folders yet"><AntButton icon={<FolderPlus />} onClick={()=>setFolderOpen(true)}>New folder</AntButton></Empty></Card>)}
      {!activeFolder && moreFolders.length > 0 ? <>
        <Typography.Title level={5} style={{marginTop:24}}>More folders</Typography.Title>
        <FolderGrid items={moreFolders} sizeScale={folderSizeScale} onFolderMenu={openFolderMenu} onFolderOpen={openFolder} onDropItem={handleDropItem} />
      </> : null}
      {activeFolder && folders.length > 0 ? <>
        <Typography.Title level={5} style={{marginTop:24}}>Folders</Typography.Title>
        <FolderGrid items={folders} sizeScale={folderSizeScale} onFolderMenu={openFolderMenu} onFolderOpen={openFolder} onDropItem={handleDropItem} />
      </> : null}
      <div className="ox-context-utility" style={{marginTop:22,flexWrap:'wrap',justifyContent:'space-between'}}>
        <Space wrap size={8}>
          {selectedFileIds.size>0 ? <>
            <strong>{selectedFileIds.size} selected</strong>
            <Button variant="outline" size="sm" onClick={downloadBatchAsZip}><Download className="h-4 w-4" />Download ZIP</Button>
            <Button variant="outline" size="sm" onClick={()=>setMoveOpen(true)}><FolderInput className="h-4 w-4" />Move</Button>
            <Button variant="danger" size="sm" onClick={()=>setDeleteOpen(true)}><Trash2 className="h-4 w-4" />Delete</Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
          </> : <span className="text-sm font-semibold">{files.length} {files.length===1?'file':'files'}</span>}
        </Space>
        <Segmented value={fileViewMode} onChange={v=>changeFileViewMode(v as FileViewMode)} options={[
          {value:'list',label:<Space size={5}><UnorderedListOutlined />List</Space>},
          {value:'grid',label:<Space size={5}><AppstoreOutlined />Grid</Space>},
        ]}/>
      </div>
      {cutFolder ? <Alert type="warning" showIcon style={{marginTop:12}} message={`Moving: ${cutFolder.name}`} description="Open a destination folder and press Ctrl+V, or right-click an empty area to paste."/> : null}
      {files.length === 0 ? (
        <Card className="mt-3 p-5">
          <Empty description={searchQuery ? `No files match "${searchQuery}"` : activeFolder ? 'No files in this folder' : 'Your workspace has no files yet'}>
            {!searchQuery && <Button type="button" onClick={()=>setUploadOpen(true)}>Upload your first file</Button>}
          </Empty>
        </Card>
      ) : (
        <Card className="mt-3 p-4 sm:p-5">
          {fileViewMode === 'grid' ? (
            <FileGrid files={files} selectedFileIds={selectedFileIds} sizeScale={folderSizeScale} onToggleFile={toggleFileSelection} onFileContextMenu={openContext} onToggleStar={file => updateFileCollection(file, 'starred')} onToggleArchive={file => updateFileCollection(file, 'archived')} />
          ) : (
            <FileTable files={files} selectedFileIds={selectedFileIds} allSelected={allVisibleSelected} onToggleFile={toggleFileSelection} onToggleAll={toggleAllVisibleFiles} onFileContextMenu={openContext} onToggleStar={file => updateFileCollection(file, 'starred')} onToggleArchive={file => updateFileCollection(file, 'archived')} />
          )}
        </Card>
      )}
      </div>
      <EmptyAreaContextMenu x={emptyContextMenu.x} y={emptyContextMenu.y} open={emptyContextMenu.open} canPasteFolder={Boolean(cutFolder)} onClose={() => setEmptyContextMenu({ x: 0, y: 0, open: false })} onUpload={() => { setUploadOpen(true); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} onCreateFolder={() => { setFolderOpen(true); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} onPasteFolder={() => { pasteFolder().catch((error) => setMessage(error instanceof Error ? error.message : 'Failed to paste folder')); setEmptyContextMenu({ x: 0, y: 0, open: false }) }} />
      <FileContextMenu x={contextMenu.x} y={contextMenu.y} file={contextMenu.file} onClose={() => setContextMenu({ x: 0, y: 0, file: null })} onView={viewFile} onDownload={downloadFile} onRename={() => { setRenameValue(activeFile?.name ?? ''); setRenameOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onMove={() => { setMoveOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onDetails={() => { setDetailOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} onShare={shareFile} onCopyLink={copyShareLinkDirect} onInvite={inviteToFile} onToggleStar={() => activeFile && updateFileCollection(activeFile, 'starred')} onToggleArchive={() => activeFile && updateFileCollection(activeFile, 'archived')} onDelete={() => { setDeleteOpen(true); setContextMenu({ x: 0, y: 0, file: null }) }} />
      <FolderContextMenu x={folderContextMenu.x} y={folderContextMenu.y} folder={folderContextMenu.folder} onClose={() => setFolderContextMenu({ x: 0, y: 0, folder: null })} onCut={() => cutSelectedFolder(activeFolderForMenu)} onRename={() => { setFolderRenameValue(activeFolderForMenu?.name ?? ''); setFolderRenameColor(normalizeFolderColor(activeFolderForMenu?.color)); setFolderRenameIconUrl(activeFolderForMenu?.iconUrl ?? defaultFolderIconUrl); setFolderRenameOpen(true); setFolderContextMenu({ x: 0, y: 0, folder: null }) }} onInvite={inviteToFolder} onCopyLink={copyFolderLink} onDelete={() => { setFolderDeleteOpen(true); setFolderContextMenu({ x: 0, y: 0, folder: null }) }} />
      <FileDetailsDrawer open={detailOpen} file={activeFile} onClose={() => setDetailOpen(false)} />

      <DummyModal open={uploadOpen} title="Upload File" description="Stream files directly to your Google Drive or S3-compatible storage." onClose={() => setUploadOpen(false)}>
        <form onSubmit={uploadFile} className="grid gap-4">
           <AntUpload.Dragger
             multiple
             showUploadList={false}
             beforeUpload={file => {
               setSelectedFiles(current => {
                 const duplicate=current.some(item=>item.name===file.name && item.size===file.size && item.lastModified===file.lastModified)
                 return duplicate ? current : [...current, file]
               })
               return false
             }}
             style={{borderRadius:12,background:'var(--ox-canvas)',padding:'12px'}}
           >
             <p className="ant-upload-drag-icon"><InboxOutlined /></p>
             <p className="ant-upload-text">Drag files here or select from your device</p>
             <p className="ant-upload-hint">Uploads stream to the selected Google Drive or S3 storage account.</p>
           </AntUpload.Dragger>
          <label className="grid gap-2 text-sm font-semibold">
            Target Storage Account
            <Select
              value={selectedTargetAccountId}
              onChange={setSelectedTargetAccountId}
              options={[
                {value:'',label:'Automatic (recommended)'},
                ...connectedAccounts.map(account=>({value:account.id,label:`${account.email || account.displayName || account.id} (${account.provider === 's3' ? 'S3' : 'Google Drive'})`})),
              ]}
            />
          </label>
          {activeFolder ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Uploading to: <b>{activeFolder.name}</b></p> : <label className="grid gap-2 text-sm font-semibold">Virtual folder<Select value={selectedFolderId} onChange={setSelectedFolderId} options={[{value:"",label:"No folder"},...allFolders.filter(folder=>folder.id).map(folder=>({value:folder.id!,label:folder.name}))]} /></label>}
          {selectedFiles.length > 0 ? <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-950">{selectedFiles.length} selected</span><span className="shrink-0">{formatBytes(selectedFiles.reduce((total, file) => total + file.size, 0))}</span></div>{selectedFiles.map((file, index) => <div key={`${file.name}-${file.size}-${index}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"><span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span><span className="shrink-0 text-xs text-slate-500">{formatBytes(file.size)}</span><button type="button" className="shrink-0 text-slate-500 hover:text-red-600" onClick={() => removeUploadFile(index)} aria-label={`Remove ${file.name}`}><X className="h-4 w-4" /></button></div>)}</div> : null}
          <div className="grid gap-3 sm:flex sm:justify-end"><Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button><Button disabled={loading || selectedFiles.length === 0}>{loading ? 'Uploading...' : `Upload${selectedFiles.length > 1 ? ` ${selectedFiles.length} files` : ''}`}</Button></div>
        </form>
      </DummyModal>
       <DummyModal open={folderOpen} title="New Folder" description="Create a virtual folder for organizing files." onClose={() => setFolderOpen(false)}>
        <form onSubmit={createFolder} className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">Folder Name<Input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Project Assets" required /></label>
          <FolderAppearanceFields color={folderColor} iconUrl={folderIconUrl} onColorChange={setFolderColor} onIconChange={setFolderIconUrl} />
          <div className="grid gap-3 pt-2 sm:flex sm:justify-end"><Button type="button" variant="outline" onClick={() => setFolderOpen(false)}>Cancel</Button><Button>Create Folder</Button></div>
        </form>
      </DummyModal>
      <DummyModal open={renameOpen} title="Rename File" description={activeFile?.name ?? ''} onClose={() => setRenameOpen(false)}><form onSubmit={renameFile} className="grid gap-4"><Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} required /><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button><Button>Rename</Button></div></form></DummyModal>
      <DummyModal open={moveOpen} title="Move to Folder" description={selectedFileIds.size > 0 ? `Move ${selectedFileIds.size} files` : activeFile?.name ?? ''} onClose={() => setMoveOpen(false)}><form onSubmit={moveFile} className="grid gap-4"><Select value={selectedFolderId} onChange={setSelectedFolderId} options={[{value:"",label:"No folder"},...allFolders.filter(folder=>folder.id).map(folder=>({value:folder.id!,label:folder.name}))]} /><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>Cancel</Button><Button>Move</Button></div></form></DummyModal>
      <DummyModal open={deleteOpen} title={selectedFileIds.size > 0 ? 'Delete Files' : 'Delete File'} description={selectedFileIds.size > 0 ? `Move ${selectedFileIds.size} files to the recycle bin?` : `Move ${activeFile?.name ?? 'file'} to the recycle bin?`} onClose={() => setDeleteOpen(false)}><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="danger" onClick={deleteFile}>Delete</Button></div></DummyModal>
      <DummyModal open={shareOpen} title="Share Link" description={activeFile?.name ?? ''} onClose={() => setShareOpen(false)}>
        <div className="grid gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">OpenXdrive Public Share Link (No GDrive login required)</label>
            <Input value={shareUrl} readOnly />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShareOpen(false)}>Close</Button>
            <Button onClick={copyShareLink}>{copiedShareLink ? <CheckCircle className="h-4 w-4" /> : null}{copiedShareLink ? 'Copied!' : 'Copy Link'}</Button>
          </div>
          {copiedShareLink ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Share link copied to clipboard.</p> : null}

          {activeFile?.accountProvider === 'google_drive' && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Google Drive Direct Link (Public Access)</label>
                <p className="text-xs text-slate-500 mb-2">Anyone with the direct Google Drive link will be able to view or download this file. Make sure it contains no private information.</p>
              </div>
              {gdrivePublicUrl ? (
                <div className="grid gap-2">
                  <Typography.Paragraph copyable={{ text: gdrivePublicUrl }} style={{ overflowWrap: 'anywhere', marginBottom: 4 }}>{gdrivePublicUrl}</Typography.Paragraph>
                  <Typography.Text type="secondary">Public read-only link created. Use the copy control above to share it.</Typography.Text>
                </div>
              ) : (
                <Popconfirm
                  title="Make this file public?"
                  description="Anyone with this link can view or download the file."
                  okText="Make public (view only)"
                  cancelText="Keep private"
                  onConfirm={async () => {
                    if (!activeFile?.id) return
                    setMakingPublic(true)
                    try {
                      const res = await apiFetch<{ url: string }>('/files/' + activeFile.id + '/public-permission', { method: 'POST' })
                      setGdrivePublicUrl(res.url)
                    } catch (err) {
                      alert('Failed to update Google Drive permission: ' + (err instanceof Error ? err.message : String(err)))
                    } finally {
                      setMakingPublic(false)
                    }
                  }}
                >
                <Button
                  variant="outline"
                  disabled={makingPublic}
                  className="w-full text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900/50"
                >
                  {makingPublic ? 'Making public...' : 'Make public (view only)'}
                </Button>
                </Popconfirm>
              )}
            </div>
          )}
        </div>
      </DummyModal>
      <DummyModal open={folderRenameOpen} title="Rename Folder" description={activeFolderForMenu?.name ?? ''} onClose={() => setFolderRenameOpen(false)}><form onSubmit={renameFolder} className="grid gap-4"><Input value={folderRenameValue} onChange={(event) => setFolderRenameValue(event.target.value)} required /><FolderAppearanceFields color={folderRenameColor} iconUrl={folderRenameIconUrl} onColorChange={setFolderRenameColor} onIconChange={setFolderRenameIconUrl} /><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setFolderRenameOpen(false)}>Cancel</Button><Button>Rename</Button></div></form></DummyModal>
      <DummyModal open={folderDeleteOpen} title="Delete Folder" description={`Delete virtual folder ${activeFolderForMenu?.name ?? ''}? Files inside will remain uploaded.`} onClose={() => setFolderDeleteOpen(false)}><div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setFolderDeleteOpen(false)}>Cancel</Button><Button variant="danger" onClick={deleteFolder}>Delete</Button></div></DummyModal>
      <DummyModal open={inviteOpen} title="Invite Member" description={`Share ${inviteTargetType === 'file' ? (activeFile?.name ?? 'file') : (activeFolderForMenu?.name ?? 'folder')} with a team member.`} onClose={() => setInviteOpen(false)}>
        <form onSubmit={sendInvite} className="grid gap-4">
          <label className="grid gap-2 text-sm font-semibold">Email Address<Input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="member@example.com" required /></label>
          <label className="grid gap-2 text-sm font-semibold">Role<Select value={inviteRole} onChange={setInviteRole} options={[{value:"viewer",label:"Can view"},{value:"editor",label:"Can edit"}]} /></label>
          {inviteMessage ? <p className="rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-700">{inviteMessage}</p> : null}
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button disabled={inviting}>{inviting ? 'Sending...' : 'Send Invite'}</Button></div>
        </form>
      </DummyModal>
      <DummyModal open={previewOpen} title="File Preview" description={activeFile?.name ?? ''} onClose={closePreview} width="min(1400px, 95vw)" className="overflow-hidden">
        <div className="flex h-[72dvh] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-[80vh]">
          {previewLoading ? <div className="p-6 text-center text-sm font-semibold text-slate-500">Loading preview...</div> : null}
          {previewError ? <div className="p-6 text-center text-sm text-red-600">{previewError}</div> : null}
          {!previewLoading && !previewError && activePreviewKind === 'image' && previewUrl ? <img src={previewUrl} alt={activeFile?.name ?? 'File preview'} className="max-h-full max-w-full object-contain" onError={() => setPreviewError('Failed to load preview.')} /> : null}
          {!previewLoading && !previewError && activePreviewKind === 'video' && previewUrl ? <div className="shared-video-shell"><video ref={previewVideoRef} controls playsInline preload="metadata" onError={() => setPreviewError('Failed to load preview.')}><source src={previewUrl} type={activeFile?.mimeType} /></video></div> : null}
          {!previewLoading && !previewError && activePreviewKind === 'document' && previewUrl ? <iframe src={previewUrl} title={activeFile?.name ?? 'File preview'} className="h-full w-full border-0 bg-white" /> : null}
          {!previewLoading && !previewError && activePreviewKind === 'office' && previewUrl ? <iframe src={officeViewerUrl(previewUrl)} title={activeFile?.name ?? 'File preview'} className="h-full w-full border-0 bg-white" /> : null}
          {!previewLoading && !previewError && !activePreviewKind ? <div className="p-6 text-center text-sm text-slate-500">Preview not available for this file type. Use Download instead.</div> : null}
        </div>
      </DummyModal>
    </>
  )
}
