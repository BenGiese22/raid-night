import type { Metadata, Viewport } from 'next'
import { Archivo } from 'next/font/google'
import './globals.css'

// Archivo's width axis gives us a condensed, heavy voice for headlines and a
// normal-width voice for everything else without pulling in a second family.
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  axes: ['wdth'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Raid Night Bingo',
  description: 'Bingo for your raid group. Share one link, everyone gets their own board.',
}

export const viewport: Viewport = {
  themeColor: '#14222B',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} bg-night font-sans text-bone antialiased`}>
        {children}
      </body>
    </html>
  )
}
