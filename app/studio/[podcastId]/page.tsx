'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { usePodcastStore } from '@/lib/store/podcast-store'
import { useStreamingGeneration } from '@/lib/hooks/useStreamingGeneration'
import { useTopicGeneration } from '@/lib/hooks/useTopicGeneration'
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import { useExportMarkdown } from '@/lib/hooks/useExportMarkdown'
import InfiniteCanvas from '@/components/canvas/InfiniteCanvas'
import TopBar from '@/components/studio/TopBar'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorMessage from '@/components/ui/ErrorMessage'
import type { PodcastNode } from '@/lib/supabase/types'

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const podcastId = params.podcastId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setPodcast = usePodcastStore((s) => s.setPodcast)
  const setNodes = usePodcastStore((s) => s.setNodes)
  const addNodes = usePodcastStore((s) => s.addNodes)
  const updateNode = usePodcastStore((s) => s.updateNode)
  const getPathNodes = usePodcastStore((s) => s.getPathNodes)
  const getChildNodes = usePodcastStore((s) => s.getChildNodes)
  const getRootNode = usePodcastStore((s) => s.getRootNode)
  const podcast = usePodcastStore((s) => s.podcast)
  const nodes = usePodcastStore((s) => s.nodes)
  const reset = usePodcastStore((s) => s.reset)
  const removeNodes = usePodcastStore((s) => s.removeNodes)
  const getDescendantIds = usePodcastStore((s) => s.getDescendantIds)

  const { generateContent, generateEnding } = useStreamingGeneration()
  const { generateTopics, loadMoreTopics, isLoading: isLoadingTopics } = useTopicGeneration()

  // Auto-save via dedicated hook
  useAutoSave(podcastId)

  // Export via dedicated hook
  const { exportMarkdown, isExporting } = useExportMarkdown()

  const pruneSiblings = useCallback(
    async (committedNodeId: string) => {
      const node = nodes.get(committedNodeId)
      if (!node || !node.parent_id) return // root has no siblings

      const siblings = getChildNodes(node.parent_id)
      const idsToRemove: string[] = []

      for (const sibling of siblings) {
        if (sibling.id === committedNodeId) continue
        idsToRemove.push(sibling.id)
        idsToRemove.push(...getDescendantIds(sibling.id))
      }

      if (idsToRemove.length === 0) return

      // Optimistic: remove from store immediately
      removeNodes(idsToRemove)

      // Persist: delete from database
      if (podcast) {
        fetch(`/api/podcast/${podcast.id}/nodes`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeIds: idsToRemove }),
        }).catch(err => console.error('Failed to delete pruned nodes:', err))
      }
    },
    [nodes, podcast, getChildNodes, getDescendantIds, removeNodes]
  )

  // Load podcast data on mount
  useEffect(() => {
    async function loadPodcast() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/podcast/${podcastId}`)
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/auth/login')
            return
          }
          if (res.status === 404) {
            setError('播客不存在')
            return
          }
          throw new Error('Failed to load podcast')
        }
        const data = await res.json()
        setPodcast(data.podcast)
        setNodes(data.nodes || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }

    loadPodcast()

    return () => {
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcastId])

  // Handler: expand topics from a parent node
  const handleExpandTopics = useCallback(
    async (parentNodeId: string) => {
      if (!podcast) return
      await pruneSiblings(parentNodeId)
      const root = getRootNode()
      const pathNodes = getPathNodes()

      await generateTopics({
        podcastId: podcast.id,
        parentNodeId,
        rootTopic: podcast.root_topic,
        pathNodes,
      })

      // Add ending node after topic generation
      const children = getChildNodes(parentNodeId)
      const hasEnding = children.some((c) => c.node_type === 'ending')
      if (!hasEnding) {
        const endingNode: PodcastNode = {
          id: uuidv4(),
          podcast_id: podcast.id,
          parent_id: parentNodeId,
          node_type: 'ending',
          title: '结束语',
          content: null,
          position_x: 0,
          position_y: 0,
          is_expanded: false,
          is_selected: false,
          order_index: 999,
          created_at: new Date().toISOString(),
          metadata: {},
        }
        addNodes([endingNode])
      }
    },
    [podcast, getRootNode, getPathNodes, generateTopics, getChildNodes, addNodes, pruneSiblings]
  )

  // Handler: generate content for a node
  const handleGenerateContent = useCallback(
    async (nodeId: string) => {
      if (!podcast) return
      await pruneSiblings(nodeId)
      const root = getRootNode()
      const pathNodes = getPathNodes()
      const sourceNode = nodes.get(nodeId)
      if (!sourceNode) return

      // Create a content node as child of this node
      const contentNodeId = uuidv4()
      const contentNode: PodcastNode = {
        id: contentNodeId,
        podcast_id: podcast.id,
        parent_id: nodeId,
        node_type: 'content',
        title: sourceNode.title,
        content: '',
        position_x: 0,
        position_y: 0,
        is_expanded: true,
        is_selected: false,
        order_index: 0,
        created_at: new Date().toISOString(),
        metadata: {},
      }
      addNodes([contentNode])

      await generateContent({
        podcastId: podcast.id,
        nodeId: contentNodeId,
        rootTopic: podcast.root_topic,
        pathNodes,
        currentTopic: sourceNode.title,
      })
    },
    [podcast, getRootNode, getPathNodes, nodes, addNodes, generateContent, pruneSiblings]
  )

  // Handler: generate ending
  const handleGenerateEnding = useCallback(
    async (nodeId: string) => {
      if (!podcast) return
      const pathNodes = getPathNodes()

      await generateEnding({
        podcastId: podcast.id,
        nodeId,
        rootTopic: podcast.root_topic,
        pathNodes,
      })
    },
    [podcast, getPathNodes, generateEnding]
  )

  // Handler: load more topics
  const handleLoadMore = useCallback(
    async (parentNodeId: string) => {
      if (!podcast) return
      const pathNodes = getPathNodes()
      const children = getChildNodes(parentNodeId)
      const existingTitles = children
        .filter((c) => c.node_type === 'topic')
        .map((c) => c.title)

      await loadMoreTopics({
        podcastId: podcast.id,
        parentNodeId,
        rootTopic: podcast.root_topic,
        pathNodes,
        existingTitles,
      })
    },
    [podcast, getPathNodes, getChildNodes, loadMoreTopics]
  )

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <LoadingSpinner size="md" text="加载播客数据..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <ErrorMessage
          message={error}
          onRetry={() => router.push('/dashboard')}
          retryLabel="返回仪表盘"
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      <TopBar
        onExportMarkdown={exportMarkdown}
        isExporting={isExporting}
      />
      <div className="flex-1 overflow-hidden">
        <InfiniteCanvas
          onExpandTopics={handleExpandTopics}
          onGenerateContent={handleGenerateContent}
          onGenerateEnding={handleGenerateEnding}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingTopics}
        />
      </div>
    </div>
  )
}
