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
