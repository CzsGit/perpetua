import type { PodcastNode } from '@/lib/supabase/types'

interface ContextMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function compressContext(path: PodcastNode[], keepRecentCount: number = 3): PodcastNode[] {
  if (path.length <= keepRecentCount) return path

  return path.map((node, index) => {
    if (index >= path.length - keepRecentCount) return node
    // Compress older nodes: keep title + first 100 chars of content
    return {
      ...node,
      content: node.content ? node.content.slice(0, 100) + '...' : null,
    }
  })
}

export function buildContextMessages(rootTopic: string, path: PodcastNode[]): ContextMessage[] {
  const messages: ContextMessage[] = []

  // Root topic context
  messages.push({
    role: 'user',
    content: `## 播客主题\n${rootTopic}`,
  })

  // Path context (skip root node, start from first topic)
  const topicNodes = path.filter(n => n.node_type !== 'root')
  if (topicNodes.length > 0) {
    const pathSummary = topicNodes
      .map((node, i) => {
        const prefix = `### ${i + 1}. ${node.title}`
        if (node.content) {
          return `${prefix}\n${node.content}`
        }
        return prefix
      })
      .join('\n\n')

    messages.push({
      role: 'user',
      content: `## 已讨论内容\n${pathSummary}`,
    })
  }

  return messages
}
