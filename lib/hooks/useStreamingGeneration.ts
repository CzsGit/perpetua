'use client'

import { usePodcastStore } from '@/lib/store/podcast-store'
import type { PodcastNode } from '@/lib/supabase/types'

export function useStreamingGeneration() {
  const appendToNodeContent = usePodcastStore((s) => s.appendToNodeContent)
  const setStreaming = usePodcastStore((s) => s.setStreaming)
  const updateNode = usePodcastStore((s) => s.updateNode)
  const addToPath = usePodcastStore((s) => s.addToPath)

  const generateContent = async (params: {
    podcastId: string
    nodeId: string
    rootTopic: string
    pathNodes: PodcastNode[]
    currentTopic: string
  }) => {
    setStreaming({ isStreaming: true, targetNodeId: params.nodeId, buffer: '' })
    updateNode(params.nodeId, { is_expanded: true, content: '' })
    addToPath(params.nodeId)

    try {
      const response = await fetch('/api/generate/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE format: "data: {...}\n\n"
        const lines = buffer.split('\n')
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6))
              if (data.text) {
                appendToNodeContent(params.nodeId, data.text)
              }
              if (data.error) {
                throw new Error(data.error)
              }
              // data.done signals generation is complete
            } catch (parseError) {
              // Skip malformed JSON lines (could be partial data)
              if (parseError instanceof SyntaxError) continue
              throw parseError
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.trim().slice(6))
          if (data.text) {
            appendToNodeContent(params.nodeId, data.text)
          }
          if (data.error) {
            throw new Error(data.error)
          }
        } catch {
          // Ignore final partial line
        }
      }
    } catch (error) {
      console.error('Streaming error:', error)
    } finally {
      setStreaming({ isStreaming: false, targetNodeId: null, buffer: '' })
    }
  }

  const generateEnding = async (params: {
    podcastId: string
    nodeId: string
    rootTopic: string
    pathNodes: PodcastNode[]
  }) => {
    setStreaming({ isStreaming: true, targetNodeId: params.nodeId, buffer: '' })
    updateNode(params.nodeId, { is_expanded: true, content: '' })
    addToPath(params.nodeId)

    try {
      const response = await fetch('/api/generate/ending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6))
              if (data.text) {
                appendToNodeContent(params.nodeId, data.text)
              }
              if (data.error) {
                throw new Error(data.error)
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue
              throw parseError
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.trim().slice(6))
          if (data.text) {
            appendToNodeContent(params.nodeId, data.text)
          }
          if (data.error) {
            throw new Error(data.error)
          }
        } catch {
          // Ignore final partial line
        }
      }
    } catch (error) {
      console.error('Ending generation error:', error)
    } finally {
      setStreaming({ isStreaming: false, targetNodeId: null, buffer: '' })
    }
  }

  return { generateContent, generateEnding }
}
