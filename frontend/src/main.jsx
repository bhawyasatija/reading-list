// Entry point: the file index.html loads. It mounts React into <div id="root">.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
// Global styles must be imported before App: CSS loads in import order, and
// component styles (imported inside App's components) need to come later so
// they can override the global rules when both have the same specificity.
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // StrictMode adds extra development-only checks. One visible effect: in
  // development, effects run twice on mount, so each page's API request
  // appears twice in the Network tab. Production builds run them once.
  <StrictMode>
    {/* BrowserRouter keeps the UI in sync with the URL in the address bar. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
