import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import {
  ApiOutlined, BellOutlined, CloudOutlined,
  DeleteOutlined, FileOutlined, FolderOpenOutlined, HistoryOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, MoonOutlined, SearchOutlined,
  SettingOutlined, ShareAltOutlined, StarOutlined, SunOutlined,
  UploadOutlined, CheckCircleOutlined, CloseOutlined, FilterOutlined,
  DatabaseOutlined, ReloadOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons'
import {
  Avatar, Badge, Button, Card, Divider, Drawer, Dropdown, Empty, Flex, Form,
  Input, Layout, Menu, Popover, Progress, Select, Space, Tag, Tooltip, Typography,
  type InputRef, type MenuProps,
} from 'antd'
import { BrandLogo } from '@/components/drive/BrandLogo'
import { apiFetch, formatBytes } from '@/lib/api'
import { useUpload } from '@/context/UploadContext'
import { clearAuthSession, getStoredUser, updateStoredUser, type AuthUser } from '@/lib/auth'
import { getLocalAvatarUrl } from '@/lib/avatar'
import { appearanceEvent } from '@/components/design/AntThemeProvider'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const navigation = [
  { key: '/all-files', label: 'All files', icon: <FolderOpenOutlined /> },
  { key: '/recent', label: 'Recent', icon: <HistoryOutlined /> },
  { key: '/starred', label: 'Starred', icon: <StarOutlined /> },
  { key: '/shared', label: 'Shared', icon: <ShareAltOutlined /> },
  { key: '/archived', label: 'Archived', icon: <FileOutlined /> },
  { key: '/trash', label: 'Recycle bin', icon: <DeleteOutlined /> },
]
const management = [
  { key: '/quota', label: 'Storage insights', icon: <CloudOutlined /> },
  { key: '/activity', label: 'Activity log', icon: <SafetyCertificateOutlined /> },
  { key: '/api', label: 'Developer API', icon: <ApiOutlined /> },
  { key: '/settings', label: 'Settings', icon: <SettingOutlined /> },
]
type StorageSummary = { totalBytes: string | null; usedBytes: string; availableBytes: string | null }
type StorageBreakdown = { photo: string; video: string; document: string }
type ConnectedAccount = { id: string; email: string; provider: string; status?: string }
export type DriveLayoutContext = { setHeaderActions: (actions: ReactNode) => void }
export function useDriveLayoutActions() { return useOutletContext<DriveLayoutContext>() }

function StorageStatus({ storage, breakdown }: { storage: StorageSummary | null; breakdown: StorageBreakdown }) {
  const used = Number(storage?.usedBytes ?? '0')
  const total = Number(storage?.totalBytes ?? '0')
  const percentage = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const detail = [
    { name: 'Images', value: breakdown.photo },
    { name: 'Videos', value: breakdown.video },
    { name: 'Documents', value: breakdown.document },
  ]
  return (
    <Card size="small" className="ox-storage-card" styles={{ body: { padding: 15 } }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 12 }}>Workspace storage</Text>
        <DatabaseOutlined style={{ color: '#1677ff' }} />
      </Flex>
      <Typography.Title level={4} style={{ margin: 0 }}>{formatBytes(storage?.usedBytes ?? '0')}</Typography.Title>
      <Text type="secondary" style={{ fontSize: 11 }}>of {storage?.totalBytes ? formatBytes(storage.totalBytes) : 'unlimited or unknown'} used</Text>
      <Progress percent={percentage} size="small" showInfo={false} style={{ margin: '9px 0' }} />
      <Flex justify="space-between">
        <Text type="secondary" style={{ fontSize: 11 }}>{percentage}% used</Text>
        <Popover title="Storage breakdown" content={<Space direction="vertical">{detail.map(item => <Text key={item.name}>{item.name}: {formatBytes(item.value)}</Text>)}</Space>}>
          <Button size="small" type="link" style={{ padding: 0 }}>Details</Button>
        </Popover>
      </Flex>
    </Card>
  )
}

