import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PUT(
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

    const { nodes, canvasState } = await request.json()

    // Update podcast canvas_state and last_autosave_at
    const { error: podcastError } = await supabase
      .from('podcasts')
      .update({
        canvas_state: canvasState,
        last_autosave_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (podcastError) {
      return NextResponse.json({ error: 'Failed to update podcast' }, { status: 500 })
    }

    // Batch upsert nodes
    if (nodes && nodes.length > 0) {
      const { error: nodesError } = await supabase
        .from('nodes')
        .upsert(nodes, { onConflict: 'id' })

      if (nodesError) {
        return NextResponse.json({ error: 'Failed to upsert nodes' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/podcast/[id]/autosave error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
