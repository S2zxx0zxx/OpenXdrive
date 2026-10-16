import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LockOutlined, MailOutlined, UserOutlined, CloudServerOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Button, Card, Divider, Input, Space, Tag, Typography, Alert } from 'antd'
import { GoogleLogo } from '@/components/auth/GoogleLogo'
import { BrandLogo } from '@/components/drive/BrandLogo'
import { apiFetch } from '@/lib/api'
import { setAuthSession, type AuthUser } from '@/lib/auth'

type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser }
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim()

declare global {
  interface Window {
    grecaptcha?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }) => number
      reset: (widgetId?: number) => void
    }
  }
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const recaptchaRef = useRef<HTMLDivElement | null>(null)
  const recaptchaWidgetId = useRef<number | null>(null)

  useEffect(() => {
    if (!recaptchaSiteKey) return
    const scriptId = 'google-recaptcha-script'
    const renderCaptcha = () => {
      if (!recaptchaRef.current || !window.grecaptcha || recaptchaWidgetId.current !== null) return
      recaptchaWidgetId.current = window.grecaptcha.render(recaptchaRef.current, {
        sitekey: recaptchaSiteKey,
        callback: setCaptchaToken,
        'expired-callback': () => setCaptchaToken(''),
      })
    }

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.onload = renderCaptcha
      document.body.appendChild(script)
    } else {
      renderCaptcha()
    }
  }, [])

  async function continueWithGoogle() {
    setGoogleLoading(true)
    setError('')
    try {
      const data = await apiFetch<{ url: string }>('/auth/google/url', { skipAuth: true })
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google register failed')
      setGoogleLoading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    if (recaptchaSiteKey && !captchaToken) {
      setError('Please complete the captcha.')
      setLoading(false)
      return
    }
    try {
      const data = await apiFetch<AuthResponse>('/auth/register', { method: 'POST', skipAuth: true, body: JSON.stringify({ name, email, password, captchaToken }) })
      setAuthSession(data.accessToken, data.refreshToken, data.user)
      navigate('/all-files')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Register failed')
      if (recaptchaWidgetId.current !== null) window.grecaptcha?.reset(recaptchaWidgetId.current)
      setCaptchaToken('')
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
              <Typography.Title level={3} style={{ marginBottom: 6, fontWeight: 700 }}>Create your workspace</Typography.Title>
              <Typography.Text type="secondary">Start with your existing cloud accounts. No paid plan required.</Typography.Text>
            </div>
            <form onSubmit={submit}>
              <label className="block mb-2 text-sm font-medium" htmlFor="ox-register-name">Full name</label>
              <Input id="ox-register-name" size="large" value={name} onChange={e => setName(e.target.value)} prefix={<UserOutlined />} autoComplete="name" placeholder="Your name" required style={{ marginBottom: 16 }} />
              <label className="block mb-2 text-sm font-medium" htmlFor="ox-register-email">Email address</label>
              <Input id="ox-register-email" size="large" type="email" value={email} onChange={e => setEmail(e.target.value)} prefix={<MailOutlined />} autoComplete="email" placeholder="you@company.com" required style={{ marginBottom: 16 }} />
              <label className="block mb-2 text-sm font-medium" htmlFor="ox-register-password">Create a password</label>
              <Input.Password id="ox-register-password" size="large" value={password} onChange={e => setPassword(e.target.value)} prefix={<LockOutlined />} autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required style={{ marginBottom: 16 }} />
              {recaptchaSiteKey && <div style={{ marginBottom: 16 }}><div ref={recaptchaRef} /></div>}
              {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
              <Button type="primary" htmlType="submit" loading={loading} block size="large">Create free account</Button>
            </form>
            <Divider plain>or</Divider>
            <Button block size="large" icon={<GoogleLogo />} onClick={continueWithGoogle} loading={googleLoading}>Continue with Google</Button>
            <div style={{ textAlign: 'center', marginTop: 25, fontSize: 13 }}>
              <Typography.Text type="secondary">Already have an account? </Typography.Text>
              <Link to="/login">Sign in</Link>
            </div>
          </Card>
        </div>
      </section>
    </main>
  )
}
