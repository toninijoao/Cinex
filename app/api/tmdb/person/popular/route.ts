import { NextRequest, NextResponse } from 'next/server'
import { getPopularPeople, profileUrl } from '@/lib/tmdb'

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') ?? '1'

  try {
    const data = await getPopularPeople(parseInt(page))
    const results = (data.results ?? []).map((person: any) => ({
      tmdb_id: person.id,
      name: person.name,
      profile_path: profileUrl(person.profile_path),
    }))
    return NextResponse.json({ results })
  } catch (err) {
    console.error('TMDB popular person fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch from TMDB' }, { status: 502 })
  }
}
