import './globals.css'
import { Inter } from 'next/font/google'
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
        <AuthProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
