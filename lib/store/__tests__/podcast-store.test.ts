import { describe, it, expect, beforeEach } from 'vitest'
import { usePodcastStore } from '../podcast-store'
import type { PodcastNode } from '@/lib/supabase/types'

const makeNode = (overrides: Partial<PodcastNode> = {}): PodcastNode => ({
  id: 'node-1',
  podcast_id: 'podcast-1',
  parent_id: null,
  node_type: 'topic',
  title: 'Test',
  content: null,
  position_x: 0,
  position_y: 0,
  is_expanded: false,
  is_selected: false,
  order_index: 0,
  created_at: new Date().toISOString(),
  metadata: {},
  ...overrides,
})

describe('PodcastStore', () => {
  beforeEach(() => {
    usePodcastStore.getState().reset()
  })

  it('sets and retrieves nodes', () => {
    const nodes = [makeNode({ id: '1' }), makeNode({ id: '2' })]
    usePodcastStore.getState().setNodes(nodes)
    expect(usePodcastStore.getState().nodes.size).toBe(2)
  })

  it('adds nodes to existing map', () => {
    usePodcastStore.getState().setNodes([makeNode({ id: '1' })])
    usePodcastStore.getState().addNodes([makeNode({ id: '2' })])
    expect(usePodcastStore.getState().nodes.size).toBe(2)
  })

  it('appends to node content', () => {
    usePodcastStore.getState().setNodes([makeNode({ id: '1', content: 'hello' })])
    usePodcastStore.getState().appendToNodeContent('1', ' world')
    expect(usePodcastStore.getState().nodes.get('1')?.content).toBe('hello world')
  })

  it('gets child nodes sorted by order_index', () => {
    const nodes = [
      makeNode({ id: 'parent', node_type: 'root' }),
      makeNode({ id: 'c2', parent_id: 'parent', order_index: 2 }),
      makeNode({ id: 'c1', parent_id: 'parent', order_index: 1 }),
      makeNode({ id: 'c3', parent_id: 'parent', order_index: 3 }),
    ]
    usePodcastStore.getState().setNodes(nodes)
    const children = usePodcastStore.getState().getChildNodes('parent')
    expect(children.map(c => c.id)).toEqual(['c1', 'c2', 'c3'])
  })

  it('tracks selected path', () => {
    usePodcastStore.getState().addToPath('node-1')
    usePodcastStore.getState().addToPath('node-2')
    expect(usePodcastStore.getState().selectedPath).toEqual(['node-1', 'node-2'])
  })

  it('marks dirty on changes', () => {
    expect(usePodcastStore.getState().autoSaveState.isDirty).toBe(false)
    usePodcastStore.getState().markDirty()
    expect(usePodcastStore.getState().autoSaveState.isDirty).toBe(true)
  })
})
