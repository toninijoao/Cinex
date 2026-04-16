const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('language', 'pt-BR')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: getHeaders(),
    cache: 'no-store', // 🚨 DESATIVADO TEMPORARIAMENTE: O sistema de cache agressivo do Next.js estava mascarando nossas requisições
  })

  if (!res.ok) throw new Error(`TMDB error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

// ── Image URL helpers ─────────────────────────────────────────────────────────

export function posterUrl(path: string | null | undefined, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342') {
  if (!path) return null
  return `${TMDB_IMAGE_BASE}/${size}${path}`
}

export function backdropUrl(path: string | null | undefined, size: 'w780' | 'w1280' | 'original' = 'w1280') {
  if (!path) return null
  return `${TMDB_IMAGE_BASE}/${size}${path}`
}

export function profileUrl(path: string | null | undefined) {
  if (!path) return null
  return `${TMDB_IMAGE_BASE}/w185${path}`
}

// ── Search ─────────────────────────────────────────────────────────────────────

export interface TmdbSearchResult {
  id: number
  title: string
  original_title: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  vote_average: number
  runtime?: number
}

export interface TmdbSearchResponse {
  results: TmdbSearchResult[]
  total_pages: number
  total_results: number
}

export async function searchFilms(query: string, page = 1) {
  return tmdbFetch<TmdbSearchResponse>('/search/movie', {
    query,
    page: String(page),
    include_adult: 'false',
  })
}

// ── Film Details ───────────────────────────────────────────────────────────────

export interface TmdbFilmDetail {
  id: number
  title: string
  original_title: string
  release_date: string
  runtime: number | null
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  genres: { id: number; name: string }[]
  production_countries: { iso_3166_1: string; name: string }[]
  videos?: {
    results: { key: string; site: string; type: string; official: boolean }[]
  }
  credits?: {
    cast: TmdbCastMember[]
    crew: TmdbCrewMember[]
  }
}

export interface TmdbCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface TmdbCrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
}

export async function getFilmDetails(tmdbId: number): Promise<TmdbFilmDetail> {
  return tmdbFetch<TmdbFilmDetail>(`/movie/${tmdbId}`, {
    append_to_response: 'videos,credits',
  })
}

// ── Lists ──────────────────────────────────────────────────────────────────────

export async function getNowPlaying(page = 1) {
  // Configura janela de tempo (últimos 40 dias até daqui a 7 dias)
  const minDate = new Date()
  minDate.setDate(minDate.getDate() - 40)
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 7)

  return tmdbFetch<TmdbSearchResponse>('/discover/movie', {
    page: String(page),
    with_release_type: '2|3', // Apenas exibições cinematográficas limitadas e amplas
    region: 'BR', // 🚨 O segredo: exige que o lançamento de cinema tenha sido NO BRASIL
    'primary_release_date.gte': minDate.toISOString().split('T')[0], // 🚨 primary_release_date evita filmes velhos lançados em bluray agora
    'primary_release_date.lte': maxDate.toISOString().split('T')[0],
    without_genres: '99,10402,10770', 
    sort_by: 'popularity.desc',
  })
}

export async function getPopular(page = 1) {
  return tmdbFetch<TmdbSearchResponse>('/discover/movie', {
    page: String(page),
    sort_by: 'popularity.desc',
    without_genres: '99,10402,10770',
    'vote_count.gte': '300', // Aumentado para 300 para matar Lollapalooza e WWE que costumam ter no máximo 50-100 avaliações
  })
}

export async function getTopRated(page = 1) {
  return tmdbFetch<TmdbSearchResponse>('/movie/top_rated', { page: String(page) })
}

export async function getTrending(timeWindow: 'day' | 'week' = 'week') {
  return tmdbFetch<TmdbSearchResponse>(`/trending/movie/${timeWindow}`)
}

export async function discoverFilms(params: Record<string, string> = {}) {
  return tmdbFetch<TmdbSearchResponse>('/discover/movie', params)
}

// ── Trailer helper ─────────────────────────────────────────────────────────────

export function extractTrailerKey(film: TmdbFilmDetail): string | null {
  if (!film.videos?.results) return null
  const trailer = film.videos.results.find(
    v => v.site === 'YouTube' && v.type === 'Trailer' && v.official
  ) ?? film.videos.results.find(
    v => v.site === 'YouTube' && v.type === 'Trailer'
  ) ?? film.videos.results.find(v => v.site === 'YouTube')
  return trailer?.key ?? null
}

// ── Map TMDB → Supabase film shape ────────────────────────────────────────────

export function mapTmdbToFilm(film: TmdbFilmDetail) {
  const trailerKey = extractTrailerKey(film)
  return {
    tmdb_id: film.id,
    title: film.title,
    original_title: film.original_title,
    release_year: film.release_date ? parseInt(film.release_date.slice(0, 4)) : null,
    runtime_minutes: film.runtime ?? null,
    synopsis: film.overview,
    poster_url: posterUrl(film.poster_path, 'w500'),
    backdrop_url: backdropUrl(film.backdrop_path, 'w1280'),
    trailer_url: trailerKey ? `https://www.youtube.com/embed/${trailerKey}` : null,
    tmdb_vote_average: Math.round((film.vote_average / 2) * 10) / 10,
    origin_country: film.production_countries?.[0]?.iso_3166_1 ?? null,
    synced_at: new Date().toISOString(),
  }
}
