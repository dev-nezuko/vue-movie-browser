import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { fetchMoviesSearch, MoviesApiError } from '@/api/moviesClient'
import type { MovieRecord } from '@/types/movies'

export type MoviesSearchStatus = 'idle' | 'loading' | 'success' | 'error'

export const useMoviesSearchStore = defineStore('moviesSearch', () => {
  const activeTitle = ref('')
  const page = ref(1)
  const status = ref<MoviesSearchStatus>('idle')
  const errorMessage = ref('')
  const movies = shallowRef<readonly MovieRecord[]>([])
  const total = ref(0)
  const totalPages = ref(0)
  const perPage = ref(10)

  let abortController: AbortController | null = null

  const isLoading = computed(() => status.value === 'loading')

  function abortInFlight(): void {
    abortController?.abort()
    abortController = null
  }

  function clearResults(): void {
    abortInFlight()
    activeTitle.value = ''
    page.value = 1
    movies.value = []
    total.value = 0
    totalPages.value = 0
    perPage.value = 10
    status.value = 'idle'
    errorMessage.value = ''
  }

  function applyResponse(res: Awaited<ReturnType<typeof fetchMoviesSearch>>): void {
    page.value = res.page
    movies.value = res.data
    total.value = res.total
    totalPages.value = res.total_pages
    perPage.value = res.per_page
    status.value = 'success'
    errorMessage.value = ''
  }

  async function fetchCurrentPage(): Promise<void> {
    const title = activeTitle.value.trim()
    if (!title) {
      clearResults()
      return
    }

    abortInFlight()
    const controller = new AbortController()
    abortController = controller
    const requestPage = page.value

    status.value = 'loading'
    errorMessage.value = ''

    try {
      const res = await fetchMoviesSearch({ title, page: requestPage }, controller.signal)
      if (abortController !== controller) {
        return
      }
      applyResponse(res)
    } catch (err: unknown) {
      if (abortController !== controller) {
        return
      }
      const message =
        err instanceof MoviesApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Something went wrong while loading movies.'
      status.value = 'error'
      errorMessage.value = message
      movies.value = []
      total.value = 0
      totalPages.value = 0
    } finally {
      if (abortController === controller) {
        abortController = null
      }
    }
  }

  async function search(title: string): Promise<void> {
    const t = title.trim()
    if (!t) {
      clearResults()
      return
    }
    activeTitle.value = t
    page.value = 1
    await fetchCurrentPage()
  }

  async function setPage(nextPage: number): Promise<void> {
    if (!activeTitle.value.trim() || !Number.isFinite(nextPage) || nextPage < 1) {
      return
    }
    page.value = Math.floor(nextPage)
    await fetchCurrentPage()
  }

  function reset(): void {
    clearResults()
  }

  return {
    activeTitle,
    page,
    status,
    errorMessage,
    movies,
    total,
    totalPages,
    perPage,
    isLoading,
    search,
    setPage,
    reset,
  }
})
