import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../App.vue'
import MovieSearchView from '@/views/MovieSearchView.vue'

describe('App', () => {
  it('mounts with layout and movie search route', async () => {
    const pinia = createPinia()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'movie-search', component: MovieSearchView }],
    })

    const wrapper = mount(App, {
      global: {
        plugins: [Quasar, pinia, router],
      },
    })

    await router.isReady()
    await flushPromises()

    expect(wrapper.text()).toContain('Movie search')
    expect(wrapper.text()).toContain('Search by title')
  })
})
