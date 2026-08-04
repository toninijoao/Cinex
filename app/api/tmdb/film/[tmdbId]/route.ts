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

    const backdrops = (film as any).images?.backdrops ?? []
    // Filter out backdrops without file_path and skip the first one to avoid duplicate of the header background
    const validBackdrops = backdrops.filter((b: any) => b.file_path).slice(1)
    const sampleSize = 10
    const poolSize = Math.min(validBackdrops.length, 100)
    const images: string[] = []

    if (poolSize > 0) {
      if (poolSize <= sampleSize) {
        validBackdrops.slice(0, poolSize).forEach((b: any) => {
          const url = backdropUrl(b.file_path, 'w780')
          if (url) images.push(url)
        })
      } else {
        const step = poolSize / sampleSize
        for (let i = 0; i < sampleSize; i++) {
          const idx = Math.min(Math.floor(i * step), poolSize - 1)
          const url = backdropUrl(validBackdrops[idx].file_path, 'w780')
          if (url) images.push(url)
        }
      }
    }

    return NextResponse.json({
      film: {
        ...mapped,
        genres: film.genres,
        poster_url_lg: posterUrl(film.poster_path, 'w500'),
        backdrop_url_full: backdropUrl(film.backdrop_path, 'original'),
        images,
      },
      cast,
      crew,
    })
  } catch (err) {
    console.error('TMDB film detail error:', err)
    return NextResponse.json({ error: 'Failed to fetch film details' }, { status: 502 })
  }
}
