# Single Main Line Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement path pruning, vertical layout, and content modal so the podcast canvas shows a clean single main line.

**Architecture:** When a user commits to a topic (clicks "expand subtopics" or "generate content"), all sibling nodes and their descendants are deleted from store and DB. Layout algorithm places all nodes vertically. Content/ending nodes are small thumbnails; clicking opens a modal overlay for reading.

**Tech Stack:** Next.js 16, React 19, Zustand, @xyflow/react, Supabase, Tailwind CSS 4, Vitest

---

### Task 1: Store — Add `getDescendantIds` and `removeNodes`

**Files:**
- Modify: `lib/store/types.ts:15-42`
- Modify: `lib/store/podcast-store.ts:8-104`
- Modify: `lib/store/__tests__/podcast-store.test.ts`

**Step 1: Write failing tests for `getDescendantIds` and `removeNodes`**

Add to `lib/store/__tests__/podcast-store.test.ts`:

```typescript
it('getDescendantIds collects all descendants via BFS', () => {
  const nodes = [
    makeNode({ id: 'root', node_type: 'root', parent_id: null }),
    makeNode({ id: 'a', parent_id: 'root' }),
    makeNode({ id: 'b', parent_id: 'root' }),
    makeNode({ id: 'a1', parent_id: 'a' }),
    makeNode({ id: 'a2', parent_id: 'a' }),
    makeNode({ id: 'a1x', parent_id: 'a1' }),
  ]
  usePodcastStore.getState().setNodes(nodes)
  const descendants = usePodcastStore.getState().getDescendantIds('a')
  expect(descendants.sort()).toEqual(['a1', 'a1x', 'a2'].sort())
})

it('getDescendantIds returns empty array for leaf node', () => {
  const nodes = [
    makeNode({ id: 'root', node_type: 'root', parent_id: null }),
    makeNode({ id: 'leaf', parent_id: 'root' }),
  ]
  usePodcastStore.getState().setNodes(nodes)
  expect(usePodcastStore.getState().getDescendantIds('leaf')).toEqual([])
})

it('removeNodes deletes nodes and cleans selectedPath', () => {
  const nodes = [
    makeNode({ id: 'root', node_type: 'root', parent_id: null }),
    makeNode({ id: 'a', parent_id: 'root' }),
    makeNode({ id: 'b', parent_id: 'root' }),
    makeNode({ id: 'c', parent_id: 'root' }),
  ]
  usePodcastStore.getState().setNodes(nodes)
  usePodcastStore.getState().addToPath('a')
  usePodcastStore.getState().addToPath('b')

  usePodcastStore.getState().removeNodes(['b', 'c'])

  expect(usePodcastStore.getState().nodes.size).toBe(2) // root + a
  expect(usePodcastStore.getState().nodes.has('b')).toBe(false)
  expect(usePodcastStore.getState().nodes.has('c')).toBe(false)
  expect(usePodcastStore.getState().selectedPath).toEqual(['a'])
  expect(usePodcastStore.getState().autoSaveState.isDirty).toBe(true)
})
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- lib/store/__tests__/podcast-store.test.ts`
Expected: FAIL — `getDescendantIds` and `removeNodes` not defined

**Step 3: Add types**

In `lib/store/types.ts`, add to `PodcastStoreState` interface after `getRootNode`:

```typescript
removeNodes: (ids: string[]) => void
getDescendantIds: (nodeId: string) => string[]
```

**Step 4: Implement in store**

In `lib/store/podcast-store.ts`, add before `reset`:

```typescript
removeNodes: (ids: string[]) => {
  set(state => {
    const newMap = new Map(state.nodes)
    for (const id of ids) {
      newMap.delete(id)
    }
    const removedSet = new Set(ids)
    const newPath = state.selectedPath.filter(id => !removedSet.has(id))
    return {
      nodes: newMap,
      selectedPath: newPath,
      autoSaveState: { ...state.autoSaveState, isDirty: true },
    }
  })
},

getDescendantIds: (nodeId: string) => {
  const { nodes } = get()
  const descendants: string[] = []
  const queue = [nodeId]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    for (const node of nodes.values()) {
      if (node.parent_id === currentId) {
        descendants.push(node.id)
        queue.push(node.id)
      }
    }
  }
  return descendants
},
```

**Step 5: Run tests to verify they pass**

Run: `npm run test:run -- lib/store/__tests__/podcast-store.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add lib/store/types.ts lib/store/podcast-store.ts lib/store/__tests__/podcast-store.test.ts
git commit -m "feat: add removeNodes and getDescendantIds to podcast store"
```

---

### Task 2: API — Batch Delete Nodes Endpoint

**Files:**
- Create: `app/api/podcast/[id]/nodes/route.ts`

