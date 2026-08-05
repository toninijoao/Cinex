import { NextRequest, NextResponse } from 'next/server'
import { searchPeople, profileUrl } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  const page = request.nextUrl.searchParams.get('page') ?? '1'

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ results: [], total_pages: 0, total_results: 0 })
  }

  try {
    const data = await searchPeople(query.trim(), parseInt(page))
    const results = (data.results ?? []).map((person: any) => ({
      tmdb_id: person.id,
      name: person.name,
      profile_path: profileUrl(person.profile_path),
    }))
    return NextResponse.json({ results, total_pages: data.total_pages, total_results: data.total_results })
  } catch (err) {
    console.error('TMDB person search error:', err)
    return NextResponse.json({ error: 'Failed to fetch from TMDB' }, { status: 502 })
  }
}
