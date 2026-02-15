import { create } from 'zustand'
import type { PodcastStoreState } from './types'
import type { PodcastNode } from '@/lib/supabase/types'

const initialStreamingState = { isStreaming: false, targetNodeId: null, buffer: '' }
const initialAutoSaveState = { isDirty: false, lastSaveAt: null, saveStatus: 'idle' as const }

export const usePodcastStore = create<PodcastStoreState>((set, get) => ({
  podcast: null,
  nodes: new Map(),
  selectedPath: [],
  activeNodeId: null,
  streamingState: { ...initialStreamingState },
  autoSaveState: { ...initialAutoSaveState },

  setPodcast: (podcast) => set({ podcast }),

  setNodes: (nodes: PodcastNode[]) => {
    const map = new Map<string, PodcastNode>()
    nodes.forEach(n => map.set(n.id, n))
    set({ nodes: map })
  },

  addNodes: (nodes: PodcastNode[]) => {
    set(state => {
      const newMap = new Map(state.nodes)
      nodes.forEach(n => newMap.set(n.id, n))
      return { nodes: newMap, autoSaveState: { ...state.autoSaveState, isDirty: true } }
    })
  },

  updateNode: (id, updates) => {
    set(state => {
      const newMap = new Map(state.nodes)
      const existing = newMap.get(id)
      if (existing) newMap.set(id, { ...existing, ...updates })
      return { nodes: newMap, autoSaveState: { ...state.autoSaveState, isDirty: true } }
    })
  },

  appendToNodeContent: (id, text) => {
    set(state => {
      const newMap = new Map(state.nodes)
      const existing = newMap.get(id)
      if (existing) {
        newMap.set(id, { ...existing, content: (existing.content || '') + text })
      }
      return { nodes: newMap }
    })
  },

  setActiveNode: (id) => set({ activeNodeId: id }),

  addToPath: (nodeId) => {
    set(state => ({
      selectedPath: [...state.selectedPath, nodeId],
      autoSaveState: { ...state.autoSaveState, isDirty: true },
    }))
  },

  setStreaming: (partial) => {
    set(state => ({ streamingState: { ...state.streamingState, ...partial } }))
  },

  markDirty: () => {
    set(state => ({ autoSaveState: { ...state.autoSaveState, isDirty: true } }))
  },

  setAutoSaveStatus: (status) => {
    set(state => ({
      autoSaveState: { ...state.autoSaveState, saveStatus: status, isDirty: status === 'saved' ? false : state.autoSaveState.isDirty },
    }))
  },

  setLastSaveAt: (date) => {
    set(state => ({ autoSaveState: { ...state.autoSaveState, lastSaveAt: date } }))
  },

  getPathNodes: () => {
    const { nodes, selectedPath } = get()
    return selectedPath.map(id => nodes.get(id)).filter(Boolean) as PodcastNode[]
  },

  getChildNodes: (parentId: string) => {
    const { nodes } = get()
    return Array.from(nodes.values())
      .filter(n => n.parent_id === parentId)
      .sort((a, b) => a.order_index - b.order_index)
  },

  getRootNode: () => {
    const { nodes } = get()
    return Array.from(nodes.values()).find(n => n.node_type === 'root')
  },

  reset: () => set({
    podcast: null,
    nodes: new Map(),
    selectedPath: [],
    activeNodeId: null,
    streamingState: { ...initialStreamingState },
    autoSaveState: { ...initialAutoSaveState },
  }),
}))
