import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, rootTopic, scriptStyle, hostName, coHostName } = await request.json()

    if (!title || !rootTopic) {
      return NextResponse.json({ error: 'Title and rootTopic are required' }, { status: 400 })
    }

    // Create podcast
    const { data: podcast, error: podcastError } = await supabase
      .from('podcasts')
      .insert({
        user_id: user.id,
        title,
        root_topic: rootTopic,
        status: 'draft',
        script_style: scriptStyle || 'monologue',
        host_name: hostName || '主播',
        co_host_name: coHostName || null,
        canvas_state: {},
        last_autosave_at: null,
      })
      .select()
      .single()

    if (podcastError || !podcast) {
      return NextResponse.json({ error: 'Failed to create podcast' }, { status: 500 })
    }

    // Create root node
    const { data: rootNode, error: nodeError } = await supabase
      .from('nodes')
      .insert({
        podcast_id: podcast.id,
        parent_id: null,
        node_type: 'root',
        title: rootTopic,
        content: null,
        position_x: 0,
        position_y: 0,
        is_expanded: false,
        is_selected: false,
        order_index: 0,
        metadata: {},
      })
      .select()
      .single()

    if (nodeError || !rootNode) {
      return NextResponse.json({ error: 'Failed to create root node' }, { status: 500 })
    }

    return NextResponse.json({ podcast, rootNode }, { status: 201 })
  } catch (error) {
    console.error('POST /api/podcast error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: podcasts, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch podcasts' }, { status: 500 })
    }

    return NextResponse.json(podcasts)
  } catch (error) {
    console.error('GET /api/podcast error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
