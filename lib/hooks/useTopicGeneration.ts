'use client'

import { useState } from 'react'
import { usePodcastStore } from '@/lib/store/podcast-store'
import type { PodcastNode } from '@/lib/supabase/types'

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
  }) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/generate/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()
      if (data.topics) {
        addNodes(data.topics)
        markDirty()
      }
      return data.topics as PodcastNode[] | undefined
    } catch (error) {
      console.error('Topic generation error:', error)
      return undefined
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
  }) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/generate/more-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, count: params.count || 5 }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data = await response.json()
      if (data.topics) {
        addNodes(data.topics)
        markDirty()
      }
      return data.topics as PodcastNode[] | undefined
    } catch (error) {
      console.error('Load more topics error:', error)
      return undefined
    } finally {
      setIsLoading(false)
    }
  }

  return { generateTopics, loadMoreTopics, isLoading }
}
