import { test, expect } from '@playwright/test'

const responsePage1 = {
  page: 1,
  per_page: 10,
  total: 11,
  total_pages: 2,
  data: [
    { Title: 'Alpha', Year: 2001, imdbID: 'tt100' },
    { Title: 'Beta', Year: 2002, imdbID: 'tt101' },
  ],
}

const responsePage2 = {
  page: 2,
  per_page: 10,
  total: 11,
  total_pages: 2,
  data: [{ Title: 'Gamma', Year: 2003, imdbID: 'tt102' }],
}

test.describe('Movie search', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/movies/search**', async (route) => {
      const url = new URL(route.request().url())
      const pageParam = url.searchParams.get('page') ?? '1'
      const body = pageParam === '2' ? responsePage2 : responsePage1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    })
  })

  test('searches and paginates with mocked API', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Search by title').fill('mock')
    await page.getByTestId('movie-search-submit').click()

    await expect(page.getByTestId('movie-results-table')).toBeVisible()
    await expect(page.getByTestId('movie-results-table')).toContainText('Alpha')
    await expect(page.getByTestId('movie-total')).toContainText('11 results')

    await page.getByTestId('movie-pagination').getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByTestId('movie-results-table')).toContainText('Gamma')
  })

  test('exposes busy state while a request is in flight', async ({ page }) => {
    let release: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    await page.route('**/api/movies/search**', async (route) => {
      await gate
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responsePage1),
      })
    })

    await page.goto('/')
    await page.getByLabel('Search by title').fill('hold')
    const busyPromise = expect(page.getByTestId('movie-results-section')).toHaveAttribute(
      'aria-busy',
      'true',
    )
    await page.getByTestId('movie-search-submit').click()
    await busyPromise
    release!()
    await expect(page.getByTestId('movie-results-section')).toHaveAttribute('aria-busy', 'false')
    await expect(page.getByTestId('movie-results-table')).toContainText('Alpha')
  })
})


test('clear resets results without searching for the string null', async ({ page }) => {
  const titles: string[] = []
  await page.route('**/api/movies/search**', async route => {
    titles.push(new URL(route.request().url()).searchParams.get('Title') || '')
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(responsePage1)})
  })
  await page.goto('/')
  await page.getByLabel('Search by title').fill('mock')
  await page.getByTestId('movie-search-submit').click()
  await expect(page.getByTestId('movie-results-table')).toBeVisible()
  await page.getByRole('button', {name: 'Clear', exact: true}).click()
  await expect(page.getByTestId('movie-idle-hint')).toBeVisible()
  expect(titles).not.toContain('null')
})