function Navigation({ selected, navigateTo, user, storage, breakdown, logout }: {
  selected: string; navigateTo: (path: string) => void; user: AuthUser | null;
  storage: StorageSummary | null; breakdown: StorageBreakdown; logout: () => void
}) {
  const [avatar, setAvatar] = useState<string>()
  useEffect(() => { getLocalAvatarUrl(user?.email, 64).then(setAvatar).catch(() => setAvatar(undefined)) }, [user?.email])
  const accountMenu: MenuProps['items'] = [
    { key: 'settings', label: 'Account settings', icon: <SettingOutlined />, onClick: () => navigateTo('/settings') },
    { type: 'divider' },
    { key: 'logout', label: 'Sign out', icon: <LogoutOutlined />, danger: true, onClick: logout },
  ]

  const renderGroup = (heading: string, entries: typeof navigation) => (
    <>
      <div className="ox-sider-section">{heading}</div>
      <Menu mode="inline" selectedKeys={[selected]} items={entries} onClick={({ key }) => navigateTo(key)} style={{ borderInlineEnd: 0 }} />
    </>
  )

  return <Flex vertical style={{ height: '100%', minHeight: '100%' }}>
    <div className="ox-brand">
      <BrandLogo className="h-10 w-10" />
      <div>
        <div className="ox-brand-name">OpenXdrive</div>
        <div className="ox-brand-caption">CLOUD WORKSPACE</div>
      </div>
    </div>
    <div style={{ padding: '0 18px 18px' }}>
      <Tag color="blue" bordered={false} icon={<CloudOutlined />} style={{ padding: '4px 10px', borderRadius: 7, margin: 0 }}>
        Self-hosted workspace
      </Tag>
    </div>
    {renderGroup('WORKSPACE', navigation)}
    <Divider style={{ margin: '14px 0 4px', borderColor: 'var(--ox-outline)' }} />
    {renderGroup('MANAGEMENT', management)}
    <div className="ox-sider-bottom">
      <StorageStatus storage={storage} breakdown={breakdown} />
      <Divider style={{ margin: '16px 0' }} />
      <Dropdown menu={{ items: accountMenu }} trigger={['click']} placement="top">
        <Button type="text" block style={{ height: 48, padding: 4, textAlign: 'left' }}>
          <div className="ox-account">
            <Avatar src={avatar} size={36} style={{ background: '#1677ff', flexShrink: 0 }}>{user?.name?.[0] ?? 'U'}</Avatar>
            <div className="ox-account-text">
              <span className="ox-account-title">{user?.name || 'Workspace owner'}</span>
              <span className="ox-account-subtitle">{user?.email || 'Account'}</span>
            </div>
            <MenuUnfoldOutlined style={{ color: 'var(--ox-muted)' }} />
          </div>
        </Button>
      </Dropdown>
    </div>
  </Flex>
}

