import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './context/AppStore'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
