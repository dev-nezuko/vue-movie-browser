import type { MoviesSearchResponse } from '@/types/movies'

export const MOVIES_API_ORIGIN = 'https://jsonmock.hackerrank.com' as const

export class MoviesApiError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'MoviesApiError'
    this.status = status
  }
}

function assertHttpsOrigin(origin: string): void {
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    throw new MoviesApiError('Invalid API origin')
  }
  if (url.protocol !== 'https:') {
    throw new MoviesApiError('API origin must use HTTPS')
  }
}

export async function fetchMoviesSearch(
  params: { title: string; page: number },
  signal?: AbortSignal,
): Promise<MoviesSearchResponse> {
  const title = params.title.trim()
  if (!title) {
    throw new MoviesApiError('Search title must not be empty')
  }
  if (!Number.isSafeInteger(params.page) || params.page < 1) {
    throw new MoviesApiError('Page must be a positive integer')
  }

  assertHttpsOrigin(MOVIES_API_ORIGIN)

  const url = new URL('/api/movies/search', MOVIES_API_ORIGIN)
  url.searchParams.set('Title', title)
  url.searchParams.set('page', String(params.page))

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new MoviesApiError(
      `Movie search failed (${response.status} ${response.statusText})`,
      response.status,
    )
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new MoviesApiError('Invalid JSON response from movie API')
  }

  return parseMoviesSearchResponse(body)
}

function parseMoviesSearchResponse(body: unknown): MoviesSearchResponse {
  if (typeof body !== 'object' || body === null) {
    throw new MoviesApiError('Unexpected movie API response shape')
  }
  const o = body as Record<string, unknown>
  const page = o.page
  const per_page = o.per_page
  const total = o.total
  const total_pages = o.total_pages
  const data = o.data

  if (typeof page !== 'number' || typeof per_page !== 'number' || typeof total !== 'number') {
    throw new MoviesApiError('Movie API response missing numeric pagination fields')
  }
  if (typeof total_pages !== 'number') {
    throw new MoviesApiError('Movie API response missing total_pages')
  }
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(per_page) || per_page < 1 || !Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(total_pages) || total_pages < 0) {
    throw new MoviesApiError('Movie API pagination fields must be bounded integers')
  }
  if (!Array.isArray(data)) {
    throw new MoviesApiError('Movie API response data is not an array')
  }

  const movies = data.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new MoviesApiError(`Invalid movie entry at index ${index}`)
    }
    const m = item as Record<string, unknown>
    if (typeof m.Title !== 'string' || typeof m.Year !== 'number' || typeof m.imdbID !== 'string') {
      throw new MoviesApiError(`Invalid movie fields at index ${index}`)
    }
    return {
      Title: m.Title,
      Year: m.Year,
      imdbID: m.imdbID,
    } as const
  })

  return {
    page,
    per_page,
    total,
    total_pages,
    data: movies,
  }
}
