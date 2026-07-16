import './sentry'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Sentry } from './sentry'
import { StoreProvider } from './context/AppStore'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
