import { NextRequest, NextResponse } from 'next/server'
import { getPersonDetails, posterUrl, backdropUrl } from '@/lib/tmdb'

interface Award {
  name: string
  count: number
  type: 'oscar' | 'golden_globe' | 'sag' | 'bafta' | 'emmy'
}

const AWARDS_DB: Record<number, Award[]> = {
  3223: [ // Robert Downey Jr.
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 4, type: 'golden_globe' },
    { name: 'BAFTA', count: 2, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' }
  ],
  1136406: [ // Tom Holland
    { name: 'BAFTA', count: 1, type: 'bafta' }
  ],
  2037: [ // Cillian Murphy
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  10297: [ // Matthew McConaughey
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  6193: [ // Leonardo DiCaprio
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 3, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  3894: [ // Christian Bale
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'SAG Awards', count: 2, type: 'sag' }
  ],
  5064: [ // Meryl Streep
    { name: 'Oscar', count: 3, type: 'oscar' },
    { name: 'Golden Globe', count: 8, type: 'golden_globe' },
    { name: 'BAFTA', count: 2, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' },
    { name: 'Emmy', count: 3, type: 'emmy' }
  ],
  287: [ // Brad Pitt
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  1245: [ // Scarlett Johansson
    { name: 'BAFTA', count: 1, type: 'bafta' }
  ],
  103: [ // Mark Ruffalo
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' },
    { name: 'Emmy', count: 1, type: 'emmy' }
  ],
  272919: [ // Tom Hiddleston
    { name: 'Golden Globe', count: 1, type: 'golden_globe' }
  ],
  2231: [ // Samuel L. Jackson
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'BAFTA', count: 1, type: 'bafta' }
  ],
  73421: [ // Joaquin Phoenix
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  1810: [ // Heath Ledger
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  4173: [ // Anthony Hopkins
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 3, type: 'bafta' },
    { name: 'Emmy', count: 2, type: 'emmy' }
  ],
  1158: [ // Al Pacino
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 4, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' },
    { name: 'Emmy', count: 2, type: 'emmy' }
  ],
  380: [ // Robert De Niro
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' }
  ],
  192: [ // Morgan Freeman
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  5293: [ // Denzel Washington
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 3, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  64: [ // Gary Oldman
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 3, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  1813: [ // Anne Hathaway
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  54693: [ // Emma Stone
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'BAFTA', count: 2, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' }
  ],
  72129: [ // Jennifer Lawrence
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 3, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  112: [ // Cate Blanchett
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 4, type: 'golden_globe' },
    { name: 'BAFTA', count: 4, type: 'bafta' },
    { name: 'SAG Awards', count: 3, type: 'sag' }
  ],
  524: [ // Natalie Portman
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  204: [ // Kate Winslet
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 4, type: 'golden_globe' },
    { name: 'BAFTA', count: 3, type: 'bafta' },
    { name: 'SAG Awards', count: 3, type: 'sag' },
    { name: 'Emmy', count: 2, type: 'emmy' }
  ],
  18277: [ // Sandra Bullock
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  7499: [ // Jared Leto
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  115440: [ // Rami Malek
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' },
    { name: 'Emmy', count: 1, type: 'emmy' }
  ],
  2888: [ // Will Smith
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  1532: [ // Casey Affleck
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  67599: [ // Eddie Redmayne
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  55060: [ // Jean Dujardin
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  5472: [ // Colin Firth
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 2, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' }
  ],
  1229: [ // Jeff Bridges
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  2180: [ // Sean Penn
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  11856: [ // Daniel Day-Lewis
    { name: 'Oscar', count: 3, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'BAFTA', count: 4, type: 'bafta' },
    { name: 'SAG Awards', count: 3, type: 'sag' }
  ],
  3905: [ // Philip Seymour Hoffman
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  134: [ // Jamie Foxx
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  934: [ // Russell Crowe
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  3292: [ // Kevin Spacey
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' }
  ],
  7083: [ // Roberto Benigni
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  514: [ // Jack Nicholson
    { name: 'Oscar', count: 3, type: 'oscar' },
    { name: 'Golden Globe', count: 6, type: 'golden_globe' },
    { name: 'BAFTA', count: 3, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  31: [ // Tom Hanks
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 4, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  2157: [ // Robin Williams
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 4, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  19137: [ // Viola Davis
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 6, type: 'sag' },
    { name: 'Emmy', count: 1, type: 'emmy' }
  ],
  539: [ // Frances McDormand
    { name: 'Oscar', count: 3, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'BAFTA', count: 3, type: 'bafta' },
    { name: 'SAG Awards', count: 4, type: 'sag' },
    { name: 'Emmy', count: 2, type: 'emmy' }
  ],
  83002: [ // Jessica Chastain
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 2, type: 'sag' }
  ],
  51: [ // Renee Zellweger
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 4, type: 'golden_globe' },
    { name: 'BAFTA', count: 2, type: 'bafta' },
    { name: 'SAG Awards', count: 4, type: 'sag' }
  ],
  93296: [ // Olivia Colman
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 3, type: 'golden_globe' },
    { name: 'BAFTA', count: 4, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' },
    { name: 'Emmy', count: 1, type: 'emmy' }
  ],
  1215: [ // Julianne Moore
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' },
    { name: 'Emmy', count: 1, type: 'emmy' }
  ],
  6885: [ // Charlize Theron
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  2226: [ // Nicole Kidman
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 4, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' },
    { name: 'Emmy', count: 2, type: 'emmy' }
  ],
  1530: [ // Halle Berry
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  1204: [ // Julia Roberts
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 3, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' }
  ],
  1205: [ // Gwyneth Paltrow
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 2, type: 'sag' },
    { name: 'Emmy', count: 1, type: 'emmy' }
  ],
  156: [ // Helen Mirren
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 3, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 5, type: 'sag' },
    { name: 'Emmy', count: 4, type: 'emmy' }
  ],
  1038: [ // Jodie Foster
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 3, type: 'golden_globe' },
    { name: 'BAFTA', count: 3, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' },
    { name: 'Emmy', count: 1, type: 'emmy' }
  ],
  8292: [ // Marion Cotillard
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' }
  ],
  3416: [ // Reese Witherspoon
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' },
    { name: 'Emmy', count: 1, type: 'emmy' }
  ],
  521: [ // Hilary Swank
    { name: 'Oscar', count: 2, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  11701: [ // Angelina Jolie
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 3, type: 'golden_globe' },
    { name: 'SAG Awards', count: 2, type: 'sag' }
  ],
  955: [ // Penelope Cruz
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'BAFTA', count: 1, type: 'bafta' }
  ],
  51221: [ // Jennifer Hudson
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  1515: [ // Catherine Zeta-Jones
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' }
  ],
  504: [ // Rachel Weisz
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  4826: [ // Jennifer Connelly
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  3063: [ // Tilda Swinton
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'BAFTA', count: 1, type: 'bafta' }
  ],
  1253375: [ // Lupita Nyong'o
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  10427: [ // Patricia Arquette
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 2, type: 'sag' },
    { name: 'Emmy', count: 2, type: 'emmy' }
  ],
  1107577: [ // Alicia Vikander
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  14757: [ // Allison Janney
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 7, type: 'sag' },
    { name: 'Emmy', count: 7, type: 'emmy' }
  ],
  10492: [ // Regina King
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'Emmy', count: 4, type: 'emmy' }
  ],
  10205: [ // Laura Dern
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 5, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' },
    { name: 'Emmy', count: 1, type: 'emmy' }
  ],
  554311: [ // Yuh-Jung Youn
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  2517855: [ // Ariana DeBose
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ],
  11022: [ // Jamie Lee Curtis
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 2, type: 'golden_globe' },
    { name: 'SAG Awards', count: 2, type: 'sag' }
  ],
  1729094: [ // Da'Vine Joy Randolph
    { name: 'Oscar', count: 1, type: 'oscar' },
    { name: 'Golden Globe', count: 1, type: 'golden_globe' },
    { name: 'BAFTA', count: 1, type: 'bafta' },
    { name: 'SAG Awards', count: 1, type: 'sag' }
  ]
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const { personId } = await params
  const id = parseInt(personId)

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid Person ID' }, { status: 400 })
  }

  try {
    const person = await getPersonDetails(id)

    // Map cast credits to include poster_url, release_year, and filter invalid items
    const rawCast = person.movie_credits?.cast ?? []
    const mappedCast = rawCast
      .filter((m: any) => m.title && m.poster_path)
      .map((m: any) => ({
        id: m.id,
        title: m.title,
        character: m.character || '',
        poster_url: posterUrl(m.poster_path, 'w342'),
        backdrop_url: m.backdrop_path ? backdropUrl(m.backdrop_path, 'w1280') : null,
        release_year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : null,
        popularity: m.popularity || 0,
      }))
      // Sort by popularity descending to show known works first
      .sort((a: any, b: any) => b.popularity - a.popularity)

    // Select the backdrop of their most popular movie that has a backdrop
    const mostPopularWithBackdrop = mappedCast.find((m: any) => m.backdrop_url)
    const actorBackdropUrl = mostPopularWithBackdrop?.backdrop_url || null

    // Determine the number of movies
    const totalMovies = rawCast.length

    // Profile URLs
    const profile_url = person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null
    const profile_url_lg = person.profile_path ? `https://image.tmdb.org/t/p/h632${person.profile_path}` : null

    // Retrieve static awards
    const awards = AWARDS_DB[id] || []

    return NextResponse.json({
      person: {
        id: person.id,
        name: person.name,
        biography: person.biography || 'Biografia não disponível.',
        birthday: person.birthday,
        place_of_birth: person.place_of_birth,
        gender: person.gender,
        profile_url,
        profile_url_lg,
        total_movies: totalMovies,
        backdrop_url: actorBackdropUrl,
        awards,
      },
      cast: mappedCast.slice(0, 20), // top 20 movies
    })
  } catch (err) {
    console.error('TMDB person proxy error:', err)
    return NextResponse.json({ error: 'Failed to fetch person details' }, { status: 502 })
  }
}
