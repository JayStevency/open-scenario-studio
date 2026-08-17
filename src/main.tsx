import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root 엘리먼트를 찾지 못했다')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
