import { NextRequest, NextResponse } from 'next/server'
import { getNowPlaying, posterUrl, backdropUrl } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') ?? '1'
  try {
    const data = await getNowPlaying(parseInt(page))
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
    console.error('TMDB now playing error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 502 })
  }
}
