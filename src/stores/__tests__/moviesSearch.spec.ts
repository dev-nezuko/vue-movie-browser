import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MoviesSearchResponse } from '@/types/movies'
import * as moviesClient from '@/api/moviesClient'
import { useMoviesSearchStore } from '../moviesSearch'

type FetchMoviesSearchFn = (
  params: { title: string; page: number },
  signal?: AbortSignal,
) => Promise<MoviesSearchResponse>

vi.mock('@/api/moviesClient', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/api/moviesClient')>()
  return {
    ...mod,
    fetchMoviesSearch: vi.fn<FetchMoviesSearchFn>(),
  }
})

const fetchMock = vi.mocked(moviesClient.fetchMoviesSearch)

describe('useMoviesSearchStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
  })

  it('clears state when searching an empty title', async () => {
    const store = useMoviesSearchStore()
    fetchMock.mockResolvedValueOnce({
      page: 1,
      per_page: 10,
      total: 1,
      total_pages: 1,
      data: [{ Title: 'A', Year: 1, imdbID: 'tt1' }],
    })

    await store.search('hello')
    expect(store.movies).toHaveLength(1)

    await store.search('   ')
    expect(store.status).toBe('idle')
    expect(store.movies).toHaveLength(0)
    expect(store.activeTitle).toBe('')
  })

  it('loads movies and sets success state', async () => {
    fetchMock.mockResolvedValueOnce({
      page: 1,
      per_page: 10,
      total: 2,
      total_pages: 1,
      data: [
        { Title: 'A', Year: 2001, imdbID: 'tt1' },
        { Title: 'B', Year: 2002, imdbID: 'tt2' },
      ],
    })

    const store = useMoviesSearchStore()
    await store.search('spider')

    expect(fetchMock).toHaveBeenCalledWith({ title: 'spider', page: 1 }, expect.any(AbortSignal))
    expect(store.status).toBe('success')
    expect(store.total).toBe(2)
    expect(store.movies).toHaveLength(2)
    expect(store.page).toBe(1)
  })

  it('sets error state when the API throws', async () => {
    fetchMock.mockRejectedValueOnce(new moviesClient.MoviesApiError('network'))

    const store = useMoviesSearchStore()
    await store.search('fail')

    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('network')
    expect(store.movies).toHaveLength(0)
  })

  it('fetches the next page via setPage', async () => {
    fetchMock
      .mockResolvedValueOnce({
        page: 1,
        per_page: 10,
        total: 20,
        total_pages: 2,
        data: [{ Title: 'P1', Year: 1, imdbID: 'tt1' }],
      })
      .mockResolvedValueOnce({
        page: 2,
        per_page: 10,
        total: 20,
        total_pages: 2,
        data: [{ Title: 'P2', Year: 2, imdbID: 'tt2' }],
      })

    const store = useMoviesSearchStore()
    await store.search('bat')
    expect(store.page).toBe(1)

    await store.setPage(2)
    expect(fetchMock).toHaveBeenLastCalledWith({ title: 'bat', page: 2 }, expect.any(AbortSignal))
    expect(store.page).toBe(2)
    expect(store.movies[0]?.Title).toBe('P2')
  })

  it('ignores setPage when there is no active title', async () => {
    const store = useMoviesSearchStore()
    await store.setPage(2)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reset clears everything', async () => {
    fetchMock.mockResolvedValueOnce({
      page: 1,
      per_page: 10,
      total: 1,
      total_pages: 1,
      data: [{ Title: 'A', Year: 1, imdbID: 'tt1' }],
    })

    const store = useMoviesSearchStore()
    await store.search('x')
    store.reset()

    expect(store.status).toBe('idle')
    expect(store.movies).toHaveLength(0)
    expect(store.activeTitle).toBe('')
  })
})


it('an older failure cannot overwrite a newer successful search', async () => {
  setActivePinia(createPinia())
  fetchMock.mockReset()
  let rejectOld!: (error: Error) => void
  fetchMock.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject }))
  fetchMock.mockResolvedValueOnce({page:1,per_page:10,total:1,total_pages:1,data:[{Title:'New result',Year:2024,imdbID:'tt-new'}]})
  const store = useMoviesSearchStore()
  const old = store.search('old')
  await store.search('new')
  rejectOld(new Error('late old failure'))
  await old
  expect(store.status).toBe('success')
  expect(store.movies[0]?.Title).toBe('New result')
  expect(store.errorMessage).toBe('')
})

it('clearing results prevents a late failure from restoring an error', async () => {
  setActivePinia(createPinia())
  fetchMock.mockReset()
  let rejectOld!: (error: Error) => void
  fetchMock.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject }))
  const store = useMoviesSearchStore()
  const old = store.search('old')
  store.reset()
  rejectOld(new Error('late old failure'))
  await old
  expect(store.status).toBe('idle')
  expect(store.total).toBe(0)
})

it('a current failed page clears stale totals and pagination', async () => {
  setActivePinia(createPinia())
  fetchMock.mockReset()
  fetchMock.mockResolvedValueOnce({page:1,per_page:10,total:20,total_pages:2,data:[{Title:'Old',Year:2024,imdbID:'tt-old'}]})
  const store = useMoviesSearchStore()
  await store.search('old')
  fetchMock.mockRejectedValueOnce(new Error('offline'))
  await store.setPage(2)
  expect(store.status).toBe('error')
  expect(store.total).toBe(0)
  expect(store.totalPages).toBe(0)
})
