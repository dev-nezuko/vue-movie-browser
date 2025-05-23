<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  QBanner,
  QBtn,
  QCard,
  QCardSection,
  QIcon,
  QInnerLoading,
  QInput,
  QPagination,
  QSeparator,
  QTable,
} from 'quasar'

import { useDebouncedWatch } from '@/composables/useDebouncedWatch'
import { useMoviesSearchStore } from '@/stores/moviesSearch'
import type { MovieRecord } from '@/types/movies'

const store = useMoviesSearchStore()
const { activeTitle, page, status, errorMessage, movies, total, totalPages, isLoading } =
  storeToRefs(store)

const localQuery = ref<string | null>('')

useDebouncedWatch(localQuery, (value) => {
  void store.search(String(value ?? ''))
})

function submitNow(): void {
  void store.search(localQuery.value || '')
}

function onPageChange(next: number): void {
  void store.setPage(next)
}

const columns = [
  {
    name: 'title',
    label: 'Title',
    field: (row: MovieRecord) => row.Title,
    align: 'left' as const,
  },
  {
    name: 'year',
    label: 'Year',
    field: (row: MovieRecord) => row.Year,
    align: 'right' as const,
  },
  {
    name: 'imdb',
    label: 'IMDb ID',
    field: (row: MovieRecord) => row.imdbID,
    align: 'left' as const,
  },
]
</script>

<template>
  <div class="movie-search">
    <h1 class="text-h4 q-mt-none q-mb-sm">Search a small movie catalog</h1>
    <p class="text-body2 text-grey-7 q-mb-lg">A Vue and Pinia demo using a public mock-data API. Search titles, inspect IDs and move between result pages.</p>
    <QCard flat bordered class="movie-search__card">
      <QCardSection>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-8">
            <QInput
              v-model="localQuery"
              data-testid="movie-search-input"
              outlined
              clearable
              label="Search by title"
              @keyup.enter="submitNow"
            >
              <template #prepend>
                <QIcon name="search" />
              </template>
            </QInput>
          </div>
          <div class="col-12 col-md-4">
            <QBtn
              data-testid="movie-search-submit"
              color="primary"
              class="full-width"
              label="Search"
              :loading="isLoading"
              @click="submitNow"
            />
          </div>
        </div>
        <div class="row q-mt-xs">
          <div class="col-12 text-caption text-grey-7">
            Results update after you stop typing for a short moment. Press Enter or Search to run
            immediately.
          </div>
        </div>
      </QCardSection>

      <QSeparator />

      <QCardSection
        class="relative-position"
        data-testid="movie-results-section"
        :aria-busy="isLoading"
        aria-live="polite"
      >
        <QBanner
          v-if="status === 'error'"
          data-testid="movie-error"
          rounded
          class="bg-negative text-white q-mb-md"
        >
          <template #avatar>
            <QIcon name="error_outline" color="white" />
          </template>
          {{ errorMessage }}
          <template #action>
            <QBtn flat dense color="white" label="Retry" @click="submitNow" />
          </template>
        </QBanner>

        <div v-if="status === 'idle' && !activeTitle" class="text-body2 text-grey-7" data-testid="movie-idle-hint">
          Enter a movie title to search the catalog.
        </div>

        <div
          v-else-if="status === 'success' && movies.length === 0"
          class="text-body1"
          data-testid="movie-empty"
        >
          No movies matched <strong>{{ activeTitle }}</strong>.
        </div>

        <div v-if="total > 0" class="text-caption text-grey-7 q-mb-sm" data-testid="movie-total">
          {{ total }} result{{ total === 1 ? '' : 's' }}
        </div>

        <QInnerLoading :showing="isLoading" label="Loading…" label-class="text-teal" />

        <QTable
          v-if="movies.length > 0"
          data-testid="movie-results-table"
          flat
          bordered
          dense
          :rows="[...movies]"
          :columns="columns"
          row-key="imdbID"
          hide-pagination
          :rows-per-page-options="[0]"
        />

        <div v-if="totalPages > 1" class="row justify-center q-mt-md">
          <QPagination
            data-testid="movie-pagination"
            :model-value="page"
            :max="totalPages"
            :max-pages="7"
            direction-links
            boundary-links
            color="primary"
            :disable="isLoading"
            @update:model-value="onPageChange"
          />
        </div>
      </QCardSection>
    </QCard>
  </div>
</template>

<style scoped lang="scss">
.movie-search {
  max-width: 960px;
  margin: 0 auto;
}

.movie-search__card {
  overflow: hidden;
}
</style>
