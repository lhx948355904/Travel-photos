import { create } from 'zustand'
import type { Location } from '../types'

interface MapState {
  locations: Location[]
  selectedLocation: Location | null
  setLocations: (locations: Location[]) => void
  setSelectedLocation: (location: Location | null) => void
  addLocation: (location: Location) => void
  updateLocation: (location: Location) => void
  removeLocation: (id: number) => void
}

export const useMapStore = create<MapState>((set) => ({
  locations: [],
  selectedLocation: null,
  setLocations: (locations) => set({ locations }),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  addLocation: (location) =>
    set((state) => ({ locations: [...state.locations, location] })),
  updateLocation: (location) =>
    set((state) => ({
      locations: state.locations.map((l) => (l.id === location.id ? location : l)),
    })),
  removeLocation: (id) =>
    set((state) => ({
      locations: state.locations.filter((l) => l.id !== id),
    })),
}))
