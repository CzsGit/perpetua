import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { openai, AI_MODEL } from '@/lib/ai/client'
import { SYSTEM_PROMPT_CONTENT, buildContentPrompt } from '@/lib/ai/prompts'
import { buildContextMessages, compressContext } from '@/lib/ai/context'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { podcastId, nodeId, rootTopic, pathNodes, currentTopic } = await request.json()

    if (!podcastId || !nodeId || !rootTopic || !currentTopic) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const compressed = compressContext(pathNodes || [])
    const contextMessages = buildContextMessages(rootTopic, compressed)
    const userPrompt = buildContentPrompt(currentTopic)

    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_CONTENT },
        ...contextMessages,
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      temperature: 0.7,
    })

    let fullContent = ''

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content || ''
            if (delta) {
              fullContent += delta
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`)
              )
            }
          }

          const generationTime = Date.now() - startTime

          // Update node content in DB
          await supabase
            .from('nodes')
            .update({ content: fullContent })
            .eq('id', nodeId)

          // Save to generation_history
          await supabase.from('generation_history').insert({
            podcast_id: podcastId,
            node_id: nodeId,
            prompt: userPrompt,
            response: fullContent,
            model: AI_MODEL,
            tokens_used: null,
            generation_time_ms: generationTime,
          })

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          )
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Stream error'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('POST /api/generate/content error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