**Step 1: Create the DELETE endpoint**

Create `app/api/podcast/[id]/nodes/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify podcast ownership
    const { data: podcast } = await supabase
      .from('podcasts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!podcast) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { nodeIds } = await request.json()
    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return NextResponse.json({ error: 'nodeIds required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('nodes')
      .delete()
      .in('id', nodeIds)
      .eq('podcast_id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete nodes' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/podcast/[id]/nodes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add app/api/podcast/\[id\]/nodes/route.ts
git commit -m "feat: add batch delete nodes API endpoint"
```

---

### Task 3: WorkspacePage — Add `pruneSiblings` and Wire into Handlers

**Files:**
- Modify: `app/studio/[podcastId]/page.tsx:17-157`

**Step 1: Add store references and `pruneSiblings`**

In `app/studio/[podcastId]/page.tsx`, add new store references after line 34:

```typescript
const removeNodes = usePodcastStore((s) => s.removeNodes)
const getDescendantIds = usePodcastStore((s) => s.getDescendantIds)
```

Add `pruneSiblings` callback after `useExportMarkdown` (after line 43):

```typescript
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
```

**Step 2: Wire into `handleExpandTopics`**

Add `await pruneSiblings(parentNodeId)` as the first line inside `handleExpandTopics` (after `if (!podcast) return`):

```typescript
const handleExpandTopics = useCallback(
  async (parentNodeId: string) => {
    if (!podcast) return
    await pruneSiblings(parentNodeId)
    // ... rest unchanged
  },
  [podcast, pruneSiblings, getRootNode, getPathNodes, generateTopics, getChildNodes, addNodes]
)
```

**Step 3: Wire into `handleGenerateContent`**

Add `await pruneSiblings(nodeId)` as the first line inside `handleGenerateContent` (after `if (!podcast) return`):

```typescript
const handleGenerateContent = useCallback(
  async (nodeId: string) => {
    if (!podcast) return
    await pruneSiblings(nodeId)
    // ... rest unchanged
  },
  [podcast, pruneSiblings, getRootNode, getPathNodes, nodes, addNodes, generateContent]
)
```

**Step 4: Verify build**

Run: `npm run build`
Expected: No compilation errors

**Step 5: Commit**

```bash
git add app/studio/\[podcastId\]/page.tsx
git commit -m "feat: add pruneSiblings to prune unused sibling nodes"
```

---

### Task 4: Layout — Vertical Content Positioning

**Files:**
- Modify: `components/canvas/useAutoLayout.ts:7-158`

**Step 1: Modify the layout algorithm**

In `components/canvas/useAutoLayout.ts`:

1. Remove `const CONTENT_OFFSET_X = 350` (line 9)

2. Replace the content children layout block (lines 76-83) and integrate content into the vertical flow. The new algorithm treats content nodes like topic children — they go below the parent, not to the right:

Replace the entire `layoutNode` function body (inside `calculateLayout`) with logic that:
- Combines topic + content children into a single `verticalChildren` array (sorted by order_index)
- If there are multiple topic children (pre-prune selection state), spread them horizontally as before
- If there's only one vertical child (post-prune), place it directly below
- Content children always go vertically below, never to the right

```typescript
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
```

Note: The return type changes from `{ width: number }` to `{ width: number; height: number }` to properly track subtree height for positioning.

**Step 2: Verify build**

Run: `npm run build`
Expected: No compilation errors

**Step 3: Run existing tests**

Run: `npm run test:run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add components/canvas/useAutoLayout.ts
git commit -m "feat: vertical linear layout for content nodes"
```

---

### Task 5: ContentNode — Thumbnail Redesign

**Files:**
- Modify: `components/canvas/ContentNode.tsx`

**Step 1: Replace ContentNode with thumbnail version**

Replace entire `components/canvas/ContentNode.tsx`:

```typescript
'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

type ContentNodeData = {
  title: string
  content: string | null
  isStreaming: boolean
}

function ContentNode({ data }: NodeProps) {
  const { title, content, isStreaming } = data as unknown as ContentNodeData

  const preview = content
    ? content.slice(0, 20) + (content.length > 20 ? '...' : '')
    : null

  return (
    <div className="w-[240px] cursor-pointer rounded-xl border-2 border-amber-400 bg-amber-600 px-4 py-3 shadow-lg shadow-amber-500/20 transition-all duration-200 hover:border-amber-300 hover:shadow-amber-500/30">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-amber-300 !bg-amber-100"
      />
      <h3 className="text-sm font-bold leading-snug text-white">{title}</h3>
      {isStreaming ? (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-100">
          <span className="inline-block h-3 w-1.5 animate-pulse bg-white" />
          <span>生成中...</span>
        </div>
      ) : preview ? (
        <p className="mt-1 text-xs text-amber-100/80">{preview}</p>
      ) : (
        <p className="mt-1 text-xs text-amber-200/60">暂无内容</p>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-amber-300 !bg-amber-100"
      />
    </div>
  )
}

export default ContentNode
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add components/canvas/ContentNode.tsx
git commit -m "feat: redesign ContentNode as fixed-size thumbnail"
```

