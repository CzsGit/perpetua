'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { usePodcastStore } from '@/lib/store/podcast-store'
import { useAutoLayout } from './useAutoLayout'
import { nodeTypes } from './nodeTypes'
import type { PodcastNode } from '@/lib/supabase/types'

interface InfiniteCanvasProps {
  onExpandTopics: (parentNodeId: string) => void
  onGenerateContent: (nodeId: string) => void
  onGenerateEnding: (nodeId: string) => void
  onLoadMore: (parentNodeId: string) => void
  onToggleExpand: (nodeId: string) => void
  isLoadingMore: boolean
}

function CanvasInner({
  onExpandTopics,
  onGenerateContent,
  onGenerateEnding,
  onLoadMore,
  onToggleExpand,
  isLoadingMore,
}: InfiniteCanvasProps) {
  const nodes = usePodcastStore((s) => s.nodes)
  const streamingState = usePodcastStore((s) => s.streamingState)
  const setActiveNode = usePodcastStore((s) => s.setActiveNode)
  const { calculateLayout, panToNewNodes } = useAutoLayout()
  const { fitView } = useReactFlow()
  const prevNodeCountRef = useRef(0)

  const allNodes = useMemo(() => Array.from(nodes.values()), [nodes])

  const layoutPositions = useMemo(
    () => calculateLayout(allNodes),
    [allNodes, calculateLayout]
  )

  // Build React Flow nodes from store data + layout
  const flowNodes: Node[] = useMemo(() => {
    return allNodes.map((node) => {
      const pos = layoutPositions.find((p) => p.id === node.id)
      const x = pos ? pos.x : node.position_x
      const y = pos ? pos.y : node.position_y

      const isStreaming =
        streamingState.isStreaming && streamingState.targetNodeId === node.id

      return {
        id: node.id,
        type: getFlowNodeType(node),
        position: { x, y },
        data: buildNodeData(node, isStreaming, {
          onExpandTopics,
          onGenerateContent,
          onGenerateEnding,
          onLoadMore,
          onToggleExpand,
          isLoadingMore,
        }),
      }
    })
  }, [
    allNodes,
    layoutPositions,
    streamingState,
    onExpandTopics,
    onGenerateContent,
    onGenerateEnding,
    onLoadMore,
    onToggleExpand,
    isLoadingMore,
  ])

  // Build edges from parent-child relationships
  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []
    for (const node of allNodes) {
      if (node.parent_id) {
        edges.push({
          id: `${node.parent_id}-${node.id}`,
          source: node.parent_id,
          target: node.id,
          type: 'default',
          style: { stroke: '#6b7280', strokeWidth: 2 },
          animated: isStreaming(node, streamingState),
        })
      }
    }
    return edges
  }, [allNodes, streamingState])

  // Auto-pan when new nodes are added
  useEffect(() => {
    const currentCount = allNodes.length
    if (currentCount > prevNodeCountRef.current && currentCount > 0) {
      const lastNode = allNodes[allNodes.length - 1]
      panToNewNodes(currentCount, lastNode?.id)
    }
    prevNodeCountRef.current = currentCount
  }, [allNodes, panToNewNodes])

  // Initial fit view
  useEffect(() => {
    if (allNodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 200)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setActiveNode(node.id)
    },
    [setActiveNode]
  )

  return (
    <div className="h-full w-full bg-gray-950">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          style: { stroke: '#6b7280', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={24} size={1} />
        <Controls
          className="!border-gray-700 !bg-gray-800 [&>button]:!border-gray-700 [&>button]:!bg-gray-800 [&>button]:!fill-gray-300 [&>button:hover]:!bg-gray-700"
        />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'root':
                return '#6366f1'
              case 'topic':
                return '#14b8a6'
              case 'content':
                return '#f59e0b'
              case 'ending':
                return '#ef4444'
              case 'more':
                return '#6b7280'
              default:
                return '#6b7280'
            }
          }}
          className="!border-gray-700 !bg-gray-900"
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>
    </div>
  )
}

export default function InfiniteCanvas(props: InfiniteCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}

// Helper functions

function getFlowNodeType(node: PodcastNode): string {
  if (node.metadata?.isMoreButton) return 'more'
  return node.node_type
}

function isStreaming(
  node: PodcastNode,
  streamingState: { isStreaming: boolean; targetNodeId: string | null }
): boolean {
  return streamingState.isStreaming && streamingState.targetNodeId === node.id
}

function buildNodeData(
  node: PodcastNode,
  nodeIsStreaming: boolean,
  handlers: {
    onExpandTopics: (parentNodeId: string) => void
    onGenerateContent: (nodeId: string) => void
    onGenerateEnding: (nodeId: string) => void
    onLoadMore: (parentNodeId: string) => void
    onToggleExpand: (nodeId: string) => void
    isLoadingMore: boolean
  }
): Record<string, unknown> {
  const {
    onExpandTopics,
    onGenerateContent,
    onGenerateEnding,
    onLoadMore,
    onToggleExpand,
    isLoadingMore,
  } = handlers

  switch (node.node_type) {
    case 'root':
      return {
        title: node.title,
        onExpandTopics: () => onExpandTopics(node.id),
        onGenerateContent: () => onGenerateContent(node.id),
      }
    case 'topic':
      return {
        title: node.title,
        summary: node.content,
        onExpandTopics: () => onExpandTopics(node.id),
        onGenerateContent: () => onGenerateContent(node.id),
      }
    case 'content':
      return {
        title: node.title,
        content: node.content,
        isExpanded: node.is_expanded,
        isStreaming: nodeIsStreaming,
        onToggleExpand: () => onToggleExpand(node.id),
        onExpandTopics: () => onExpandTopics(node.id),
      }
    case 'ending':
      return {
        title: node.title,
        content: node.content,
        isExpanded: node.is_expanded,
        isStreaming: nodeIsStreaming,
        onGenerateEnding: () => onGenerateEnding(node.id),
        onToggleExpand: () => onToggleExpand(node.id),
      }
    default:
      break
  }

  // "more" button (pseudo-node via metadata)
  if (node.metadata?.isMoreButton) {
    return {
      onLoadMore: () => onLoadMore(node.parent_id || ''),
      isLoading: isLoadingMore,
    }
  }

  return { title: node.title }
}
