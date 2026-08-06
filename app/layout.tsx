import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/ui/Navbar'

export const viewport: Viewport = {
  themeColor: '#0D0D14',
}

export const metadata: Metadata = {
  title: {
    default: 'Cinex',
    template: '%s | Cinex',
  },
  description: 'Registre, avalie e descubra filmes. Acompanhe seus minutos assistidos e conecte-se com outros cinéfilos.',
  keywords: ['cinema', 'filmes', 'avaliações', 'letterboxd', 'cinéfilos', 'catálogo'],
  authors: [{ name: 'Cinex' }],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Cinex',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Navbar />
        <div className="page-wrapper">
          {children}
        </div>
      </body>
    </html>
  )
}
