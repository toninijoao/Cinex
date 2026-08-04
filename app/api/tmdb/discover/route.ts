import { NextRequest, NextResponse } from 'next/server'
import { discoverFilms, posterUrl, backdropUrl } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const params: Record<string, string> = {}

  // Forward query parameters
  const page = searchParams.get('page') ?? '1'
  params.page = page

  const with_genres = searchParams.get('with_genres')
  if (with_genres) params.with_genres = with_genres

  const releaseDateGte = searchParams.get('primary_release_date.gte')
  if (releaseDateGte) params['primary_release_date.gte'] = releaseDateGte

  const releaseDateLte = searchParams.get('primary_release_date.lte')
  if (releaseDateLte) params['primary_release_date.lte'] = releaseDateLte

  const sort_by = searchParams.get('sort_by') ?? 'popularity.desc'
  params.sort_by = sort_by

  // Add some sensible defaults for general discovery, like TMDB's vote count threshold
  // to avoid very obscure movies unless a specific search is done
  params.without_genres = '99,10402,10770'
  if (sort_by === 'vote_average.desc') {
    params['vote_count.gte'] = '1000' // Require more reviews for rating sort to get real classics (e.g. Godfather, Shawshank)
  } else {
    params['vote_count.gte'] = '100' // Slightly lower than 300 to show more movies if filtered by genre/decade
  }

  try {
    const data = await discoverFilms(params)
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
    console.error('TMDB discover error:', err)
    return NextResponse.json({ error: 'Failed to fetch from TMDB' }, { status: 502 })
  }
}
