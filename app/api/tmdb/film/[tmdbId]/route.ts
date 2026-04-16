import { NextRequest, NextResponse } from 'next/server'
import { getFilmDetails, mapTmdbToFilm, posterUrl, backdropUrl, profileUrl } from '@/lib/tmdb'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const { tmdbId } = await params
  const id = parseInt(tmdbId)

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid TMDB ID' }, { status: 400 })
  }

  try {
    const film = await getFilmDetails(id)
    const mapped = mapTmdbToFilm(film)

    const cast = (film.credits?.cast ?? []).slice(0, 15).map(m => ({
      tmdb_id: m.id,
      name: m.name,
      character: m.character,
      profile_url: profileUrl(m.profile_path),
      order: m.order,
      job: 'actor',
    }))

    const crew = (film.credits?.crew ?? [])
      .filter(m => ['Director', 'Screenplay', 'Writer', 'Story'].includes(m.job))
      .slice(0, 10)
      .map(m => ({
        tmdb_id: m.id,
        name: m.name,
        job: m.job.toLowerCase() === 'director' ? 'director' : 'writer',
        profile_url: profileUrl(m.profile_path),
      }))

    return NextResponse.json({
      film: {
        ...mapped,
        genres: film.genres,
        poster_url_lg: posterUrl(film.poster_path, 'w500'),
        backdrop_url_full: backdropUrl(film.backdrop_path, 'original'),
      },
      cast,
      crew,
    })
  } catch (err) {
    console.error('TMDB film detail error:', err)
    return NextResponse.json({ error: 'Failed to fetch film details' }, { status: 502 })
  }
}
