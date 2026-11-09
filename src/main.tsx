import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { StoreProvider } from './lib/store'

// Follow the OS colour scheme.
const mq = window.matchMedia('(prefers-color-scheme: dark)')
const root = document.documentElement
const apply = () => {
  const forced = root.getAttribute('data-theme')
  root.classList.toggle('dark', forced ? forced === 'dark' : mq.matches)
}
apply()
mq.addEventListener('change', apply)
new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-theme'] })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
