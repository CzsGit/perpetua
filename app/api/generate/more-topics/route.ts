import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { openai, AI_MODEL } from '@/lib/ai/client'
import { SYSTEM_PROMPT_TOPICS, buildTopicPrompt } from '@/lib/ai/prompts'
import { buildContextMessages, compressContext } from '@/lib/ai/context'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      podcastId,
      parentNodeId,
      rootTopic,
      pathNodes,
      existingTitles = [],
      count = 7,
    } = await request.json()

    if (!podcastId || !parentNodeId || !rootTopic) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Compress context and build messages
    const compressed = compressContext(pathNodes || [])
    const contextMessages = buildContextMessages(rootTopic, compressed)

    let userPrompt = buildTopicPrompt(rootTopic, count)
    if (existingTitles.length > 0) {
      userPrompt += `\n\n以下话题已经存在，请不要重复：${existingTitles.join('、')}`
    }

    // Get max order_index for the parent node
    const { data: existingNodes } = await supabase
      .from('nodes')
      .select('order_index')
      .eq('podcast_id', podcastId)
      .eq('parent_id', parentNodeId)
      .order('order_index', { ascending: false })
      .limit(1)

    const startOrderIndex = existingNodes && existingNodes.length > 0
      ? existingNodes[0].order_index + 1
      : 0

    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_TOPICS },
        ...contextMessages,
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
    })

    const generationTime = Date.now() - startTime
    const responseText = completion.choices[0]?.message?.content || ''

    // Parse JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    let topics: { title: string; summary: string }[]
    try {
      topics = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'Failed to parse topics JSON' }, { status: 500 })
    }

    // Insert topic nodes starting from max order_index + 1
    const nodesToInsert = topics.map((topic, index) => ({
      podcast_id: podcastId,
      parent_id: parentNodeId,
      node_type: 'topic' as const,
      title: topic.title,
      content: topic.summary,
      position_x: 0,
      position_y: 0,
      is_expanded: false,
      is_selected: false,
      order_index: startOrderIndex + index,
      metadata: {},
    }))

    const { data: newNodes, error: insertError } = await supabase
      .from('nodes')
      .insert(nodesToInsert)
      .select()

    if (insertError || !newNodes) {
      return NextResponse.json({ error: 'Failed to insert topic nodes' }, { status: 500 })
    }

    // Save to generation_history
    await supabase.from('generation_history').insert({
      podcast_id: podcastId,
      node_id: parentNodeId,
      prompt: userPrompt,
      response: responseText,
      model: AI_MODEL,
      tokens_used: completion.usage?.total_tokens ?? null,
      generation_time_ms: generationTime,
    })

    return NextResponse.json({ topics: newNodes })
  } catch (error) {
    console.error('POST /api/generate/more-topics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
