import './globals.css'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import AuthProvider from '../components/AuthProvider'
import AppLayout from '../components/AppLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'EazzyPay',
  description: 'Secure EazzyPay B2C Disbursement Management System',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
          <AuthProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}
