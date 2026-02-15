'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { usePodcastStore } from '@/lib/store/podcast-store'
import { useStreamingGeneration } from '@/lib/hooks/useStreamingGeneration'
import { useTopicGeneration } from '@/lib/hooks/useTopicGeneration'
import InfiniteCanvas from '@/components/canvas/InfiniteCanvas'
import TopBar from '@/components/studio/TopBar'
import type { PodcastNode } from '@/lib/supabase/types'

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const podcastId = params.podcastId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const setPodcast = usePodcastStore((s) => s.setPodcast)
  const setNodes = usePodcastStore((s) => s.setNodes)
  const addNodes = usePodcastStore((s) => s.addNodes)
  const updateNode = usePodcastStore((s) => s.updateNode)
  const getPathNodes = usePodcastStore((s) => s.getPathNodes)
  const getChildNodes = usePodcastStore((s) => s.getChildNodes)
  const getRootNode = usePodcastStore((s) => s.getRootNode)
  const podcast = usePodcastStore((s) => s.podcast)
  const nodes = usePodcastStore((s) => s.nodes)
  const selectedPath = usePodcastStore((s) => s.selectedPath)
  const autoSaveState = usePodcastStore((s) => s.autoSaveState)
  const setAutoSaveStatus = usePodcastStore((s) => s.setAutoSaveStatus)
  const setLastSaveAt = usePodcastStore((s) => s.setLastSaveAt)
  const reset = usePodcastStore((s) => s.reset)

  const { generateContent, generateEnding } = useStreamingGeneration()
  const { generateTopics, loadMoreTopics, isLoading: isLoadingTopics } = useTopicGeneration()

  // Auto-save timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Auto-save when dirty
  useEffect(() => {
    if (autoSaveState.isDirty) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          setAutoSaveStatus('saving')
          const allNodes = Array.from(nodes.values())
          const res = await fetch(`/api/podcast/${podcastId}/autosave`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodes: allNodes,
              canvasState: {},
            }),
          })
          if (res.ok) {
            setAutoSaveStatus('saved')
            setLastSaveAt(new Date())
          } else {
            setAutoSaveStatus('error')
          }
        } catch {
          setAutoSaveStatus('error')
        }
      }, 3000)
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveState.isDirty, nodes])

  // Handler: expand topics from a parent node
  const handleExpandTopics = useCallback(
    async (parentNodeId: string) => {
      if (!podcast) return
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
    [podcast, getRootNode, getPathNodes, generateTopics, getChildNodes, addNodes]
  )

  // Handler: generate content for a node
  const handleGenerateContent = useCallback(
    async (nodeId: string) => {
      if (!podcast) return
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
    [podcast, getRootNode, getPathNodes, nodes, addNodes, generateContent]
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

  // Handler: toggle expand on a node
  const handleToggleExpand = useCallback(
    (nodeId: string) => {
      const node = nodes.get(nodeId)
      if (node) {
        updateNode(nodeId, { is_expanded: !node.is_expanded })
      }
    },
    [nodes, updateNode]
  )

  // Handler: export to Markdown
  const handleExportMarkdown = useCallback(async () => {
    if (!podcast) return
    setIsExporting(true)
    try {
      const pathNodeIds = selectedPath.length > 0
        ? selectedPath
        : Array.from(nodes.values()).map((n) => n.id)

      const res = await fetch('/api/export/markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastId: podcast.id,
          pathNodeIds,
        }),
      })

      if (!res.ok) throw new Error('Export failed')

      const data = await res.json()
      // Download as file
      const blob = new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${podcast.title}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }, [podcast, selectedPath, nodes])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
          <span>加载播客数据...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-950">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
        >
          返回仪表盘
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      <TopBar
        onExportMarkdown={handleExportMarkdown}
        isExporting={isExporting}
      />
      <div className="flex-1 overflow-hidden">
        <InfiniteCanvas
          onExpandTopics={handleExpandTopics}
          onGenerateContent={handleGenerateContent}
          onGenerateEnding={handleGenerateEnding}
          onLoadMore={handleLoadMore}
          onToggleExpand={handleToggleExpand}
          isLoadingMore={isLoadingTopics}
        />
      </div>
    </div>
  )
}
