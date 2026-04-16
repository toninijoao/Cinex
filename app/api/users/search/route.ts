import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''

  if (q.trim().length < 2) {
    return NextResponse.json({ users: [] })
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, films_count, is_public')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .eq('is_public', true)
    .order('films_count', { ascending: false })
    .limit(20)

  return NextResponse.json({ users: data ?? [] })
}
