import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Avatar, Button, Card, Col, Divider, Empty, Flex, Input, Modal, Progress, Row, Select, Space, Statistic, Switch, Tag, Typography } from 'antd'
import { CloudOutlined, DatabaseOutlined, LinkOutlined, ReloadOutlined, SafetyCertificateOutlined, SettingOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons'
import { PageHeader } from '@/components/drive/PageHeader'
import { apiFetch, formatBytes } from '@/lib/api'
import { getLocalAvatarUrl } from '@/lib/avatar'
import { getStoredUser } from '@/lib/auth'

type ConnectedAccount = { id: string; provider: string; email: string; displayName?: string | null; status: string; storageAccount?: { totalBytes: string | null; usedBytes: string; availableBytes: string | null; lastSyncedAt: string | null } | null }

function providerLabel(provider: string) {
  if (provider === 's3') return 'S3 Storage'
  return 'Google Drive'
}

function storageLimitLabel(account: ConnectedAccount) {
  if (account.provider === 's3' && account.storageAccount?.totalBytes === null) return 'Unlimited'
  return formatBytes(account.storageAccount?.totalBytes)
}

function availableLabel(account: ConnectedAccount) {
  if (account.provider === 's3' && account.storageAccount?.availableBytes === null) return 'Unlimited'
  return formatBytes(account.storageAccount?.availableBytes)
}

export function SettingsPage() {
  const user = getStoredUser()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [message, setMessage] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [s3Open, setS3Open] = useState(false)
  const [connectingS3, setConnectingS3] = useState(false)
  const [s3Form, setS3Form] = useState({ name: '', bucket: '', region: 'us-east-1', endpoint: '', accessKeyId: '', secretAccessKey: '', forcePathStyle: false, quotaBytes: '' })
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null)
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<string | null>(null)
  const [accountToDisconnect, setAccountToDisconnect] = useState<ConnectedAccount | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [avatarError, setAvatarError] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  // Google OAuth Config states
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [googleRedirectUri, setGoogleRedirectUri] = useState('')
  const [defaultRedirectUri, setDefaultRedirectUri] = useState('')
  const [hasSecret, setHasSecret] = useState(false)
  const [savingGoogleConfig, setSavingGoogleConfig] = useState(false)
  const [showGoogleHelp, setShowGoogleHelp] = useState(false)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)

  async function saveGoogleConfig(event: FormEvent) {
    event.preventDefault()
    setSavingGoogleConfig(true)
    setMessage('')
    try {
      const res = await apiFetch<{ message: string }>('/system/google-config', {
        method: 'POST',
        body: JSON.stringify({
          clientId: googleClientId,
          clientSecret: googleClientSecret || undefined,
          redirectUri: googleRedirectUri || defaultRedirectUri,
        }),
      })
      setMessage(res.message || 'Google OAuth credentials saved.')
      setHasSecret(true)
      setGoogleClientSecret('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save Google OAuth configuration')
    } finally {
      setSavingGoogleConfig(false)
    }
  }

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? accounts[0] ?? null

  async function load() {
    const data = await apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts')
    setAccounts(data.accounts)
    const permissions = await apiFetch<{ isSystemAdmin: boolean }>('/system/permissions')
    setIsSystemAdmin(permissions.isSystemAdmin)
    if (permissions.isSystemAdmin) {
      const configData = await apiFetch<{ exists: boolean; clientId: string; redirectUri: string; hasSecret: boolean; defaultRedirectUri: string }>('/system/google-config')
      if (configData.exists) {
        setGoogleClientId(configData.clientId || '')
        setGoogleRedirectUri(configData.redirectUri || '')
        setHasSecret(configData.hasSecret || false)
      }
      setDefaultRedirectUri(configData.defaultRedirectUri || '')
    }
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : 'Failed to load settings'))
  }, [])

  useEffect(() => {
    setAvatarError(false)
    getLocalAvatarUrl(user?.email, 96).then(setProfileImageUrl).catch(() => setProfileImageUrl(''))
  }, [user?.email])

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedAccountId('')
      return
    }
    if (!accounts.some((account) => account.id === selectedAccountId)) setSelectedAccountId(accounts[0].id)
  }, [accounts, selectedAccountId])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== 'GOOGLE_CONNECTED') return
      setMessage(event.data.status === 'success' ? 'Google Drive connected.' : 'Google Drive connection failed.')
      load().then(() => {
        window.dispatchEvent(new Event('OpenXdrive:storage-changed'))
      }).catch(() => undefined)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  async function connectDrive() {
    setConnecting(true)
    setMessage('')
    const popup = window.open('', 'google-drive-connect', 'width=540,height=720')
    if (popup) {
      popup.document.write('<html><head><title>Connecting...</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#64748b;}</style></head><body><div style="text-align:center;"><h2>Connecting to Google...</h2><p>Please wait while we redirect you.</p></div></body></html>')
    }
    try {
      const data = await apiFetch<{ url: string }>('/connected-accounts/google/connect-url')
      if (popup) {
        popup.location.href = data.url
      } else {
        window.location.href = data.url
      }
    } catch (error) {
      if (popup) popup.close()
      setMessage(error instanceof Error ? error.message : 'Failed to start Google Drive connection')
    } finally {
      setConnecting(false)
    }
  }

  async function sync(accountId: string) {
    setSyncingAccountId(accountId)
    try {
      await apiFetch(`/connected-accounts/${accountId}/sync-quota`, { method: 'POST' })
      await load()
      window.dispatchEvent(new Event('OpenXdrive:storage-changed'))
    } finally {
      setSyncingAccountId(null)
    }
  }

  async function disconnect() {
    if (!accountToDisconnect) return
    setDisconnectingAccountId(accountToDisconnect.id)
    setMessage('')
    try {
      await apiFetch(`/connected-accounts/${accountToDisconnect.id}`, { method: 'DELETE' })
      setAccountToDisconnect(null)
      setMessage('Storage account disconnected.')
      await load()
      window.dispatchEvent(new Event('OpenXdrive:storage-changed'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to disconnect Google Drive account')
    } finally {
      setDisconnectingAccountId(null)
    }
  }

  async function connectS3(event: FormEvent) {
    event.preventDefault()
    setConnectingS3(true)
    setMessage('')
    try {
      await apiFetch('/connected-accounts/s3', { method: 'POST', body: JSON.stringify({ ...s3Form, endpoint: s3Form.endpoint || undefined, quotaBytes: s3Form.quotaBytes || null }) })
      setS3Open(false)
      setS3Form({ name: '', bucket: '', region: 'us-east-1', endpoint: '', accessKeyId: '', secretAccessKey: '', forcePathStyle: false, quotaBytes: '' })
      setMessage('S3 storage connected.')
      await load()
      window.dispatchEvent(new Event('OpenXdrive:storage-changed'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to connect S3 storage')
    } finally {
      setConnectingS3(false)
    }
  }

  const storagePercent = selectedAccount?.storageAccount?.totalBytes
    ? Math.min(100, Math.round(Number(selectedAccount.storageAccount.usedBytes) / Number(selectedAccount.storageAccount.totalBytes) * 100))
    : 0

  return <>
    <PageHeader title="Workspace settings" description="Manage connected storage, authentication credentials and account preferences."
      actions={<Space wrap>
        <Button icon={<DatabaseOutlined />} onClick={()=>setS3Open(true)}>Connect S3</Button>
        <Button type="primary" icon={<LinkOutlined />} loading={connecting} onClick={connectDrive}>Connect Google Drive</Button>
      </Space>} />
    {message && <Alert type="info" showIcon closable message={message} onClose={()=>setMessage('')} style={{marginBottom:18}} />}
    <Row gutter={[18,18]}>
      <Col xs={24} lg={15} xl={16}>
        <Space direction="vertical" size={18} style={{width:'100%'}}>
          <Card title="Your account">
            <Flex align="center" gap={16}>
              <Avatar size={58} shape="square" src={!avatarError ? profileImageUrl : undefined} onError={()=>{setAvatarError(true);return false}} style={{background:'#1677ff',fontSize:23}}>
                {(user?.name || user?.email || 'U').trim().charAt(0).toUpperCase()}
              </Avatar>
              <div style={{minWidth:0}}>
                <Typography.Text strong style={{display:'block',fontSize:16}}>{user?.name || 'User'}</Typography.Text>
                <Typography.Text type="secondary">{user?.email || 'Account email unavailable'}</Typography.Text>
                <div style={{marginTop:6}}><Tag color="blue" bordered={false}>Self-hosted account</Tag></div>
              </div>
            </Flex>
          </Card>
          <Card title={<Space><CloudOutlined/>Connected storage accounts</Space>} extra={<Typography.Text type="secondary">{accounts.length} connected</Typography.Text>}>
            {accounts.length===0 ? <Empty description="No storage accounts connected">
              <Button type="primary" onClick={connectDrive} loading={connecting}>Connect Google Drive</Button>
            </Empty> : <>
              <Typography.Text type="secondary" style={{display:'block',marginBottom:10}}>Choose an account to view quota and manage the connection.</Typography.Text>
              <Select value={selectedAccount?.id} style={{width:'100%',marginBottom:19}} onChange={setSelectedAccountId}
                options={accounts.map(a=>({value:a.id,label:`${a.displayName || a.email} · ${providerLabel(a.provider)}`}))}/>
              {selectedAccount && <>
                <Flex align="center" justify="space-between" gap={12} wrap="wrap" style={{marginBottom:14}}>
                  <Space>
                    {selectedAccount.provider==='s3'?<DatabaseOutlined style={{fontSize:26,color:'#1677ff'}}/>:<CloudOutlined style={{fontSize:26,color:'#1677ff'}}/>}
                    <div><Typography.Text strong style={{display:'block'}}>{selectedAccount.displayName || selectedAccount.email}</Typography.Text>
                      <Typography.Text type="secondary">{providerLabel(selectedAccount.provider)} · {selectedAccount.email}</Typography.Text></div>
                  </Space>
                  <Tag color={selectedAccount.status==='connected'?'green':'orange'}>{selectedAccount.status}</Tag>
                </Flex>
                <Row gutter={[12,12]}>
                  <Col span={8}><Card size="small"><Statistic title="Used" value={formatBytes(selectedAccount.storageAccount?.usedBytes)} valueStyle={{fontSize:16}} /></Card></Col>
                  <Col span={8}><Card size="small"><Statistic title="Capacity" value={storageLimitLabel(selectedAccount)} valueStyle={{fontSize:16}} /></Card></Col>
                  <Col span={8}><Card size="small"><Statistic title="Available" value={availableLabel(selectedAccount)} valueStyle={{fontSize:16}} /></Card></Col>
                </Row>
                <Progress percent={storagePercent} size="small" showInfo style={{marginTop:12}} />
                <Flex justify="end" gap={8} style={{marginTop:14}}>
                  <Button icon={<ReloadOutlined/>} loading={syncingAccountId===selectedAccount.id} onClick={()=>sync(selectedAccount.id)}>Refresh quota</Button>
                  <Button danger icon={<DeleteOutlined/>} onClick={()=>setAccountToDisconnect(selectedAccount)}>Disconnect</Button>
                </Flex>
              </>}
            </>}
          </Card>
          {isSystemAdmin && <Card title={<Space><SafetyCertificateOutlined />Google OAuth administration</Space>}
            extra={<Button type="link" onClick={()=>setShowGoogleHelp(v=>!v)}>{showGoogleHelp?'Hide setup guide':'Setup guide'}</Button>}>
            {showGoogleHelp && <Alert type="info" showIcon style={{marginBottom:17}}
              message="Configure Google Cloud OAuth"
              description={<div>
                Enable the Google Drive API, create a Web OAuth client, then add the callback address below to its authorized redirect URIs.
                <Typography.Paragraph copyable style={{margin:'8px 0 0'}}>{googleRedirectUri||defaultRedirectUri||'Configure the backend public URL first'}</Typography.Paragraph>
                Use Google Cloud Console to create your credentials.
              </div>} />}
            <form onSubmit={saveGoogleConfig}>
              <Typography.Text strong style={{display:'block',marginBottom:7}}>Client ID</Typography.Text>
              <Input value={googleClientId} onChange={e=>setGoogleClientId(e.target.value)} placeholder="OAuth client ID" required style={{marginBottom:16}}/>
              <Typography.Text strong style={{display:'block',marginBottom:7}}>Client secret</Typography.Text>
              <Input.Password value={googleClientSecret} onChange={e=>setGoogleClientSecret(e.target.value)} placeholder={hasSecret?'Already configured — leave blank to retain':'Google OAuth client secret'} required={!hasSecret} style={{marginBottom:16}}/>
              <Typography.Text strong style={{display:'block',marginBottom:7}}>Callback URI</Typography.Text>
              <Input value={googleRedirectUri} onChange={e=>setGoogleRedirectUri(e.target.value)} placeholder={defaultRedirectUri||'https://example.com/connected-accounts/google/callback'} style={{marginBottom:18}}/>
              <Flex justify="end"><Button type="primary" htmlType="submit" loading={savingGoogleConfig}>Save credentials</Button></Flex>
            </form>
          </Card>}
        </Space>
      </Col>
      <Col xs={24} lg={9} xl={8}>
        <Space direction="vertical" size={18} style={{width:'100%'}}>
          <Card title="Available providers">
            <Space direction="vertical" size={15} style={{width:'100%'}}>
              <Flex align="center" justify="space-between"><Space><CloudOutlined style={{color:'#1677ff'}}/>Google Drive</Space><Button onClick={connectDrive} loading={connecting} size="small">Connect</Button></Flex>
              <Divider style={{margin:0}}/>
              <Flex align="center" justify="space-between"><Space><DatabaseOutlined style={{color:'#1677ff'}}/>S3 compatible</Space><Button size="small" onClick={()=>setS3Open(true)}>Connect</Button></Flex>
            </Space>
          </Card>
          <Card title={<Space><SettingOutlined/>Administration</Space>}>
            <Typography.Paragraph type="secondary" style={{fontSize:13}}>OpenXdrive is installed and updated by your hosting environment. Database backups must use your MySQL provider or native tooling.</Typography.Paragraph>
            <Tag icon={<LockOutlined/>} color="blue">{isSystemAdmin?'System administrator':'Standard account'}</Tag>
          </Card>
        </Space>
      </Col>
    </Row>
    <Modal title="Connect S3-compatible storage" open={s3Open} footer={null} destroyOnHidden width={560} onCancel={()=>setS3Open(false)}>
      <Typography.Paragraph type="secondary">Connect AWS S3, Cloudflare R2, MinIO, Wasabi or another compatible endpoint. Secrets remain on your backend.</Typography.Paragraph>
      <form onSubmit={connectS3}>
        <Row gutter={[12,12]}>
          <Col xs={24}><label className="block mb-1">Display name</label><Input value={s3Form.name} required onChange={e=>setS3Form({...s3Form,name:e.target.value})} placeholder="My storage" /></Col>
          <Col xs={24} md={12}><label className="block mb-1">Bucket</label><Input value={s3Form.bucket} required onChange={e=>setS3Form({...s3Form,bucket:e.target.value})} placeholder="bucket-name" /></Col>
          <Col xs={24} md={12}><label className="block mb-1">Region</label><Input value={s3Form.region} required onChange={e=>setS3Form({...s3Form,region:e.target.value})} /></Col>
          <Col xs={24}><label className="block mb-1">Endpoint URL (optional)</label><Input value={s3Form.endpoint} onChange={e=>setS3Form({...s3Form,endpoint:e.target.value})} placeholder="https://..." /></Col>
          <Col xs={24} md={12}><label className="block mb-1">Access key ID</label><Input value={s3Form.accessKeyId} required onChange={e=>setS3Form({...s3Form,accessKeyId:e.target.value})} /></Col>
          <Col xs={24} md={12}><label className="block mb-1">Secret access key</label><Input.Password value={s3Form.secretAccessKey} required onChange={e=>setS3Form({...s3Form,secretAccessKey:e.target.value})} /></Col>
          <Col xs={24}><label className="block mb-1">Quota in bytes (optional)</label><Input inputMode="numeric" value={s3Form.quotaBytes} onChange={e=>setS3Form({...s3Form,quotaBytes:e.target.value})} /></Col>
          <Col xs={24}><Space><Switch checked={s3Form.forcePathStyle} onChange={checked=>setS3Form({...s3Form,forcePathStyle:checked})}/><Typography.Text>Force path-style URLs</Typography.Text></Space></Col>
          <Col xs={24}><Flex justify="end" gap={8}><Button onClick={()=>setS3Open(false)}>Cancel</Button><Button type="primary" loading={connectingS3} htmlType="submit">Connect storage</Button></Flex></Col>
        </Row>
      </form>
    </Modal>
    <Modal title="Disconnect cloud storage?" open={Boolean(accountToDisconnect)} destroyOnHidden
      onCancel={()=>setAccountToDisconnect(null)} footer={
        <Space><Button onClick={()=>setAccountToDisconnect(null)}>Cancel</Button><Button danger loading={Boolean(disconnectingAccountId)} onClick={disconnect}>Disconnect account</Button></Space>
      }>
      <Alert type="warning" showIcon message="Existing files may become unavailable" description="Disconnecting removes the connected storage credentials. Make sure files stored with this account are backed up or reconnected when needed."/>
      <Typography.Paragraph style={{marginTop:12}}><Typography.Text strong>{accountToDisconnect?.email}</Typography.Text></Typography.Paragraph>
    </Modal>
  </>
}
