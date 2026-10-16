import { useEffect, useState, type ReactNode } from 'react'
import { App as AntApp, ConfigProvider, theme, type ThemeConfig } from 'antd'

type Appearance = 'light' | 'dark'
const key = 'OpenXdrive:theme'
export const appearanceEvent = 'openxdrive:appearance-changed'

function initialAppearance(): Appearance {
  const saved = localStorage.getItem(key)
  return saved === 'dark' ? 'dark' : 'light'
}

export function AntThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(initialAppearance)

  useEffect(() => {
    const handleAppearance = () => setAppearance(initialAppearance())
    window.addEventListener(appearanceEvent, handleAppearance)
    return () => window.removeEventListener(appearanceEvent, handleAppearance)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = appearance
    document.documentElement.classList.toggle('dark', appearance === 'dark')
    document.documentElement.classList.toggle('light', appearance === 'light')
  }, [appearance])

  const config: ThemeConfig = {
    algorithm: appearance === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1677ff',
      colorInfo: '#1677ff',
      colorSuccess: '#16a34a',
      colorWarning: '#d97706',
      colorError: '#dc2626',
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14,
      borderRadius: 8,
      borderRadiusLG: 12,
      wireframe: false,
      controlHeight: 38,
      colorBgLayout: appearance === 'dark' ? '#0e1117' : '#f6f8fb',
      colorBorderSecondary: appearance === 'dark' ? '#272d38' : '#e9eef5',
    },
    components: {
      Layout: {
        siderBg: appearance === 'dark' ? '#141923' : '#ffffff',
        headerBg: appearance === 'dark' ? '#141923' : '#ffffff',
        bodyBg: appearance === 'dark' ? '#0e1117' : '#f6f8fb',
      },
      Menu: {
        itemHeight: 42,
        itemBorderRadius: 8,
        itemMarginInline: 10,
        itemSelectedBg: appearance === 'dark' ? '#172f52' : '#eaf3ff',
        itemSelectedColor: '#1677ff',
        activeBarWidth: 0,
      },
      Card: {
        bodyPadding: 20,
        headerHeight: 52,
      },
      Table: {
        headerBg: appearance === 'dark' ? '#171c26' : '#f8fafc',
        headerColor: appearance === 'dark' ? '#bcc5d3' : '#526174',
        headerBorderRadius: 8,
        rowHoverBg: appearance === 'dark' ? '#1a2330' : '#f4f8ff',
      },
      Button: { primaryShadow: 'none' },
      Input: { activeShadow: '0 0 0 2px rgba(22,119,255,.10)' },
    },
  }

  return (
    <ConfigProvider theme={config} componentSize="middle">
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  )
}
