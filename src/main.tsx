import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { StoreProvider } from './lib/store'

// Follow the OS colour scheme.
const mq = window.matchMedia('(prefers-color-scheme: dark)')
const apply = () => document.documentElement.classList.toggle('dark', mq.matches)
apply()
mq.addEventListener('change', apply)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
