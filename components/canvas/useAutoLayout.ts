'use client'

import { useCallback, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { PodcastNode } from '@/lib/supabase/types'

const VERTICAL_GAP = 120
const HORIZONTAL_SPACING = 280
const CONTENT_OFFSET_X = 350

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
      ): { width: number } => {
        positions.push({ id: node.id, x, y })

        const children = childrenMap.get(node.id) || []

        // Separate children into categories
        const topicChildren = children.filter(
          (c) => c.node_type === 'topic'
        )
        const contentChildren = children.filter(
          (c) => c.node_type === 'content'
        )
        const endingChildren = children.filter(
          (c) => c.node_type === 'ending'
        )
        const moreChildren = children.filter(
          (c) => c.metadata && c.metadata.isMoreButton
        )

        let totalWidth = 0
        const childY = y + VERTICAL_GAP

        // Layout content nodes to the right of the parent
        contentChildren.forEach((contentNode, idx) => {
          positions.push({
            id: contentNode.id,
            x: x + CONTENT_OFFSET_X + idx * CONTENT_OFFSET_X,
            y: y,
          })
        })

        // Layout topic children below
        if (topicChildren.length > 0) {
          const childWidths: number[] = []

          // First pass: get widths of each subtree
          for (const child of topicChildren) {
            const result = layoutNode(
              child,
              0,
              childY,
              depth + 1
            )
            childWidths.push(Math.max(result.width, HORIZONTAL_SPACING))
          }

          const totalChildrenWidth = childWidths.reduce((a, b) => a + b, 0)
          let offsetX = x - totalChildrenWidth / 2

          // Second pass: assign final positions
          for (let i = 0; i < topicChildren.length; i++) {
            const childX = offsetX + childWidths[i] / 2
            // Update the positions for this child subtree
            updateSubtreePosition(
              topicChildren[i],
              childX,
              childY,
              positions,
              childrenMap
            )
            offsetX += childWidths[i]
          }

          totalWidth = Math.max(totalChildrenWidth, HORIZONTAL_SPACING)
        } else {
          totalWidth = HORIZONTAL_SPACING
        }

        // Layout ending node at the bottom of topic children
        const lastTopicY =
          topicChildren.length > 0 ? childY : y
        endingChildren.forEach((endingNode) => {
          const endingPos = positions.find((p) => p.id === endingNode.id)
          if (endingPos) {
            endingPos.x = x
            endingPos.y = lastTopicY + VERTICAL_GAP
          } else {
            positions.push({
              id: endingNode.id,
              x: x,
              y: lastTopicY + VERTICAL_GAP,
            })
          }
        })

        // Layout "more" button below the last topic child
        moreChildren.forEach((moreNode) => {
          const moreY =
            endingChildren.length > 0
              ? lastTopicY + VERTICAL_GAP * 2
              : lastTopicY + VERTICAL_GAP
          const morePos = positions.find((p) => p.id === moreNode.id)
          if (morePos) {
            morePos.x = x
            morePos.y = moreY
          } else {
            positions.push({
              id: moreNode.id,
              x: x,
              y: moreY,
            })
          }
        })

        return { width: totalWidth }
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
