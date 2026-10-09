import { create } from 'zustand'
import { defaultFilters, type GlobalFilters } from '../domain/types'

interface FilterStoreState {
  filters: GlobalFilters
  setFilters: (filters: GlobalFilters) => void
  updateFilters: (updater: (prev: GlobalFilters) => GlobalFilters) => void
  resetFilters: () => void
}

export const useFilterStore = create<FilterStoreState>((set) => ({
  filters: defaultFilters,
  setFilters: (filters) => set({ filters }),
  updateFilters: (updater) => set((state) => ({ filters: updater(state.filters) })),
  resetFilters: () => set({ filters: defaultFilters }),
}))