export function DriveLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [user, setUser] = useState<AuthUser | null>(getStoredUser())
  const [storage, setStorage] = useState<StorageSummary | null>(null)
  const [breakdown, setBreakdown] = useState<StorageBreakdown>({ photo: '0', video: '0', document: '0' })
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [query, setQuery] = useState(params.get('q') || '')
  const [kind, setKind] = useState(params.get('kind') || '')
  const [account, setAccount] = useState(params.get('accountId') || '')
  const [minSize, setMinSize] = useState(params.get('minSize') ? String(Number(params.get('minSize')) / 1048576) : '')
  const [maxSize, setMaxSize] = useState(params.get('maxSize') ? String(Number(params.get('maxSize')) / 1048576) : '')
  const [startDate, setStartDate] = useState(params.get('startDate')?.slice(0, 10) || '')
  const [endDate, setEndDate] = useState(params.get('endDate')?.slice(0, 10) || '')
  const [headerActions, setHeaderActions] = useState<ReactNode>(null)
  const [uploadProgressCollapsed, setUploadProgressCollapsed] = useState(false)
  const { uploadProgress, setUploadProgress, retryFailedUpload } = useUpload()
  const searchRef = useRef<InputRef>(null)
  const [dark, setDark] = useState(() => localStorage.getItem('OpenXdrive:theme') === 'dark')

  useEffect(() => {
    setQuery(params.get('q') || '')
    setKind(params.get('kind') || '')
    setAccount(params.get('accountId') || '')
    setMinSize(params.get('minSize') ? String(Number(params.get('minSize')) / 1048576) : '')
    setMaxSize(params.get('maxSize') ? String(Number(params.get('maxSize')) / 1048576) : '')
    setStartDate(params.get('startDate')?.slice(0, 10) || '')
    setEndDate(params.get('endDate')?.slice(0, 10) || '')
  }, [params])

  async function loadStorage() {
    const [summary, detail] = await Promise.allSettled([
      apiFetch<StorageSummary>('/storage/summary'),
      apiFetch<StorageBreakdown>('/storage/breakdown'),
    ])
    if (summary.status === 'fulfilled') setStorage(summary.value)
    if (detail.status === 'fulfilled') setBreakdown(detail.value)
  }

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me').then(({ user: u }) => { setUser(u); updateStoredUser(u) }).catch(() => undefined)
    loadStorage().catch(() => undefined)
    apiFetch<{ accounts: ConnectedAccount[] }>('/connected-accounts').then(x => setAccounts(x.accounts)).catch(() => undefined)
    window.addEventListener('OpenXdrive:storage-changed', loadStorage)
    const onHotkey = (ev: KeyboardEvent) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
        ev.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onHotkey)
    return () => {
      window.removeEventListener('OpenXdrive:storage-changed', loadStorage)
      window.removeEventListener('keydown', onHotkey)
    }
  }, [])

  async function logout() {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
    clearAuthSession()
    navigate('/login')
  }

  function setAppearance() {
    const next = dark ? 'light' : 'dark'
    setDark(!dark)
    localStorage.setItem('OpenXdrive:theme', next)
    window.dispatchEvent(new Event(appearanceEvent))
  }

  function applyFilters(event?: FormEvent) {
    event?.preventDefault()
    const url = new URLSearchParams()
    if (location.pathname === '/all-files' && params.get('folderId')) url.set('folderId', params.get('folderId')!)
    if (query.trim()) url.set('q', query.trim())
    if (kind) url.set('kind', kind)
    if (account) url.set('accountId', account)
    if (minSize !== '' && Number(minSize) >= 0) url.set('minSize', String(Math.round(Number(minSize) * 1048576)))
    if (maxSize !== '' && Number(maxSize) >= 0) url.set('maxSize', String(Math.round(Number(maxSize) * 1048576)))
    if (startDate) url.set('startDate', new Date(startDate).toISOString())
    if (endDate) url.set('endDate', new Date(endDate).toISOString())
    navigate({ pathname: '/all-files', search: url.toString() })
    setFiltersOpen(false)
  }

  function clearFilters() {
    setKind(''); setAccount(''); setMinSize(''); setMaxSize(''); setStartDate(''); setEndDate('')
    const url = new URLSearchParams()
    if (location.pathname === '/all-files' && params.get('folderId')) url.set('folderId', params.get('folderId')!)
    if (query.trim()) url.set('q', query.trim())
    navigate({ pathname: '/all-files', search: url.toString() })
    setFiltersOpen(false)
  }

  const navTo = (path: string) => { navigate(path); setSidebarOpen(false); setHeaderActions(null) }
  const selected = [...navigation, ...management].find(item => location.pathname === item.key)?.key || '/all-files'
  const alertContent = (
    <div style={{ width: 260 }}>
      <Text strong>Workspace information</Text>
      <div style={{ marginTop: 10 }}><Badge status={storage ? 'success' : 'default'} text={storage ? 'Storage data available' : 'Storage not connected'} /></div>
      <Divider style={{ margin: '12px 0' }} />
      <Text type="secondary">Files are stored with your connected Google Drive or S3 accounts. OpenXdrive uses MySQL for metadata.</Text>
    </div>
  )
  const sidebar = <Navigation selected={selected} navigateTo={navTo} user={user} storage={storage} breakdown={breakdown} logout={logout} />

  return (
    <Layout className="ox-workspace">
      <Sider width={248} className="ox-sider" breakpoint="lg" collapsedWidth={0} trigger={null} style={{ minHeight: '100vh', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {sidebar}
      </Sider>
      <Layout style={{ minWidth: 0 }}>
        <Header className="ox-topbar" style={{ lineHeight: 'normal' }}>
          <Button className="ox-mobile-menu" icon={<MenuFoldOutlined />} aria-label="Open navigation" onClick={() => setSidebarOpen(true)} />
          <form onSubmit={applyFilters} className="ox-search">
            <Input
              ref={searchRef}
              size="large"
              allowClear
              value={query}
              onChange={event => setQuery(event.target.value)}
              prefix={<SearchOutlined style={{ color: '#8795a7' }} />}
              placeholder="Search files and folders"
              suffix={<Tooltip title="Advanced search"><Button type="text" size="small" icon={<FilterOutlined />} onClick={() => setFiltersOpen(true)} aria-label="Advanced search filters" /></Tooltip>}
            />
          </form>
          <div className="ox-topbar-actions">
            {headerActions && <div className="ox-desktop-header-actions">{headerActions}</div>}
            <Tooltip title={dark ? 'Light appearance' : 'Dark appearance'}>
              <Button icon={dark ? <SunOutlined /> : <MoonOutlined />} aria-label="Change appearance" onClick={setAppearance} />
            </Tooltip>
            <Popover content={alertContent} title={null} placement="bottomRight" trigger="click">
              <Button aria-label="Workspace information" icon={<BellOutlined />} />
            </Popover>
          </div>
        </Header>
        <Content><div className="ox-content"><Outlet context={{ setHeaderActions } satisfies DriveLayoutContext} /></div></Content>
      </Layout>

      <Drawer placement="left" open={sidebarOpen} onClose={() => setSidebarOpen(false)} width={265} styles={{ body: { padding: 0 } }} closeIcon={false} title={null}>
        {sidebar}
      </Drawer>
      <Drawer title="Advanced search" width={380} open={filtersOpen} onClose={() => setFiltersOpen(false)} extra={<Button onClick={clearFilters}>Clear</Button>}>
        <Form layout="vertical" onFinish={() => applyFilters()}>
          <Form.Item label="File type">
            <Select value={kind} onChange={setKind} options={[
              { value: '', label: 'All file types' },
              { value: 'image', label: 'Image' },
              { value: 'video', label: 'Video' },
              { value: 'pdf', label: 'PDF' },
              { value: 'doc', label: 'Document' },
              { value: 'archive', label: 'Archive' },
            ]} />
          </Form.Item>
          <Form.Item label="Storage account">
            <Select value={account} onChange={setAccount} options={[
              { value: '', label: 'All accounts' },
              ...accounts.map(a => ({ value: a.id, label: a.email })),
            ]} />
          </Form.Item>
          <Form.Item label="Minimum size (MB)">
            <Input type="number" min={0} value={minSize} onChange={e => setMinSize(e.target.value)} placeholder="Any" />
          </Form.Item>
          <Form.Item label="Maximum size (MB)">
            <Input type="number" min={0} value={maxSize} onChange={e => setMaxSize(e.target.value)} placeholder="Any" />
          </Form.Item>
          <Form.Item label="From date">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </Form.Item>
          <Form.Item label="To date">
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </Form.Item>
          <Button block type="primary" htmlType="submit" icon={<SearchOutlined />}>Search files</Button>
        </Form>
      </Drawer>

      {uploadProgress.open && <div className="ox-progress-panel">
        <Card size="small" title={<Space>
          {uploadProgress.status === 'done' ? <CheckCircleOutlined style={{ color: '#16a34a' }} /> : <UploadOutlined style={{ color: '#1677ff' }} />}
          {uploadProgress.status === 'done' ? 'Upload complete' : uploadProgress.status === 'error' ? 'Upload failed' : 'File transfers'}
        </Space>}
          extra={<Space>
            <Button type="text" size="small" icon={uploadProgressCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setUploadProgressCollapsed(!uploadProgressCollapsed)} />
            <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setUploadProgress(v => ({ ...v, open: false }))} />
          </Space>}
        >
          {!uploadProgressCollapsed && <div>
            <Flex justify="space-between" style={{ marginBottom: 6 }}>
              <Text ellipsis style={{ maxWidth: '75%' }}>{uploadProgress.fileName}</Text>
              <Text type="secondary">{uploadProgress.percent}%</Text>
            </Flex>
            <Progress percent={uploadProgress.percent} status={uploadProgress.status === 'error' ? 'exception' : uploadProgress.status === 'done' ? 'success' : 'active'} size="small" />
            <div style={{ maxHeight: 235, overflowY: 'auto' }}>
              {uploadProgress.files.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transfers" /> : uploadProgress.files.map((f, i) =>
                <div key={f.name + i} style={{ padding: '9px 0', borderBottom: '1px solid var(--ox-outline)' }}>
                  <Flex justify="space-between" align="center" gap={8}>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <Text ellipsis style={{ display: 'block' }}>{f.name}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{formatBytes(f.size)} · {f.percent}%</Text>
                    </div>
                    {f.status === 'error' ? <Button size="small" icon={<ReloadOutlined />} onClick={() => retryFailedUpload(f.name)}>Retry</Button> : <Tag color={f.status === 'done' ? 'green' : 'blue'}>{f.status === 'done' ? 'Done' : 'Uploading'}</Tag>}
                  </Flex>
                </div>
              )}
            </div>
          </div>}
        </Card>
      </div>}
    </Layout>
  )
}
