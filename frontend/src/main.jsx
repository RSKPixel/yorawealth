import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap-icons/font/bootstrap-icons.css'
import App from './App.jsx'
import { applyRootFontSizePx, readRootFontSizePx } from './config/rootFontSize.js'
import { applyStarsBrightness, readStarsSettings } from './config/starsBackground.js'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import './index.css'

applyRootFontSizePx(readRootFontSizePx())
applyStarsBrightness(readStarsSettings().brightness)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
