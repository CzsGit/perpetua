'use client'

import { useState } from 'react'
import { usePodcastStore } from '@/lib/store/podcast-store'
import type { PodcastNode } from '@/lib/supabase/types'

export type GenerationResult =
  | { ok: true; topics: PodcastNode[] }
  | { ok: false; error: string }

export function useTopicGeneration() {
  const addNodes = usePodcastStore((s) => s.addNodes)
  const markDirty = usePodcastStore((s) => s.markDirty)
  const [isLoading, setIsLoading] = useState(false)

  const generateTopics = async (params: {
    podcastId: string
    parentNodeId: string
    rootTopic: string
    pathNodes: PodcastNode[]
    count?: number
  }): Promise<GenerationResult> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/generate/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message = body.error || `HTTP error: ${response.status}`
        console.error('Topic generation HTTP error:', response.status, message)
        return { ok: false, error: message }
      }

      const data = await response.json()
      if (data.topics && data.topics.length > 0) {
        addNodes(data.topics)
        markDirty()
        return { ok: true, topics: data.topics }
      }

      return { ok: false, error: '未生成任何话题' }
    } catch (error) {
      console.error('Topic generation error:', error)
      const message = error instanceof Error ? error.message : '话题生成失败'
      return { ok: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreTopics = async (params: {
    podcastId: string
    parentNodeId: string
    rootTopic: string
    pathNodes: PodcastNode[]
    existingTitles: string[]
    count?: number
  }): Promise<GenerationResult> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/generate/more-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, count: params.count || 5 }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const message = body.error || `HTTP error: ${response.status}`
        console.error('Load more topics HTTP error:', response.status, message)
        return { ok: false, error: message }
      }

      const data = await response.json()
      if (data.topics && data.topics.length > 0) {
        addNodes(data.topics)
        markDirty()
        return { ok: true, topics: data.topics }
      }

      return { ok: false, error: '未加载到更多话题' }
    } catch (error) {
      console.error('Load more topics error:', error)
      const message = error instanceof Error ? error.message : '加载更多话题失败'
      return { ok: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  return { generateTopics, loadMoreTopics, isLoading }
}
