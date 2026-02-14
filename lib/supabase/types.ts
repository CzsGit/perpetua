export type NodeType = 'root' | 'topic' | 'content' | 'ending'
export type PodcastStatus = 'draft' | 'completed'

export interface Podcast {
  id: string
  user_id: string
  title: string
  root_topic: string
  status: PodcastStatus
  canvas_state: Record<string, unknown>
  created_at: string
  updated_at: string
  last_autosave_at: string | null
}

export interface PodcastNode {
  id: string
  podcast_id: string
  parent_id: string | null
  node_type: NodeType
  title: string
  content: string | null
  position_x: number
  position_y: number
  is_expanded: boolean
  is_selected: boolean
  order_index: number
  created_at: string
  metadata: Record<string, unknown>
}

export interface GenerationHistory {
  id: string
  podcast_id: string
  node_id: string
  prompt: string
  response: string
  model: string
  tokens_used: number | null
  generation_time_ms: number | null
  created_at: string
}

export interface SavedPodcast {
  id: string
  podcast_id: string
  user_id: string
  markdown_content: string
  path_node_ids: string[]
  word_count: number | null
  estimated_duration_minutes: number | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      podcasts: { Row: Podcast; Insert: Omit<Podcast, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Podcast> }
      nodes: { Row: PodcastNode; Insert: Omit<PodcastNode, 'id' | 'created_at'>; Update: Partial<PodcastNode> }
      generation_history: { Row: GenerationHistory; Insert: Omit<GenerationHistory, 'id' | 'created_at'>; Update: Partial<GenerationHistory> }
      saved_podcasts: { Row: SavedPodcast; Insert: Omit<SavedPodcast, 'id' | 'created_at'>; Update: Partial<SavedPodcast> }
    }
  }
}
