import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './app/App.jsx'
import { TripProvider } from './hooks/useTrip.js'
import './styles/base.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TripProvider>
        <App />
      </TripProvider>
    </BrowserRouter>
  </StrictMode>,
)
