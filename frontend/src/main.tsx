import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AntThemeProvider } from '@/components/design/AntThemeProvider'
import App from './App'
import './style.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AntThemeProvider>
        <App />
      </AntThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
