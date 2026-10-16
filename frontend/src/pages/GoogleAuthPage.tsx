import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Flex, Result, Spin, Typography } from 'antd'
import { apiFetch } from '@/lib/api'
import { setAuthSession, type AuthUser } from '@/lib/auth'

type AuthResponse = { accessToken: string; refreshToken: string; user: AuthUser }

export function GoogleAuthPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Completing Google sign-in...')
  const token = params.get('token')
  const status = params.get('status')

  useEffect(() => {
    if (status === 'error' || !token) {
      setMessage('Google sign-in failed. Please try again.')
      return
    }

    apiFetch<AuthResponse>('/auth/google/exchange', { method: 'POST', skipAuth: true, body: JSON.stringify({ token }) })
      .then((data) => {
        setAuthSession(data.accessToken, data.refreshToken, data.user)
        navigate('/all-files', { replace: true })
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.'))
  }, [navigate, status, token])

  return <Flex align="center" justify="center" style={{minHeight:'100vh',padding:24,background:'var(--ox-canvas)'}}>
    <Card style={{width:'100%',maxWidth:450,textAlign:'center'}}>
      {status==='error'||!token ? <Result status="error" title="Google sign-in failed" subTitle={message} /> :
        <div style={{padding:'40px 10px'}}><Spin size="large" /><Typography.Title level={4} style={{marginTop:25}}>Connecting your account</Typography.Title><Typography.Text type="secondary">{message}</Typography.Text></div>}
    </Card>
  </Flex>
}
