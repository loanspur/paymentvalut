'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EnhancedLoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to secure login (the main enhanced login) using replace to prevent back button issues
    router.replace('/secure-login')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to secure login...</p>
      </div>
    </div>
  )
}