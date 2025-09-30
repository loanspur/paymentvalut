import './globals.css'
import { Inter } from 'next/font/google'
import AuthProvider from '../components/AuthProvider'
import AppLayout from '../components/AppLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'M-Pesa B2C Vault',
  description: 'Secure M-Pesa B2C Disbursement Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
