// Create a deterministic, locally rendered OpenXdrive avatar. This avoids
// revealing email hashes and page visits to remote avatar providers.
export async function getGravatarUrl(email: string | undefined, size: number): Promise<string> {
  const normalized = email?.trim().toLowerCase() || 'user'
  const namePart = normalized.split('@')[0]
  const initials = (namePart.match(/[a-z0-9]/g) ?? ['U']).slice(0, 2).join('').toUpperCase()
  let hash = 2166136261
  for (let i = 0; i < normalized.length; i++) {
    hash = Math.imul(hash ^ normalized.charCodeAt(i), 16777619) >>> 0
  }
  const palette = ['#2563eb', '#4f46e5', '#0891b2', '#0f766e', '#7c3aed', '#be185d']
  const background = palette[hash % palette.length]
  const safeSize = Math.max(32, Math.min(256, Math.floor(size) || 64))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${safeSize}" height="${safeSize}" role="img" aria-label="OpenXdrive avatar"><rect width="100" height="100" rx="24" fill="${background}"/><text x="50" y="55" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="37" font-weight="700" font-family="system-ui,sans-serif">${initials}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
