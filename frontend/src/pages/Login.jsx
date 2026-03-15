import { SignIn, SignUp } from '@clerk/clerk-react'

const clerkAppearance = {
  variables: {
    colorPrimary: '#10b981',
    colorBackground: '#1f2937',
    colorText: '#f9fafb',
    colorTextSecondary: '#9ca3af',
    colorInputBackground: '#374151',
    colorInputText: '#f9fafb',
    colorNeutral: '#6b7280',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, sans-serif',
  },
  elements: {
    card: {
      boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
      border: '1px solid #374151',
    },
    formButtonPrimary: {
      backgroundColor: '#10b981',
      color: '#0d1117',
      fontWeight: '600',
    },
  },
}

export default function Login({ mode, onClose }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-white transition-colors mb-4 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Volver
          </button>
        )}
        <h1 className="text-4xl font-bold text-white mb-2">🚀 Lanzalo</h1>
        <p className="text-gray-400">Tu co-fundador IA autónomo</p>
      </div>

      {mode === 'register' ? (
        <SignUp
          appearance={clerkAppearance}
          afterSignUpUrl="/onboarding"
          routing="hash"
        />
      ) : (
        <SignIn
          appearance={clerkAppearance}
          afterSignInUrl="/"
          routing="hash"
        />
      )}
    </div>
  )
}
