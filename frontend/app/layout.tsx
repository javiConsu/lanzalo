import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lanzalo - IA que maneja tu empresa',
  description: 'Plataforma de co-fundador IA autónomo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
