import { onScopeDispose, watch, type Ref } from 'vue'

const DEBOUNCE_MS = 300

export function useDebouncedWatch<T>(
  source: Ref<T>,
  callback: (value: T) => void,
  ms: number = DEBOUNCE_MS,
): void {
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(
    source,
    (value) => {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        timer = undefined
        callback(value)
      }, ms)
    },
    { flush: 'post' },
  )

  onScopeDispose(() => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  })
}
