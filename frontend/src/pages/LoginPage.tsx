import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LockOutlined, MailOutlined, CloudServerOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Button, Card, Divider, Input, Space, Tag, Typography, Alert } from 'antd'
import { GoogleLogo } from '@/components/auth/GoogleLogo'
import { BrandLogo } from '@/components/drive/BrandLogo'
import { apiFetch } from '@/lib/api'
import { setAuthSession, type AuthUser } from '@/lib/auth'

type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser }

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function continueWithGoogle() {
    setGoogleLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ url: string }>('/auth/google/url', { skipAuth: true })
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed')
      setGoogleLoading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await apiFetch<AuthResponse>('/auth/login', { method: 'POST', skipAuth: true, body: JSON.stringify({ email, password }) })
      setAuthSession(data.accessToken, data.refreshToken, data.user)
      navigate('/all-files')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="ox-auth-screen">
      <aside className="ox-auth-aside">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <BrandLogo className="h-11 w-11" />
          <span style={{ color: 'white', fontSize: 22, fontWeight: 700, letterSpacing: '-.04em' }}>OpenXdrive</span>
        </div>
        <div>
          <Tag color="processing" bordered={false} style={{ marginBottom: 24 }}>PRIVATE CLOUD WORKSPACE</Tag>
          <h1>Every cloud.<br />One workspace.</h1>
          <p>Bring your Google Drive and S3-compatible storage together. Manage files, share securely, and make the most of space you already have.</p>
          <div className="ox-brand-pills">
            <span className="ox-brand-pill"><CloudServerOutlined /> Multi-cloud storage</span>
            <span className="ox-brand-pill"><SafetyCertificateOutlined /> Self-hosted</span>
            <span className="ox-brand-pill">No storage subscription required</span>
          </div>
        </div>
        <span style={{ fontSize: 12, color: '#b3c5da' }}>OpenXdrive · Your files stay with your connected providers</span>
      </aside>
      <section className="ox-auth-main">
        <div className="ox-auth-card">
          <Space align="center" style={{ marginBottom: 24 }}>
            <BrandLogo className="h-10 w-10" />
            <div><Typography.Text strong style={{ display: 'block' }}>OpenXdrive</Typography.Text><Typography.Text type="secondary">Cloud storage gateway</Typography.Text></div>
          </Space>
          <Card>
            <div style={{ marginBottom: 26 }}>
              <Typography.Title level={3} style={{ marginBottom: 6, fontWeight: 700 }}>Welcome back</Typography.Title>
              <Typography.Text type="secondary">Sign in to access your connected storage.</Typography.Text>
            </div>
            <form onSubmit={submit}>
              <label className="block mb-2 text-sm font-medium" htmlFor="ox-login-email">Email address</label>
              <Input id="ox-login-email" size="large" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} prefix={<MailOutlined />} placeholder="you@company.com" required style={{ marginBottom: 20 }} />
              <label className="block mb-2 text-sm font-medium" htmlFor="ox-login-password">Password</label>
              <Input.Password id="ox-login-password" size="large" value={password} onChange={e => setPassword(e.target.value)} prefix={<LockOutlined />} autoComplete="current-password" placeholder="Enter your password" required style={{ marginBottom: 20 }} />
              {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
              <Button type="primary" htmlType="submit" loading={loading} block size="large">Sign in to workspace</Button>
            </form>
            <Divider plain>or</Divider>
            <Button block size="large" icon={<GoogleLogo />} onClick={continueWithGoogle} loading={googleLoading}>Continue with Google</Button>
            <div style={{ textAlign: 'center', marginTop: 25, fontSize: 13 }}>
              <Typography.Text type="secondary">New to OpenXdrive? </Typography.Text>
              <Link to="/register">Create account</Link>
            </div>
          </Card>
        </div>
      </section>
    </main>
  )
}
