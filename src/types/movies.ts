export interface MovieRecord {
  readonly Title: string
  readonly Year: number
  readonly imdbID: string
}

export interface MoviesSearchResponse {
  readonly page: number
  readonly per_page: number
  readonly total: number
  readonly total_pages: number
  readonly data: readonly MovieRecord[]
}