---

### Task 6: EndingNode — Thumbnail Redesign

**Files:**
- Modify: `components/canvas/EndingNode.tsx`

**Step 1: Replace EndingNode with thumbnail version**

Replace entire `components/canvas/EndingNode.tsx`:

```typescript
'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

type EndingNodeData = {
  title: string
  content: string | null
  isStreaming: boolean
  onGenerateEnding: () => void
}

function EndingNode({ data }: NodeProps) {
  const { title, content, isStreaming, onGenerateEnding } =
    data as unknown as EndingNodeData

  const hasContent = !!content
  const preview = content
    ? content.slice(0, 20) + (content.length > 20 ? '...' : '')
    : null

  return (
    <div className="w-[240px] rounded-xl border-2 border-dashed border-red-400 bg-red-700 px-4 py-3 shadow-lg shadow-red-500/20">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-red-300 !bg-red-100"
      />
      <span className="mb-0.5 block text-xs font-medium uppercase tracking-wider text-red-200">
        结束语
      </span>
      <h3 className="text-sm font-bold leading-snug text-white">
        {title || '结束语'}
      </h3>

      {!hasContent && !isStreaming && (
        <button
          onClick={onGenerateEnding}
          className="mt-2 w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500"
        >
          生成结束语
        </button>
      )}

      {isStreaming && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-red-100">
          <span className="inline-block h-3 w-1.5 animate-pulse bg-white" />
          <span>生成中...</span>
        </div>
      )}

      {hasContent && !isStreaming && preview && (
        <p className="mt-1 cursor-pointer text-xs text-red-100/80">{preview}</p>
      )}
    </div>
  )
}

export default EndingNode
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add components/canvas/EndingNode.tsx
git commit -m "feat: redesign EndingNode as fixed-size thumbnail"
```

---

### Task 7: ContentModal — New Component

**Files:**
- Create: `components/canvas/ContentModal.tsx`

**Step 1: Create the modal component**

Create `components/canvas/ContentModal.tsx`:

