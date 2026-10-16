import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Flex, Result } from 'antd'

export function GoogleConnectedPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const status = params.get('status') ?? 'success'
  const ok = status === 'success'

  useEffect(() => {
    window.opener?.postMessage({ type: 'GOOGLE_CONNECTED', status }, window.location.origin)
    const timer = window.setTimeout(() => {
      if (window.opener) window.close()
      else navigate('/settings')
    }, 800)
    return () => window.clearTimeout(timer)
  }, [navigate, status])

  return <Flex align="center" justify="center" style={{minHeight:'100vh',padding:24,background:'var(--ox-canvas)'}}>
    <Card style={{width:'100%',maxWidth:450}}>
      <Result status={ok?'success':'error'} title={ok?'Google Drive connected':'Connection failed'}
        subTitle={ok?'Your connected account is ready. This window will close automatically.':'Close this window and try again.'} />
    </Card>
  </Flex>
}
