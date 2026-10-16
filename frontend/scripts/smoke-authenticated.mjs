// Authenticated UI smoke test using Node 22's built-in WebSocket and Chromium CDP.
// API responses are mocked in this CI-only file, never in the shipped application.
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import net from 'node:net'

const browser = process.env.BROWSER_EXECUTABLE
if (!browser) throw new Error('Set BROWSER_EXECUTABLE to Chromium')
const testHost = 'http://127.0.0.1:4173'
const tempProfile = mkdtempSync(join(tmpdir(), 'openxdrive-ui-smoke-'))
const artifactDir = join(process.cwd(), 'ui-smoke-artifacts')
mkdirSync(artifactDir, { recursive: true })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const port = await new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const p = server.address().port
    server.close(() => resolve(p))
  })
})

const chrome = spawn(browser, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*',
  `--remote-debugging-port=${port}`, `--user-data-dir=${tempProfile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] })
let browserLog = ''
chrome.stderr.on('data', chunk => { browserLog += String(chunk).slice(-4096) })

const mockUser = { id: 'qa-user', name: 'Browser QA', email: 'qa@example.com' }
const mockAccount = {
  id: 'qa-drive', email: mockUser.email, displayName: 'QA Drive',
  provider: 'google_drive', status: 'connected',
  storageAccount: { totalBytes: '15000000000', usedBytes: '3000000000', availableBytes: '12000000000', lastSyncedAt: null },
}
const mockFile = {
  id: 'smoke-file', name: 'CI validation document.pdf',
  mimeType: 'application/pdf', sizeBytes: '24576',
  createdAt: '2026-10-15T10:00:00.000Z', updatedAt: '2026-10-15T10:00:00.000Z',
  folderId: null, folder: null, starredAt: '2026-10-15T10:00:00.000Z', archivedAt: null, _count: { shares: 0 }, connectedAccount: { id: mockAccount.id, email: mockAccount.email, provider: 'google_drive' },
}
const archivedFile = { ...mockFile, id: 'smoke-archived', name: 'Archived CI document.pdf', starredAt: null, archivedAt: '2026-10-15T11:00:00.000Z' }
function apiResponse(requestUrl, method) {
  const url = new URL(requestUrl)
  const path = url.pathname.replace(/^\/api/, '')
  if (method !== 'GET') return { status: 405, body: { message: 'CI mock is read-only' } }
  if (path === '/auth/me') return { user: mockUser }
  if (path === '/storage/summary') return { totalBytes: '15000000000', usedBytes: '3000000000', availableBytes: '12000000000', accounts: [mockAccount] }
  if (path === '/storage/breakdown') return { photo: '500000000', video: '1000000000', document: '1500000000' }
  if (path === '/storage/routing-policy') return { policy: { mode: 'most_available', priorityAccountIds: [], roundRobinCursor: 0 } }
  if (path === '/connected-accounts') return { accounts: [mockAccount] }
  if (path === '/files') {
    if (url.searchParams.get('kind') === 'image') return { files: [] }
    return { files: url.searchParams.get('archived') === '1' ? [archivedFile] : [mockFile] }
  }
  if (path.startsWith('/folders')) return { folders: [] }
  if (path === '/audit-logs') return { logs: [] }
  if (path === '/invites') return { sent: [], received: [] }
  if (path === '/files/trash') return { files: [] }
  if (path === '/api-keys') return { apiKeys: [] }
  if (path === '/system/permissions') return { isSystemAdmin: false }
  return { status: 404, body: { message: `Unsupported CI mock: ${method} ${path}` } }
}

let ws
const requests = new Map()
const seen = new Set()
const seenUrls = new Set()
const runtimeErrors = []
let requestSeq = 0
async function send(method, params = {}) {
  const id = ++requestSeq
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { requests.delete(id); reject(new Error(`CDP timeout: ${method}`)) }, 20000)
    requests.set(id, { resolve, reject, timer })
    ws.send(JSON.stringify({ id, method, params }))
  })
}
async function waitFor(check, message, timeout = 20000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const result = await send('Runtime.evaluate', { expression: check, returnByValue: true })
    if (result?.result?.value) return
    await delay(230)
  }
  const snapshot = await send('Runtime.evaluate', {expression:'document.body?.innerText?.slice(0,900) || ""',returnByValue:true}).catch(()=>null)
  throw new Error(`Browser assertion failed: ${message}; document=${JSON.stringify(snapshot?.result?.value)}; api=${[...seen].join(', ')}; runtime=${runtimeErrors.join('; ')}`)
}
async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  writeFileSync(join(artifactDir, name), Buffer.from(result.data, 'base64'))
}
async function navigate(path) {
  await send('Page.navigate', { url: `${testHost}${path}` })
  await waitFor(`window.location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete'`, `Navigation to ${path}`)
}
try {
  let tab
  for (let attempt = 0; attempt < 70; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(testHost + '/login')}`, { method: 'PUT' })
      if (response.ok) { tab = await response.json(); break }
    } catch { /* Chromium starting */ }
    await delay(200)
  }
  if (!tab) throw new Error(`Chrome debugging never started. ${browserLog.slice(-1200)}`)
  ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  ws.addEventListener('message', event => {
    const data = JSON.parse(event.data)
    if (data.id) {
      const item = requests.get(data.id)
      if (item) {
        requests.delete(data.id)
        clearTimeout(item.timer)
        if (data.error) item.reject(new Error(JSON.stringify(data.error)))
        else item.resolve(data.result)
      }
    }
    if (data.method === 'Runtime.exceptionThrown') {
      runtimeErrors.push(data.params?.exceptionDetails?.text ?? 'JavaScript exception')
    }
    if (data.method === 'Fetch.requestPaused') {
      const { request, requestId } = data.params
      const mock = apiResponse(request.url, request.method)
      const status = mock.status ?? 200
      const dataBody = mock.body ?? mock
      seen.add(`${request.method} ${new URL(request.url).pathname}`)
      seenUrls.add(`${request.method} ${new URL(request.url).pathname}${new URL(request.url).search}`)
      send('Fetch.fulfillRequest', {
        requestId, responseCode: status,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }, { name: 'Access-Control-Allow-Origin', value: '*' }],
        body: Buffer.from(JSON.stringify(dataBody), 'utf8').toString('base64'),
      }).catch(error => runtimeErrors.push(String(error)))
    }
  })
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: `${testHost}/api/*`, requestStage: 'Request' }] })
  await navigate('/login')
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('OpenXdrive.accessToken','ci-only-fake-token');
                 localStorage.setItem('OpenXdrive.refreshToken','ci-only-fake-refresh');
                 localStorage.setItem('OpenXdrive.user',JSON.stringify(${JSON.stringify(mockUser)}));`,
    returnByValue: true,
  })
  await navigate('/all-files')
  await waitFor("document.body.innerText.includes('CI validation document.pdf')", 'File manager data loaded')
  await waitFor("/all\\s*files/i.test(document.body.innerText)", 'File manager heading')
  await screenshot('workspace-desktop.png')

  // Verify that file-management actions open the actual Ant Design modal.
  await send('Runtime.evaluate', {
    expression: `[...document.querySelectorAll('button')].find(b => /New Folder/i.test(b.textContent))?.click()`,
  })
  await waitFor("!!document.querySelector('input[placeholder=\"Project Assets\"]')", 'Create folder dialog')
  await screenshot('workspace-new-folder-dialog.png')

  // Dismiss dialog then verify responsive navigation.
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  // Verify real selection and Ant Design context-menu affordances on desktop.
  await send('Runtime.evaluate', {
    expression: `document.querySelector('tr[data-row-key="smoke-file"] .ant-table-selection-column input[type="checkbox"]')?.click()`,
  })
  await waitFor("document.querySelector('.ox-context-utility')?.innerText.includes('1 selected')", 'Selecting an actual file row')
  await send('Runtime.evaluate', {
    expression: `document.querySelector('tr[data-row-key="smoke-file"]')?.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:320,clientY:290}))`,
  })
  await waitFor("!![...document.querySelectorAll('.ant-dropdown')].find(node=>node.textContent?.includes('Remove from Starred'))", 'Ant Design file context menu')
  await screenshot('workspace-context-menu.png')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })

  // Search-filter regression: a URL query change must trigger the existing
  // React page to reload results without remounting the whole application.
  await send('Runtime.evaluate', {
    expression: `window.history.pushState({}, '', '/all-files?kind=image');window.dispatchEvent(new PopStateEvent('popstate'))`,
  })
  await waitFor("document.body.innerText.includes('Your workspace has no files yet')", 'Advanced kind filter refreshes the file table')
  if (!seenUrls.has('GET /api/files?kind=image')) throw new Error('Advanced search filter did not reach /api/files')
  await screenshot('workspace-filtered-empty.png')
  await send('Runtime.evaluate', {
    expression: `window.history.pushState({}, '', '/all-files');window.dispatchEvent(new PopStateEvent('popstate'))`,
  })
  await waitFor("document.body.innerText.includes('CI validation document.pdf')", 'Cleared filters repopulate the file manager')

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await delay(750)
  await waitFor("!!document.querySelector('button[aria-label=\"Open navigation\"]')", 'Mobile navigation trigger')
  await screenshot('workspace-mobile.png')
  await send('Runtime.evaluate', { expression: `document.querySelector('button[aria-label="Open navigation"]').click()` })
  await waitFor("document.querySelector('.ant-drawer-open') !== null", 'Mobile navigation drawer')
  await screenshot('workspace-mobile-navigation.png')
  await send('Emulation.clearDeviceMetricsOverride')

  await navigate('/starred')
  await waitFor("document.body.innerText.includes('CI validation document.pdf')", 'Real Starred UI view')
  await screenshot('starred-desktop.png')
  await navigate('/archived')
  await waitFor("document.body.innerText.includes('Archived CI document.pdf')", 'Real Archived UI view')
  await screenshot('archive-desktop.png')

  await navigate('/shared')
  await waitFor("document.body.innerText.includes('Shared workspace')", 'Shared invitations view')
  await navigate('/trash')
  await waitFor("document.body.innerText.includes('Recycle bin')", 'Recycle bin view')
  await navigate('/api')
  await waitFor("document.body.innerText.includes('Developer API')", 'Developer API console')
  await navigate('/activity')
  await waitFor("document.body.innerText.includes('Activity log')", 'Activity log view')

  await navigate('/quota')
  await waitFor("document.body.innerText.includes('Storage insights')", 'Storage insights page')
  await waitFor("document.body.innerText.includes('QA Drive')", 'Connected quota data')
  await screenshot('storage-desktop.png')

  if (runtimeErrors.length) throw new Error(`Browser JavaScript errors: ${runtimeErrors.join('; ')}`)
  if (!seen.has('GET /api/files') || !seen.has('GET /api/storage/summary')) {
    throw new Error(`Expected API queries not observed: ${[...seen].join(', ')}`)
  }
  console.log('Authenticated UI verified: files, folder modal, mobile drawer, storage dashboard, mocked API responses.')
} finally {
  try { ws?.close() } catch { /* already closed */ }
  if (chrome.exitCode === null) {
    await new Promise(resolve => {
      const timer = setTimeout(() => { chrome.kill('SIGKILL'); resolve() }, 2000)
      chrome.once('exit', () => { clearTimeout(timer); resolve() })
      chrome.kill('SIGTERM')
    })
  }
  try {
    rmSync(tempProfile, { recursive: true, force: true, maxRetries: 8, retryDelay: 120 })
  } catch (error) {
    console.warn('Could not remove temporary browser profile:', String(error))
  }
}
