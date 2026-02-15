import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const CHARS_PER_MINUTE = 250

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { podcastId, pathNodeIds } = await request.json()

    if (!podcastId || !pathNodeIds || !Array.isArray(pathNodeIds) || pathNodeIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get podcast info
    const { data: podcast, error: podcastError } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', podcastId)
      .eq('user_id', user.id)
      .single()

    if (podcastError || !podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })
    }

    // Get nodes by ids
    const { data: nodes, error: nodesError } = await supabase
      .from('nodes')
      .select('*')
      .in('id', pathNodeIds)

    if (nodesError || !nodes) {
      return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 })
    }

    // Sort nodes by pathNodeIds order
    const nodeMap = new Map(nodes.map(node => [node.id, node]))
    const sortedNodes = pathNodeIds
      .map((id: string) => nodeMap.get(id))
      .filter(Boolean)

    // Build markdown
    const sections: string[] = []
    sections.push(`# ${podcast.title}`)
    sections.push('')

    for (const node of sortedNodes) {
      if (!node) continue

      if (node.node_type === 'root') {
        sections.push(`> 主题：${node.title}`)
        sections.push('')
      } else if (node.node_type === 'ending') {
        sections.push(`## 结束语`)
        sections.push('')
        if (node.content) {
          sections.push(node.content)
          sections.push('')
        }
      } else if ((node.node_type === 'content' || node.node_type === 'topic') && node.content && node.content.trim().length > 0) {
        sections.push(`## ${node.title}`)
        sections.push('')
        sections.push(node.content)
        sections.push('')
      }
    }

    // Calculate word count and duration
    const allContent = sortedNodes
      .filter((n): n is NonNullable<typeof n> => n !== null && n !== undefined)
      .map(n => n.content || '')
      .join('')
    const wordCount = allContent.length
    const estimatedDuration = Math.max(1, Math.round(wordCount / CHARS_PER_MINUTE))

    // Add footer
    const date = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    sections.push('---')
    sections.push('')
    sections.push(`*生成于 ${date} | 总字数 ${wordCount} 字 | 预计时长 ${estimatedDuration} 分钟*`)

    const markdown = sections.join('\n')

    // Save to saved_podcasts table
    const { data: saved, error: saveError } = await supabase
      .from('saved_podcasts')
      .insert({
        podcast_id: podcastId,
        user_id: user.id,
        markdown_content: markdown,
        path_node_ids: pathNodeIds,
        word_count: wordCount,
        estimated_duration_minutes: estimatedDuration,
      })
      .select()
      .single()

    if (saveError) {
      return NextResponse.json({ error: 'Failed to save podcast export' }, { status: 500 })
    }

    return NextResponse.json({ markdown, saved })
  } catch (error) {
    console.error('POST /api/export/markdown error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
