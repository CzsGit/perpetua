'use client'

import { useCallback, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { PodcastNode } from '@/lib/supabase/types'

const VERTICAL_GAP = 120
const HORIZONTAL_SPACING = 280

interface LayoutPosition {
  id: string
  x: number
  y: number
}

export function useAutoLayout() {
  const { setCenter, getNodes } = useReactFlow()
  const prevNodeCountRef = useRef(0)

  const calculateLayout = useCallback(
    (allNodes: PodcastNode[]): LayoutPosition[] => {
      if (allNodes.length === 0) return []

      const rootNode = allNodes.find((n) => n.node_type === 'root')
      if (!rootNode) return []

      const positions: LayoutPosition[] = []
      const childrenMap = new Map<string, PodcastNode[]>()

      // Build a children lookup map
      for (const node of allNodes) {
        if (node.parent_id) {
          const siblings = childrenMap.get(node.parent_id) || []
          siblings.push(node)
          childrenMap.set(node.parent_id, siblings)
        }
      }

      // Sort children by order_index
      for (const [key, children] of childrenMap) {
        childrenMap.set(
          key,
          children.sort((a, b) => a.order_index - b.order_index)
        )
      }

      // Lay out tree using recursive DFS
      const layoutNode = (
        node: PodcastNode,
        x: number,
        y: number,
        depth: number
      ): { width: number; height: number } => {
        positions.push({ id: node.id, x, y })

        const children = childrenMap.get(node.id) || []

        const topicChildren = children.filter(c => c.node_type === 'topic')
        const contentChildren = children.filter(c => c.node_type === 'content')
        const endingChildren = children.filter(c => c.node_type === 'ending')
        const moreChildren = children.filter(c => c.metadata && c.metadata.isMoreButton)

        let totalWidth = HORIZONTAL_SPACING
        let currentY = y + VERTICAL_GAP

        // Layout content nodes vertically below parent
        for (const contentNode of contentChildren) {
          positions.push({ id: contentNode.id, x, y: currentY })
          currentY += VERTICAL_GAP
        }

        // Layout topic children below content
        if (topicChildren.length > 0) {
          const childWidths: number[] = []
          const childHeights: number[] = []

          // First pass: get dimensions of each subtree
          for (const child of topicChildren) {
            const result = layoutNode(child, 0, currentY, depth + 1)
            childWidths.push(Math.max(result.width, HORIZONTAL_SPACING))
            childHeights.push(result.height)
          }

          const totalChildrenWidth = childWidths.reduce((a, b) => a + b, 0)
          let offsetX = x - totalChildrenWidth / 2

          // Second pass: assign final positions
          for (let i = 0; i < topicChildren.length; i++) {
            const childX = offsetX + childWidths[i] / 2
            updateSubtreePosition(
              topicChildren[i],
              childX,
              currentY,
              positions,
              childrenMap
            )
            offsetX += childWidths[i]
          }

          totalWidth = Math.max(totalChildrenWidth, HORIZONTAL_SPACING)
          currentY += Math.max(...childHeights)
        }

        // Layout ending node below topics
        for (const endingNode of endingChildren) {
          const endingPos = positions.find(p => p.id === endingNode.id)
          if (endingPos) {
            endingPos.x = x
            endingPos.y = currentY
          } else {
            positions.push({ id: endingNode.id, x, y: currentY })
          }
          currentY += VERTICAL_GAP
        }

        // Layout "more" button below ending
        for (const moreNode of moreChildren) {
          const morePos = positions.find(p => p.id === moreNode.id)
          if (morePos) {
            morePos.x = x
            morePos.y = currentY
          } else {
            positions.push({ id: moreNode.id, x, y: currentY })
          }
          currentY += VERTICAL_GAP
        }

        return { width: totalWidth, height: currentY - y }
      }

      layoutNode(rootNode, 0, 0, 0)
      return positions
    },
    []
  )

  const panToNode = useCallback(
    (nodeId: string) => {
      const flowNodes = getNodes()
      const targetNode = flowNodes.find((n) => n.id === nodeId)
      if (targetNode) {
        setCenter(
          targetNode.position.x + 140,
          targetNode.position.y + 60,
          { zoom: 0.85, duration: 400 }
        )
      }
    },
    [getNodes, setCenter]
  )

  const panToNewNodes = useCallback(
    (currentNodeCount: number, newNodeId?: string) => {
      if (currentNodeCount > prevNodeCountRef.current && newNodeId) {
        // Auto-pan to the first new node after a short delay for rendering
        setTimeout(() => panToNode(newNodeId), 100)
      }
      prevNodeCountRef.current = currentNodeCount
    },
    [panToNode]
  )

  return { calculateLayout, panToNode, panToNewNodes }
}

/**
 * Recursively update positions for a subtree rooted at the given node.
 */
function updateSubtreePosition(
  node: PodcastNode,
  newX: number,
  newY: number,
  positions: LayoutPosition[],
  childrenMap: Map<string, PodcastNode[]>
) {
  const existing = positions.find((p) => p.id === node.id)
  if (!existing) return

  const deltaX = newX - existing.x
  const deltaY = newY - existing.y
  existing.x = newX
  existing.y = newY

  // Recursively shift children
  const children = childrenMap.get(node.id) || []
  for (const child of children) {
    const childPos = positions.find((p) => p.id === child.id)
    if (childPos) {
      const shiftedX = childPos.x + deltaX
      const shiftedY = childPos.y + deltaY
      updateSubtreePosition(child, shiftedX, shiftedY, positions, childrenMap)
    }
  }
}
