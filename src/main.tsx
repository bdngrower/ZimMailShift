import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { msalInstance } from './lib/msal'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App pca={msalInstance} />
  </StrictMode>,
)
