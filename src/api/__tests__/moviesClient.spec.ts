import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchMoviesSearch, MoviesApiError, MOVIES_API_ORIGIN } from '../moviesClient'

describe('fetchMoviesSearch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws when title is empty or whitespace', async () => {
    await expect(fetchMoviesSearch({ title: '   ', page: 1 })).rejects.toThrow(MoviesApiError)
    await expect(fetchMoviesSearch({ title: '', page: 1 })).rejects.toThrow(MoviesApiError)
  })

  it('throws when page is invalid', async () => {
    await expect(fetchMoviesSearch({ title: 'x', page: 0 })).rejects.toThrow(MoviesApiError)
    await expect(fetchMoviesSearch({ title: 'x', page: -1 })).rejects.toThrow(MoviesApiError)
    await expect(fetchMoviesSearch({ title: 'x', page: Number.NaN })).rejects.toThrow(MoviesApiError)
  })

  it('requests HTTPS jsonmock URL with encoded query', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          page: 1,
          per_page: 10,
          total: 0,
          total_pages: 0,
          data: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await fetchMoviesSearch({ title: 'a b', page: 2 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url.startsWith(MOVIES_API_ORIGIN)).toBe(true)
    const parsed = new URL(url)
    expect(parsed.searchParams.get('Title')).toBe('a b')
    expect(parsed.searchParams.get('page')).toBe('2')
  })

  it('parses a successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          page: 1,
          per_page: 10,
          total: 1,
          total_pages: 1,
          data: [{ Title: 'Test', Year: 2000, imdbID: 'tt1' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const res = await fetchMoviesSearch({ title: 'Test', page: 1 })
    expect(res.total).toBe(1)
    expect(res.data).toHaveLength(1)
    expect(res.data[0]?.Title).toBe('Test')
  })

  it('throws MoviesApiError on non-OK HTTP status', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 503, statusText: 'Unavailable' }))

    await expect(fetchMoviesSearch({ title: 'x', page: 1 })).rejects.toThrow(/503/)
  })

  it('throws when JSON body is invalid', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('not json', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )

    await expect(fetchMoviesSearch({ title: 'x', page: 1 })).rejects.toThrow(MoviesApiError)
  })

  it('throws when response shape is wrong', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ foo: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(fetchMoviesSearch({ title: 'x', page: 1 })).rejects.toThrow(MoviesApiError)
  })

  it('passes AbortSignal to fetch', async () => {
    const fetchMock = vi.mocked(fetch).mockImplementation((_input, init) => {
      expect(init?.signal).toBeDefined()
      return Promise.resolve(
        new Response(
          JSON.stringify({
            page: 1,
            per_page: 10,
            total: 0,
            total_pages: 0,
            data: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
    })

    const ac = new AbortController()
    await fetchMoviesSearch({ title: 'x', page: 1 }, ac.signal)
    expect(fetchMock).toHaveBeenCalled()
  })
})


it('rejects fractional input and malformed pagination responses', async () => {
  vi.stubGlobal('fetch', vi.fn())
  try {
    await expect(fetchMoviesSearch({title:'x',page:1.5})).rejects.toThrow(MoviesApiError)
    for (const invalid of [{page:1.5},{per_page:0},{total:-1},{total_pages:2.5}]) {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({page:1,per_page:10,total:0,total_pages:0,data:[],...invalid}),{status:200}))
      await expect(fetchMoviesSearch({title:'x',page:1})).rejects.toThrow(MoviesApiError)
    }
  } finally { vi.unstubAllGlobals() }
})
