import { Suspense } from 'react'
import SearchPageContent from './SearchContent'

export const metadata = {
  title: 'Buscar',
  description: 'Busque filmes e usuários no Cinex',
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--cx-text3)' }}>
        Carregando...
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
