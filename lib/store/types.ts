import type { Podcast, PodcastNode } from '@/lib/supabase/types'

export interface StreamingState {
  isStreaming: boolean
  targetNodeId: string | null
  buffer: string
}

export interface AutoSaveState {
  isDirty: boolean
  lastSaveAt: Date | null
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

export interface PodcastStoreState {
  // Data
  podcast: Podcast | null
  nodes: Map<string, PodcastNode>
  selectedPath: string[]
  activeNodeId: string | null

  // UI State
  streamingState: StreamingState
  autoSaveState: AutoSaveState

  // Actions
  setPodcast: (podcast: Podcast) => void
  setNodes: (nodes: PodcastNode[]) => void
  addNodes: (nodes: PodcastNode[]) => void
  updateNode: (id: string, updates: Partial<PodcastNode>) => void
  appendToNodeContent: (id: string, text: string) => void
  setActiveNode: (id: string | null) => void
  addToPath: (nodeId: string) => void
  setStreaming: (state: Partial<StreamingState>) => void
  markDirty: () => void
  setAutoSaveStatus: (status: AutoSaveState['saveStatus']) => void
  setLastSaveAt: (date: Date) => void
  getPathNodes: () => PodcastNode[]
  getChildNodes: (parentId: string) => PodcastNode[]
  getRootNode: () => PodcastNode | undefined
  removeNodes: (ids: string[]) => void
  getDescendantIds: (nodeId: string) => string[]
  reset: () => void
}
