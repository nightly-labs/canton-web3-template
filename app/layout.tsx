import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Canton Template App',
  description:
    'Start your Canton journey here, without unnecessary configuration and setup. Just clone it and code on top of it. Powered by Nightly Wallet.',
  icons: {
    icon: '/cantonSquare.svg',
    shortcut: '/cantonSquare.svg',
    apple: '/cantonSquare.svg',
  },
  twitter: {
    title: 'Canton Template App',
    description:
      'Start your Canton journey here, without unnecessary configuration and setup. Just clone it and code on top of it. Powered by Nightly Wallet.',
    images: 'https://canton-web3-template.nightly.app/preview.png',
    card: 'summary_large_image',
    site: '@nightly_app',
  },
  openGraph: {
    title: 'Canton Template App',
    description:
      'Start your Canton journey here, without unnecessary configuration and setup. Just clone it and code on top of it. Powered by Nightly Wallet.',
    images: 'https://canton-web3-template.nightly.app/preview.png',
    url: 'https://canton-web3-template.nightly.app',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
