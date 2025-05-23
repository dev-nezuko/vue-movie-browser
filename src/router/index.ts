import { createRouter, createWebHistory } from 'vue-router'

import MovieSearchView from '@/views/MovieSearchView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'movie-search',
      component: MovieSearchView,
    },
  ],
})

export default router
