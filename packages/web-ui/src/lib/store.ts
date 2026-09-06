export type Store<T extends object> = {
  get(): T
  set(patch: Partial<T>): void
  setDeep<K extends keyof T>(key: K, patch: Partial<T[K]>): void
  subscribe(listener: () => void): () => void
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()

  const emit = () => {
    for (const listener of listeners) listener()
  }

  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch }
      emit()
    },
    setDeep: (key, patch) => {
      // `key` always points at a nested object in StudioState (fill/logo);
      // the single cast keeps the call site free of per-key boilerplate.
      const previous = state[key] as Record<string, unknown>
      state = { ...state, [key]: { ...previous, ...(patch as object) } }
      emit()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
