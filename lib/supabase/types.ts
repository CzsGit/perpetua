export type NodeType = 'root' | 'topic' | 'content' | 'ending'
export type PodcastStatus = 'draft' | 'completed'

export type Podcast = {
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

export type PodcastNode = {
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

export type GenerationHistory = {
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

export type SavedPodcast = {
  id: string
  podcast_id: string
  user_id: string
  markdown_content: string
  path_node_ids: string[]
  word_count: number | null
  estimated_duration_minutes: number | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      podcasts: {
        Row: Podcast
        Insert: {
          id?: string
          user_id: string
          title: string
          root_topic: string
          status?: PodcastStatus
          canvas_state?: Record<string, unknown>
          created_at?: string
          updated_at?: string
          last_autosave_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          root_topic?: string
          status?: PodcastStatus
          canvas_state?: Record<string, unknown>
          created_at?: string
          updated_at?: string
          last_autosave_at?: string | null
        }
        Relationships: []
      }
      nodes: {
        Row: PodcastNode
        Insert: {
          id?: string
          podcast_id: string
          parent_id?: string | null
          node_type: NodeType
          title: string
          content?: string | null
          position_x?: number
          position_y?: number
          is_expanded?: boolean
          is_selected?: boolean
          order_index?: number
          created_at?: string
          metadata?: Record<string, unknown>
        }
        Update: {
          id?: string
          podcast_id?: string
          parent_id?: string | null
          node_type?: NodeType
          title?: string
          content?: string | null
          position_x?: number
          position_y?: number
          is_expanded?: boolean
          is_selected?: boolean
          order_index?: number
          created_at?: string
          metadata?: Record<string, unknown>
        }
        Relationships: []
      }
      generation_history: {
        Row: GenerationHistory
        Insert: {
          id?: string
          podcast_id: string
          node_id: string
          prompt: string
          response: string
          model: string
          tokens_used?: number | null
          generation_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          podcast_id?: string
          node_id?: string
          prompt?: string
          response?: string
          model?: string
          tokens_used?: number | null
          generation_time_ms?: number | null
          created_at?: string
        }
        Relationships: []
      }
      saved_podcasts: {
        Row: SavedPodcast
        Insert: {
          id?: string
          podcast_id: string
          user_id: string
          markdown_content: string
          path_node_ids: string[]
          word_count?: number | null
          estimated_duration_minutes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          podcast_id?: string
          user_id?: string
          markdown_content?: string
          path_node_ids?: string[]
          word_count?: number | null
          estimated_duration_minutes?: number | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}
