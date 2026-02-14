-- Podcasts table
CREATE TABLE podcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  root_topic TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'completed')) DEFAULT 'draft',
  canvas_state JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_autosave_at TIMESTAMPTZ
);

-- Nodes table
CREATE TABLE nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  node_type TEXT CHECK (node_type IN ('root', 'topic', 'content', 'ending')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  is_expanded BOOLEAN DEFAULT false,
  is_selected BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Generation history table
CREATE TABLE generation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE NOT NULL,
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Saved podcasts table
CREATE TABLE saved_podcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  markdown_content TEXT NOT NULL,
  path_node_ids UUID[] NOT NULL,
  word_count INTEGER,
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_podcasts_user_id ON podcasts(user_id);
CREATE INDEX idx_nodes_podcast_id ON nodes(podcast_id);
CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX idx_generation_history_podcast_id ON generation_history(podcast_id);
CREATE INDEX idx_saved_podcasts_user_id ON saved_podcasts(user_id);

-- Row Level Security
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_podcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own podcasts" ON podcasts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own podcast nodes" ON nodes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM podcasts WHERE podcasts.id = nodes.podcast_id AND podcasts.user_id = auth.uid())
  );

CREATE POLICY "Users manage own generation history" ON generation_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM podcasts WHERE podcasts.id = generation_history.podcast_id AND podcasts.user_id = auth.uid())
  );

CREATE POLICY "Users manage own saved podcasts" ON saved_podcasts
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER podcasts_updated_at
  BEFORE UPDATE ON podcasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
