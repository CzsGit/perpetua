import { describe, it, expect } from 'vitest'
import { buildContextMessages, compressContext } from '../context'
import type { PodcastNode } from '@/lib/supabase/types'

const makeNode = (overrides: Partial<PodcastNode>): PodcastNode => ({
  id: 'test-id',
  podcast_id: 'podcast-1',
  parent_id: null,
  node_type: 'topic',
  title: 'Test Topic',
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

describe('buildContextMessages', () => {
  it('includes root topic as first context message', () => {
    const rootNode = makeNode({ node_type: 'root', title: '金字塔之谜' })
    const messages = buildContextMessages('金字塔之谜', [rootNode])
    expect(messages[0].content).toContain('金字塔之谜')
  })

  it('includes path nodes in order', () => {
    const path = [
      makeNode({ id: '1', node_type: 'root', title: '主题' }),
      makeNode({ id: '2', node_type: 'topic', title: '子话题A', content: '内容A' }),
      makeNode({ id: '3', node_type: 'topic', title: '子话题B', content: '内容B' }),
    ]
    const messages = buildContextMessages('主题', path)
    const fullText = messages.map(m => m.content).join('\n')
    expect(fullText).toContain('子话题A')
    expect(fullText).toContain('子话题B')
  })
})

describe('compressContext', () => {
  it('keeps recent nodes complete and compresses older ones', () => {
    const path = Array.from({ length: 10 }, (_, i) =>
      makeNode({
        id: `node-${i}`,
        title: `话题${i}`,
        content: `这是话题${i}的详细内容，`.repeat(50),
      })
    )
    const compressed = compressContext(path, 3)
    // Recent 3 nodes should have full content
    expect(compressed[9].content).toContain('这是话题9')
    expect(compressed[9].content!.length).toBeGreaterThan(100)
    // Older nodes should be compressed (shorter)
    expect(compressed[0].content!.length).toBeLessThan(compressed[9].content!.length)
  })
})
