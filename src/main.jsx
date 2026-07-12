import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PinnedAppsProvider } from './context/PinnedAppsContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PinnedAppsProvider>
        <App />
      </PinnedAppsProvider>
    </BrowserRouter>
  </StrictMode>
)