```typescript
'use client'

import { useCallback } from 'react'
import { usePodcastStore } from '@/lib/store/podcast-store'

interface ContentModalProps {
  onExpandTopics: (parentNodeId: string) => void
  onGenerateEnding: (nodeId: string) => void
}

export default function ContentModal({
  onExpandTopics,
  onGenerateEnding,
}: ContentModalProps) {
  const activeNodeId = usePodcastStore((s) => s.activeNodeId)
  const nodes = usePodcastStore((s) => s.nodes)
  const setActiveNode = usePodcastStore((s) => s.setActiveNode)

  const node = activeNodeId ? nodes.get(activeNodeId) : null

  const handleClose = useCallback(() => {
    setActiveNode(null)
  }, [setActiveNode])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose()
      }
    },
    [handleClose]
  )

  const handleExpandTopics = useCallback(() => {
    if (!activeNodeId) return
    handleClose()
    onExpandTopics(activeNodeId)
  }, [activeNodeId, handleClose, onExpandTopics])

  const handleGenerateEnding = useCallback(() => {
    if (!activeNodeId) return
    handleClose()
    onGenerateEnding(activeNodeId)
  }, [activeNodeId, handleClose, onGenerateEnding])

  // Only show modal for content/ending nodes that have been clicked
  if (!node || (node.node_type !== 'content' && node.node_type !== 'ending')) {
    return null
  }

  const isContent = node.node_type === 'content'
  const isEnding = node.node_type === 'ending'
  const hasContent = !!node.content

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="mx-4 flex max-h-[80vh] w-full max-w-[640px] flex-col rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-gray-700 px-6 py-4 ${
          isContent ? 'bg-amber-600/10' : 'bg-red-600/10'
        }`}>
          <div>
            {isEnding && (
              <span className="mb-0.5 block text-xs font-medium uppercase tracking-wider text-red-400">
                结束语
              </span>
            )}
            <h2 className="text-lg font-bold text-white">{node.title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {hasContent ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
              {node.content}
            </p>
          ) : (
            <p className="text-sm text-gray-500">暂无内容</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-700 px-6 py-4">
          {isContent && (
            <button
              onClick={handleExpandTopics}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-400"
            >
              基于此内容展开子话题
            </button>
          )}
          {isEnding && !hasContent && (
            <button
              onClick={handleGenerateEnding}
              className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              生成结束语
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No compilation errors

**Step 3: Commit**

```bash
git add components/canvas/ContentModal.tsx
git commit -m "feat: add ContentModal for full-text reading overlay"
```

---

### Task 8: InfiniteCanvas — Integrate Modal and Update Node Click

**Files:**
- Modify: `components/canvas/InfiniteCanvas.tsx:1-263`

**Step 1: Import ContentModal**

Add import at top of `components/canvas/InfiniteCanvas.tsx`:

```typescript
import ContentModal from './ContentModal'
```

**Step 2: Update `handleNodeClick` to only set active for content/ending nodes**

Replace the existing `handleNodeClick` (lines 123-128):

```typescript
const handleNodeClick = useCallback(
  (_event: React.MouseEvent, flowNode: Node) => {
    const podcastNode = nodes.get(flowNode.id)
    if (podcastNode && (podcastNode.node_type === 'content' || podcastNode.node_type === 'ending')) {
      setActiveNode(flowNode.id)
    }
  },
  [nodes, setActiveNode]
)
```

**Step 3: Add ContentModal to the render output**

In the `CanvasInner` return, add `ContentModal` after the ReactFlow closing tag but inside the outer div (after line 170, before `</div>`):

```typescript
return (
  <div className="h-full w-full bg-gray-950">
    <ReactFlow ...>
      ...
    </ReactFlow>
    <ContentModal
      onExpandTopics={onExpandTopics}
      onGenerateEnding={onGenerateEnding}
    />
  </div>
)
```

**Step 4: Update `buildNodeData` for content nodes**

In the `buildNodeData` function, simplify the `'content'` case to remove `onToggleExpand` and `onExpandTopics` (those are now in the modal), and remove `isExpanded`:

```typescript
case 'content':
  return {
    title: node.title,
    content: node.content,
    isStreaming: nodeIsStreaming,
  }
```

And simplify the `'ending'` case to remove `onToggleExpand` and `isExpanded`:

```typescript
case 'ending':
  return {
    title: node.title,
    content: node.content,
    isStreaming: nodeIsStreaming,
    onGenerateEnding: () => onGenerateEnding(node.id),
  }
```

**Step 5: Remove `onToggleExpand` from `InfiniteCanvasProps` and `CanvasInner` params**

Since content/ending nodes no longer have toggle expand, remove `onToggleExpand` from the interface and function params. Also remove it from the `buildNodeData` handlers object.

Update `InfiniteCanvasProps`:

```typescript
interface InfiniteCanvasProps {
  onExpandTopics: (parentNodeId: string) => void
  onGenerateContent: (nodeId: string) => void
  onGenerateEnding: (nodeId: string) => void
  onLoadMore: (parentNodeId: string) => void
  isLoadingMore: boolean
}
```

**Step 6: Update WorkspacePage to remove `handleToggleExpand`**

In `app/studio/[podcastId]/page.tsx`:
- Remove the `handleToggleExpand` callback entirely
- Remove `onToggleExpand={handleToggleExpand}` from the `<InfiniteCanvas>` props

**Step 7: Verify build**

Run: `npm run build`
Expected: No compilation errors

**Step 8: Run all tests**

Run: `npm run test:run`
Expected: ALL PASS

**Step 9: Commit**

```bash
git add components/canvas/InfiniteCanvas.tsx components/canvas/ContentModal.tsx app/studio/\[podcastId\]/page.tsx
git commit -m "feat: integrate content modal and simplify canvas node interactions"
```

---

### Task 9: Final Verification

**Step 1: Run full test suite**

Run: `npm run test:run`
Expected: ALL PASS

**Step 2: Run build**

Run: `npm run build`
Expected: Clean build, no errors

**Step 3: Manual testing checklist**

Run: `npm run dev`

- [ ] Create new podcast → expand topics → multiple subtopics appear
- [ ] Click one topic's "展开子话题" → siblings disappear, subtopics appear below
- [ ] Click one topic's "生成内容" → siblings disappear, content thumbnail appears below
- [ ] Click content thumbnail → modal opens with full text + "展开子话题" button
- [ ] Click outside modal → modal closes
- [ ] Click "展开子话题" in modal → modal closes, new topics generated
- [ ] Refresh page → pruned nodes don't reappear
- [ ] "加载更多" button → does NOT trigger pruning
- [ ] Ending node: small thumbnail, click to read in modal
- [ ] All nodes form a vertical line after pruning

**Step 4: Final commit**

```bash
git add docs/plans/2026-02-15-single-main-line-design.md docs/plans/2026-02-15-single-main-line-implementation.md
git commit -m "docs: add design and implementation plan for single main line feature"
```
