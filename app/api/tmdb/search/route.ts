import { NextRequest, NextResponse } from 'next/server'
import { searchFilms, posterUrl, backdropUrl } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  const page = request.nextUrl.searchParams.get('page') ?? '1'

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [], total_pages: 0, total_results: 0 })
  }

  try {
    const data = await searchFilms(query.trim(), parseInt(page))
    const results = data.results.map(film => ({
      tmdb_id: film.id,
      title: film.title,
      original_title: film.original_title,
      release_year: film.release_date ? parseInt(film.release_date.slice(0, 4)) : null,
      poster_url: posterUrl(film.poster_path, 'w342'),
      backdrop_url: backdropUrl(film.backdrop_path, 'w780'),
      synopsis: film.overview,
      tmdb_vote_average: Math.round((film.vote_average / 2) * 10) / 10,
    }))
    return NextResponse.json({ results, total_pages: data.total_pages, total_results: data.total_results })
  } catch (err) {
    console.error('TMDB search error:', err)
    return NextResponse.json({ error: 'Failed to fetch from TMDB' }, { status: 502 })
  }
}
