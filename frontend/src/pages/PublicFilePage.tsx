import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, Flex, Result, Space, Spin, Typography } from 'antd'
import { DownloadOutlined, ExpandOutlined, FileOutlined, FileExcelOutlined, FileImageOutlined, FileTextOutlined, VideoCameraOutlined } from '@ant-design/icons'
import { API_URL, apiFetch, formatBytes, formatDate } from '@/lib/api'
import { createPlyr, ensurePlyr } from '@/lib/plyr'
import { getPreviewKind, isSpreadsheetMimeType, officeViewerUrl } from '@/lib/preview'
import { BrandLogo } from '@/components/drive/BrandLogo'

type PublicFile = { name: string; mimeType: string; sizeBytes: string; createdAt: string }
type PreviewType = ReturnType<typeof getPreviewKind>
function FileTypeIcon({kind,mimeType}:{kind:PreviewType;mimeType:string}) {
 return kind==='image'?<FileImageOutlined />:kind==='video'?<VideoCameraOutlined />:
 isSpreadsheetMimeType(mimeType)?<FileExcelOutlined />:kind==='document'?<FileTextOutlined />:<FileOutlined />
}
function UnsupportedPreview({file,downloadUrl}:{file:PublicFile;downloadUrl:string}) {
 return <Result status="info" title="Preview unavailable" subTitle={`${file.name} cannot be previewed in the browser. Download it to open it with a compatible application.`}
  extra={<Button type="primary" icon={<DownloadOutlined />} href={downloadUrl}>Download file</Button>} />
}
export function PublicFilePage({ embed = false }: { embed?: boolean }) {
  const { token } = useParams()
  const [file, setFile] = useState<PublicFile | null>(null)
  const [failed, setFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const previewUrl = `${API_URL}/public/files/${token}/preview`
  const downloadUrl = `${API_URL}/public/files/${token}/download`
  const kind = getPreviewKind(file?.mimeType)

  useEffect(() => {
    setFailed(false)
    apiFetch<{ file: PublicFile }>(`/public/files/${token}`, { skipAuth: true })
      .then((data) => setFile(data.file))
      .catch(() => {
        setFile(null)
        setFailed(true)
      })
  }, [token])

  useEffect(() => {
    document.title = file ? `${file.name} | OpenXdrive` : 'Shared file | OpenXdrive'
    return () => {
      document.title = 'OpenXdrive'
    }
  }, [file])

  useEffect(() => {
    if (kind !== 'video' || !videoRef.current) return undefined
    let disposed = false
    let player: { destroy: () => void } | null = null

    ensurePlyr().then(() => {
      if (disposed || !videoRef.current) return
      player = createPlyr(videoRef.current)
    }).catch(() => undefined)

    return () => {
      disposed = true
      player?.destroy()
    }
  }, [kind, previewUrl])


  if (failed) return <Flex align="center" justify="center" style={{minHeight:'100vh',background:'var(--ox-canvas)',padding:24}}>
    <Card style={{maxWidth:480,width:'100%'}}><Result status="404" title="Shared file not found" subTitle="This link may have expired, been disabled, or the file was removed." /></Card>
  </Flex>
  if (!file) return <Flex vertical align="center" justify="center" gap={17} style={{minHeight:'100vh',background:'var(--ox-canvas)'}}><Spin size="large"/><Typography.Text type="secondary">Loading shared file...</Typography.Text></Flex>
  const preview=(
    <Flex align="center" justify="center" style={{height:'100%',width:'100%',background:kind?'#0e1015':undefined,overflow:'hidden'}}>
      {kind==='image'&&<img src={previewUrl} alt={file.name} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} />}
      {kind==='video'&&<div className="shared-video-shell"><video ref={videoRef} controls playsInline preload="metadata"><source src={previewUrl} type={file.mimeType}/></video></div>}
      {kind==='document'&&<iframe src={previewUrl} title={file.name} style={{height:'100%',width:'100%',border:0,background:'white'}}/>}
      {kind==='office'&&<iframe src={officeViewerUrl(previewUrl)} title={file.name} style={{height:'100%',width:'100%',border:0,background:'white'}}/>}
      {!kind&&<div style={{background:'var(--ox-surface)',maxWidth:600}}><UnsupportedPreview file={file} downloadUrl={downloadUrl}/></div>}
    </Flex>
  )
  if(embed) return <main style={{width:'100vw',height:'100vh',overflow:'hidden'}}>{preview}</main>
  return <main style={{minHeight:'100vh',background:'var(--ox-canvas)'}}>
    <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{padding:'16px 24px',background:'var(--ox-surface)',borderBottom:'1px solid var(--ox-outline)'}}>
      <Flex align="center" gap={13} style={{minWidth:0}}>
        <BrandLogo className="h-9 w-9" />
        <FileTypeIcon kind={kind} mimeType={file.mimeType} />
        <div style={{minWidth:0}}>
          <Typography.Text strong ellipsis={{tooltip:file.name}} style={{display:'block',maxWidth:420}}>{file.name}</Typography.Text>
          <Typography.Text type="secondary" style={{fontSize:12}}>{formatBytes(file.sizeBytes)} · Uploaded {formatDate(file.createdAt)}</Typography.Text>
        </div>
      </Flex>
      <Space>
        <Button icon={<ExpandOutlined/>} href={`/public/files/${token}/embed`} target="_blank">Embed view</Button>
        <Button type="primary" icon={<DownloadOutlined/>} href={downloadUrl}>Download</Button>
      </Space>
    </Flex>
    <div style={{height:'calc(100vh - 89px)',minHeight:390,padding:16}}>
      <Card style={{height:'100%',overflow:'hidden',background:kind?'#0e1015':'var(--ox-surface)'}} styles={{body:{height:'100%',padding:0}}}>
        {preview}
      </Card>
    </div>
  </main>
}
