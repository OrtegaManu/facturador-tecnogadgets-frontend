import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'

hydrateRoot(document.getElementById('root'),
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
