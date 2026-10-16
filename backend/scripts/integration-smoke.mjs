// Real MySQL + Express API smoke tests. CI-only, isolated ephemeral database.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const apiBase = process.env.SMOKE_API_URL || 'http://127.0.0.1:4000'
const prisma = new PrismaClient()
const suffix = randomUUID().slice(0, 12)
async function call(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(apiBase + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  return { status: response.status, body: data }
}
async function expectStatus(path, options, status) {
  const result = await call(path, options)
  assert.equal(result.status, status, `${options?.method || 'GET'} ${path}: ${JSON.stringify(result.body)}`)
  return result.body
}
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await call('/health')).status === 200) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 350))
  }
  assert.equal((await call('/health')).status, 200, 'Backend should be running')

  const register = async n => expectStatus('/auth/register', {
    method: 'POST',
    body: { name: `Test user ${n}`, email: `smoke-${suffix}-${n}@example.invalid`, password: `Smoke-Password-${suffix}!` },
  }, 201)
  const [owner, other] = await Promise.all([register('a'), register('b')])
  const a = owner.accessToken
  const b = other.accessToken
  assert.ok(a && b && a !== b)

  await expectStatus('/auth/me', { token: a }, 200)
  await expectStatus('/auth/me', {}, 401)

  // Real database folder creation, nesting, and tenant segregation.
  const root = (await expectStatus('/folders', { token: a, method: 'POST', body: { name: 'Parent CI folder' } }, 201)).folder
  const child = (await expectStatus('/folders', { token: a, method: 'POST', body: { name: 'Child CI folder', parentId: root.id } }, 201)).folder
  assert.equal((await expectStatus('/folders?all=1', { token: a }, 200)).folders.length, 2)
  assert.equal((await expectStatus('/folders?all=1', { token: b }, 200)).folders.length, 0)

  // Other users must not mutate or observe the owner's folder or files.
  const updateOther = await call(`/folders/${root.id}`, { token: b, method: 'PATCH', body: { name: 'Attack attempt' } })
  assert.ok(updateOther.status >= 400 && updateOther.status < 500)
  const deleteOther = await call(`/folders/${root.id}`, { token: b, method: 'DELETE' })
  assert.ok(deleteOther.status >= 400 && deleteOther.status < 500)

  // Seed metadata-only S3 file rows; no real cloud account credentials or files.
  const connected = await prisma.connectedAccount.create({
    data: {
      userId: owner.user.id, provider: 's3', providerAccountId: `ci-storage-${suffix}`,
      email: owner.user.email, displayName: 'Isolated CI provider', scopes: [],
      status: 'connected',
    },
  })
  const fileIds = []
  for (const [idx, folderId] of [root.id, child.id].entries()) {
    const file = await prisma.file.create({
      data: {
        userId: owner.user.id, connectedAccountId: connected.id, folderId,
        provider: 's3', providerFileId: `ci-${suffix}-${idx}`,
        name: `preserved-ci-${idx}.txt`, mimeType: 'text/plain',
        sizeBytes: BigInt(128 + idx), status: 'active',
      },
    })
    fileIds.push(file.id)
  }

  const deniedFile = await call(`/files/${fileIds[0]}`, { token: b })
  assert.ok(deniedFile.status >= 400 && deniedFile.status < 500)
  const ownerFiles = (await expectStatus('/files', { token: a }, 200)).files
  assert.equal(ownerFiles.length, 2)
  assert.equal((await expectStatus('/files', { token: b }, 200)).files.length, 0)

  // Favorites and archive use persistent, user-scoped MySQL state.
  await expectStatus(`/files/${fileIds[0]}`, { token: a, method: 'PATCH', body: { starred: true } }, 200)
  assert.equal((await expectStatus('/files?starred=1', { token: a }, 200)).files.length, 1)
  assert.equal((await expectStatus('/files?starred=1', { token: b }, 200)).files.length, 0)
  await expectStatus(`/files/${fileIds[0]}`, { token: a, method: 'PATCH', body: { archived: true } }, 200)
  assert.equal((await expectStatus('/files?archived=1', { token: a }, 200)).files.length, 1)
  assert.equal((await expectStatus('/files', { token: a }, 200)).files.length, 1)
  await expectStatus(`/files/${fileIds[0]}`, { token: a, method: 'PATCH', body: { archived: false, starred: false } }, 200)
  assert.equal((await expectStatus('/files?archived=1', { token: a }, 200)).files.length, 0)
  assert.equal((await expectStatus('/files?starred=1', { token: a }, 200)).files.length, 0)

  // Deleting virtual folders must not delete, trash, or unlink cloud objects.
  const deletion = await expectStatus(`/folders/${root.id}`, { token: a, method: 'DELETE' }, 200)
  assert.equal(deletion.deletedFolders, 2)
  assert.equal(deletion.filesPreserved, 2)
  const preserved = await prisma.file.findMany({ where: { id: { in: fileIds } } })
  assert.equal(preserved.length, 2)
  assert.ok(preserved.every(file => file.status === 'active' && file.folderId === null))
  assert.equal((await expectStatus('/files', { token: a }, 200)).files.length, 2)
  assert.equal((await expectStatus('/files/trash', { token: a }, 200)).files.length, 0)
  assert.equal((await expectStatus('/folders?all=1', { token: a }, 200)).folders.length, 0)

  const apiKey = await expectStatus('/api-keys', { token: a, method: 'POST', body: { name: 'CI integration key' } }, 201)
  assert.ok(apiKey.secret.startsWith('oxd_live_'), 'New API keys must use OpenXdrive prefix')
  assert.ok(apiKey.apiKey.keyPrefix.startsWith('oxd_live_'))
  assert.equal((await expectStatus('/api-keys', { token: b }, 200)).apiKeys.length, 0)
  await expectStatus(`/api-keys/${apiKey.apiKey.id}`, { token: a, method: 'DELETE' }, 200)

  // Unsupported provider cannot accidentally become public on Google Drive.
  const makePublic = await call(`/files/${fileIds[0]}/public-permission`, { token: a, method: 'POST' })
  assert.equal(makePublic.status, 400)
  console.log('PASS: real MySQL + API register/auth, tenant segregation, folder CRUD, safe file retention, starred/archive state and OpenXdrive API credentials')
} finally {
  await prisma.$disconnect()
}
