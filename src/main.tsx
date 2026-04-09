import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { SignupProvider } from './contexts/SignupContext'
import ErrorBoundary from './components/errors/ErrorBoundary'
import './styles/globals.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <SignupProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    fontFamily: 'var(--font-ui)',
                    fontSize: '14px',
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-lg)'
                  },
                  success: {
                    iconTheme: { primary: '#00CCA0', secondary: '#fff' }
                  },
                  error: {
                    iconTheme: { primary: '#ef4444', secondary: '#fff' }
                  }
                }}
              />
            </SignupProvider>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
)
