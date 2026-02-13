# Perpetua Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an infinite podcast content generation platform where bloggers input a topic and AI generates an expandable tree of sub-topics and speech scripts on an infinite canvas.

**Architecture:** Next.js 14 App Router full-stack app with Supabase (PostgreSQL + Auth), React Flow infinite canvas, Zustand state management, and OpenRouter (Gemini 2.0 Flash) for AI content generation with SSE streaming.

**Tech Stack:** Next.js 14, React, Tailwind CSS, React Flow, Zustand, Supabase, OpenAI SDK (OpenRouter compatible), SSE streaming

**Design Doc:** `docs/plans/2026-02-13-perpetua-design.md`

---

## Phase 1: Project Scaffolding & Configuration

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

**Step 1: Create Next.js project with TypeScript and Tailwind**

```bash
cd /Users/xxx/Documents/Perpetua
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Select defaults: Yes to all prompts.

**Step 2: Verify project runs**

```bash
npm run dev
```
Expected: Dev server starts at localhost:3000

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

### Task 2: Install Core Dependencies

**Step 1: Install runtime dependencies**

```bash
npm install @xyflow/react zustand @supabase/supabase-js @supabase/ssr openai uuid
npm install -D @types/uuid
```

**Step 2: Install dev/test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

**Step 3: Create Vitest config**

Create: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Create: `vitest.setup.ts`

```typescript
import '@testing-library/jest-dom/vitest'
```

**Step 4: Add test script to package.json**

Add to `scripts`: `"test": "vitest", "test:run": "vitest run"`

**Step 5: Verify vitest works**

```bash
npm run test:run
```
Expected: No tests found (passes with 0 tests)

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: install core dependencies and configure vitest"
```

---

### Task 3: Environment Configuration

**Files:**
- Create: `.env.local`
- Create: `.env.example`
- Modify: `.gitignore`

**Step 1: Create .env.example (committed to git)**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenRouter AI
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=google/gemini-3-flash-preview
```

**Step 2: Create .env.local (not committed)**

```bash
# Supabase - fill after creating Supabase project
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenRouter AI
OPENROUTER_API_KEY=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
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=google/gemini-3-flash-preview
```

**Step 3: Verify .env.local is in .gitignore**

Check `.gitignore` contains `.env*.local`. Next.js includes this by default.

**Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "feat: add environment configuration template"
```

---

## Phase 2: Supabase Setup & Database Schema

### Task 4: Create Supabase Client Utilities

**Files:**
- Create: `lib/supabase/client.ts` (browser client)
- Create: `lib/supabase/server.ts` (server client)
- Create: `lib/supabase/types.ts` (database types)

**Step 1: Create TypeScript types for database**

Create: `lib/supabase/types.ts`

```typescript
export type NodeType = 'root' | 'topic' | 'content' | 'ending'
export type PodcastStatus = 'draft' | 'completed'

export interface Podcast {
  id: string
  user_id: string
  title: string
  root_topic: string
  status: PodcastStatus
  canvas_state: Record<string, unknown>
  created_at: string
  updated_at: string
  last_autosave_at: string | null
}

export interface PodcastNode {
  id: string
  podcast_id: string
  parent_id: string | null
  node_type: NodeType
  title: string
  content: string | null
  position_x: number
  position_y: number
  is_expanded: boolean
  is_selected: boolean
  order_index: number
  created_at: string
  metadata: Record<string, unknown>
}

export interface GenerationHistory {
  id: string
  podcast_id: string
  node_id: string
  prompt: string
  response: string
  model: string
  tokens_used: number | null
  generation_time_ms: number | null
  created_at: string
}

export interface SavedPodcast {
  id: string
  podcast_id: string
  user_id: string
  markdown_content: string
  path_node_ids: string[]
  word_count: number | null
  estimated_duration_minutes: number | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      podcasts: { Row: Podcast; Insert: Omit<Podcast, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Podcast> }
      nodes: { Row: PodcastNode; Insert: Omit<PodcastNode, 'id' | 'created_at'>; Update: Partial<PodcastNode> }
      generation_history: { Row: GenerationHistory; Insert: Omit<GenerationHistory, 'id' | 'created_at'>; Update: Partial<GenerationHistory> }
      saved_podcasts: { Row: SavedPodcast; Insert: Omit<SavedPodcast, 'id' | 'created_at'>; Update: Partial<SavedPodcast> }
    }
  }
}
```

**Step 2: Create browser client**

Create: `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 3: Create server client**

Create: `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
```

**Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add Supabase client utilities and database types"
```

---

### Task 5: Create SQL Migration File

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Write full migration SQL**

Create: `supabase/migrations/001_initial_schema.sql`

```sql
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
```

**Step 2: Commit**

```bash
git add supabase/
git commit -m "feat: add database migration with schema, indexes, and RLS policies"
```

**Step 3: Run migration on Supabase**

Go to Supabase Dashboard → SQL Editor → paste and run `001_initial_schema.sql`.

---

## Phase 3: Authentication

### Task 6: Supabase Auth Middleware

**Files:**
- Create: `middleware.ts`

**Step 1: Create Next.js middleware for auth session refresh**

Create: `middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login (except auth pages and home)
  if (!user && !request.nextUrl.pathname.startsWith('/auth') && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
```

**Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add auth middleware with route protection"
```

---

### Task 7: Auth Pages (Login & Register)

**Files:**
- Create: `app/auth/login/page.tsx`
- Create: `app/auth/register/page.tsx`
- Create: `components/auth/AuthForm.tsx`

**Step 1: Create shared AuthForm component**

Create: `components/auth/AuthForm.tsx`

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface AuthFormProps {
  mode: 'login' | 'register'
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl border border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2">
          {mode === 'login' ? '登录 Perpetua' : '注册 Perpetua'}
        </h1>
        <p className="text-gray-400 mb-6">
          {mode === 'login' ? '欢迎回来' : '创建你的账户，开始无限播客创作'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="至少 6 个字符"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <p className="text-gray-400 text-sm mt-4 text-center">
          {mode === 'login' ? (
            <>还没有账户？ <a href="/auth/register" className="text-blue-400 hover:underline">注册</a></>
          ) : (
            <>已有账户？ <a href="/auth/login" className="text-blue-400 hover:underline">登录</a></>
          )}
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Create login page**

Create: `app/auth/login/page.tsx`

```tsx
import AuthForm from '@/components/auth/AuthForm'

export default function LoginPage() {
  return <AuthForm mode="login" />
}
```

**Step 3: Create register page**

Create: `app/auth/register/page.tsx`

```tsx
import AuthForm from '@/components/auth/AuthForm'

export default function RegisterPage() {
  return <AuthForm mode="register" />
}
```

**Step 4: Commit**

```bash
git add app/auth/ components/auth/
git commit -m "feat: add login and register pages with Supabase Auth"
```

---

## Phase 4: AI Integration Layer

### Task 8: OpenRouter AI Client

**Files:**
- Create: `lib/ai/client.ts`
- Create: `lib/ai/prompts.ts`
- Create: `lib/ai/context.ts`
- Test: `lib/ai/__tests__/context.test.ts`

**Step 1: Write failing test for context builder**

Create: `lib/ai/__tests__/context.test.ts`

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- lib/ai/__tests__/context.test.ts
```
Expected: FAIL

**Step 3: Implement context builder**

Create: `lib/ai/context.ts`

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- lib/ai/__tests__/context.test.ts
```
Expected: PASS

**Step 5: Create AI client**

Create: `lib/ai/client.ts`

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
})

export const AI_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-3-flash-preview'

export { openai }
```

**Step 6: Create prompt templates**

Create: `lib/ai/prompts.ts`

```typescript
export const SYSTEM_PROMPT_TOPICS = `你是一位资深播客内容策划师。你的任务是基于当前话题生成自然延伸的子话题。

## 要求
1. 每个子话题用标题（10字以内）+ 一句话概述（20字以内）
2. 子话题之间有递进或关联关系，不要跳跃
3. 与已讨论内容自然衔接，不要重复已经讨论过的
4. 保持与根主题的关联性
5. 考虑主题的事实脉络、历史发展、不同视角
6. 返回严格的 JSON 格式

## 返回格式
返回一个 JSON 数组，每个元素包含 title 和 summary：
[{"title": "子话题标题", "summary": "简短概述"}]`

export const SYSTEM_PROMPT_CONTENT = `你是一位情感充沛、知识渊博的播客主播。你正在录制一期播客节目。

## 你的风格
- 口语化表达，像在和朋友聊天一样自然
- 讲事实和脉络：围绕主题讲清来龙去脉
- 有观点和思考：不是百科搬运，有自己独到的见解
- 有情绪：热情、思考、感慨、惊讶、幽默，让人感受到你的态度
- 有故事性：善于用故事和例子让观点生动
- 能引发共鸣：让听者听完后也能产生情绪和思考

## 要求
1. 与上一段内容自然过渡衔接
2. 不要使用「大家好」「各位听众」等开场白（除非是第一段）
3. 不要重复已经讲过的内容
4. 约 800-1500 字
5. 不要使用 markdown 格式，纯文本即可`

export const SYSTEM_PROMPT_ENDING = `你是一位播客主播，现在需要为今天的节目做一个完美的收尾。

## 要求
1. 总结今天讨论的所有核心内容和观点
2. 给听众一个有力的结尾感受
3. 语气温暖、有感染力
4. 可以展望未来或留下思考
5. 约 300-500 字
6. 不要使用 markdown 格式，纯文本即可`

export function buildTopicPrompt(currentTopic: string, count: number): string {
  return `当前话题是「${currentTopic}」。请生成 ${count} 个自然延伸的子话题。只返回 JSON 数组，不要其他内容。`
}

export function buildContentPrompt(currentTopic: string): string {
  return `现在请围绕「${currentTopic}」这个话题，生成一段完整的播客演讲稿。`
}

export function buildEndingPrompt(): string {
  return `请基于以上所有讨论内容，生成一段播客结束语。总结今天的核心观点，给听众留下深刻印象。`
}
```

**Step 7: Commit**

```bash
git add lib/ai/
git commit -m "feat: add AI client, prompt templates, and context builder with tests"
```

---

## Phase 5: Core API Routes

### Task 9: Create Podcast API

**Files:**
- Create: `app/api/podcast/route.ts` (POST: create, GET: list)
- Create: `app/api/podcast/[id]/route.ts` (GET: detail, DELETE)
- Create: `app/api/podcast/[id]/autosave/route.ts` (PUT)

**Step 1: Create podcast list/create API**

Create: `app/api/podcast/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, rootTopic } = await request.json()

  // Create podcast
  const { data: podcast, error: podcastError } = await supabase
    .from('podcasts')
    .insert({ user_id: user.id, title, root_topic: rootTopic })
    .select()
    .single()

  if (podcastError) return NextResponse.json({ error: podcastError.message }, { status: 500 })

  // Create root node
  const { data: rootNode, error: nodeError } = await supabase
    .from('nodes')
    .insert({
      podcast_id: podcast.id,
      node_type: 'root',
      title: rootTopic,
      parent_id: null,
      order_index: 0,
    })
    .select()
    .single()

  if (nodeError) return NextResponse.json({ error: nodeError.message }, { status: 500 })

  return NextResponse.json({ podcast, rootNode })
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('podcasts')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

**Step 2: Create podcast detail/delete API**

Create: `app/api/podcast/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: podcast, error: podcastError } = await supabase
    .from('podcasts')
    .select('*')
    .eq('id', id)
    .single()

  if (podcastError) return NextResponse.json({ error: podcastError.message }, { status: 404 })

  const { data: nodes, error: nodesError } = await supabase
    .from('nodes')
    .select('*')
    .eq('podcast_id', id)
    .order('created_at', { ascending: true })

  if (nodesError) return NextResponse.json({ error: nodesError.message }, { status: 500 })

  return NextResponse.json({ podcast, nodes })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('podcasts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

**Step 3: Create autosave API**

Create: `app/api/podcast/[id]/autosave/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nodes, canvasState } = await request.json()

  // Update podcast canvas state
  await supabase
    .from('podcasts')
    .update({ canvas_state: canvasState, last_autosave_at: new Date().toISOString() })
    .eq('id', id)

  // Batch upsert nodes
  if (nodes && nodes.length > 0) {
    const { error } = await supabase.from('nodes').upsert(nodes, { onConflict: 'id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 4: Commit**

```bash
git add app/api/podcast/
git commit -m "feat: add podcast CRUD and autosave API routes"
```

---

### Task 10: AI Generation API Routes

**Files:**
- Create: `app/api/generate/topics/route.ts`
- Create: `app/api/generate/content/route.ts`
- Create: `app/api/generate/ending/route.ts`
- Create: `app/api/generate/more-topics/route.ts`

**Step 1: Create topic generation API**

Create: `app/api/generate/topics/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { openai, AI_MODEL } from '@/lib/ai/client'
import { SYSTEM_PROMPT_TOPICS, buildTopicPrompt } from '@/lib/ai/prompts'
import { buildContextMessages, compressContext } from '@/lib/ai/context'
import type { PodcastNode } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { podcastId, parentNodeId, rootTopic, pathNodes, count = 7 } = await request.json()

  const compressed = compressContext(pathNodes as PodcastNode[])
  const contextMessages = buildContextMessages(rootTopic, compressed)

  const currentNode = (pathNodes as PodcastNode[]).find(n => n.id === parentNodeId)
  const currentTitle = currentNode?.title || rootTopic

  const startTime = Date.now()
  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_TOPICS },
      ...contextMessages,
      { role: 'user', content: buildTopicPrompt(currentTitle, count) },
    ],
    temperature: 0.8,
  })

  const responseText = completion.choices[0]?.message?.content || '[]'
  const generationTime = Date.now() - startTime

  // Parse topics from response
  let topics: { title: string; summary: string }[]
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    topics = jsonMatch ? JSON.parse(jsonMatch[0]) : []
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: responseText }, { status: 500 })
  }

  // Create topic nodes in database
  const nodeInserts = topics.map((topic, index) => ({
    podcast_id: podcastId,
    parent_id: parentNodeId,
    node_type: 'topic' as const,
    title: topic.title,
    content: topic.summary,
    order_index: index,
  }))

  const { data: newNodes, error } = await supabase
    .from('nodes')
    .insert(nodeInserts)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Save generation history
  await supabase.from('generation_history').insert({
    podcast_id: podcastId,
    node_id: parentNodeId,
    prompt: buildTopicPrompt(currentTitle, count),
    response: responseText,
    model: AI_MODEL,
    tokens_used: completion.usage?.total_tokens,
    generation_time_ms: generationTime,
  })

  return NextResponse.json({ topics: newNodes })
}
```

**Step 2: Create content generation API (streaming)**

Create: `app/api/generate/content/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { openai, AI_MODEL } from '@/lib/ai/client'
import { SYSTEM_PROMPT_CONTENT, buildContentPrompt } from '@/lib/ai/prompts'
import { buildContextMessages, compressContext } from '@/lib/ai/context'
import type { PodcastNode } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { podcastId, nodeId, rootTopic, pathNodes, currentTopic } = await request.json()

  const compressed = compressContext(pathNodes as PodcastNode[])
  const contextMessages = buildContextMessages(rootTopic, compressed)

  const stream = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_CONTENT },
      ...contextMessages,
      { role: 'user', content: buildContentPrompt(currentTopic) },
    ],
    temperature: 0.8,
    stream: true,
  })

  let fullContent = ''
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            fullContent += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }

        // Save content node to database
        await supabase
          .from('nodes')
          .update({ content: fullContent })
          .eq('id', nodeId)

        // Save generation history
        await supabase.from('generation_history').insert({
          podcast_id: podcastId,
          node_id: nodeId,
          prompt: buildContentPrompt(currentTopic),
          response: fullContent,
          model: AI_MODEL,
        })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

**Step 3: Create ending generation API (streaming)**

Create: `app/api/generate/ending/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { openai, AI_MODEL } from '@/lib/ai/client'
import { SYSTEM_PROMPT_ENDING, buildEndingPrompt } from '@/lib/ai/prompts'
import { buildContextMessages, compressContext } from '@/lib/ai/context'
import type { PodcastNode } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { podcastId, nodeId, rootTopic, pathNodes } = await request.json()

  const compressed = compressContext(pathNodes as PodcastNode[])
  const contextMessages = buildContextMessages(rootTopic, compressed)

  const stream = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_ENDING },
      ...contextMessages,
      { role: 'user', content: buildEndingPrompt() },
    ],
    temperature: 0.7,
    stream: true,
  })

  let fullContent = ''
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) {
            fullContent += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }

        await supabase.from('nodes').update({ content: fullContent }).eq('id', nodeId)
        await supabase.from('generation_history').insert({
          podcast_id: podcastId, node_id: nodeId,
          prompt: buildEndingPrompt(), response: fullContent, model: AI_MODEL,
        })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Generation failed' })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
```

**Step 4: Create more-topics API**

Create: `app/api/generate/more-topics/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { openai, AI_MODEL } from '@/lib/ai/client'
import { SYSTEM_PROMPT_TOPICS, buildTopicPrompt } from '@/lib/ai/prompts'
import { buildContextMessages, compressContext } from '@/lib/ai/context'
import type { PodcastNode } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { podcastId, parentNodeId, rootTopic, pathNodes, existingTitles, count = 5 } = await request.json()

  const compressed = compressContext(pathNodes as PodcastNode[])
  const contextMessages = buildContextMessages(rootTopic, compressed)

  const currentNode = (pathNodes as PodcastNode[]).find(n => n.id === parentNodeId)
  const currentTitle = currentNode?.title || rootTopic

  const prompt = `${buildTopicPrompt(currentTitle, count)}\n\n注意：以下话题已经存在，请不要重复：${existingTitles.join('、')}`

  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_TOPICS },
      ...contextMessages,
      { role: 'user', content: prompt },
    ],
    temperature: 0.9,
  })

  const responseText = completion.choices[0]?.message?.content || '[]'

  let topics: { title: string; summary: string }[]
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    topics = jsonMatch ? JSON.parse(jsonMatch[0]) : []
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  // Get max order_index for this parent
  const { data: existingNodes } = await supabase
    .from('nodes')
    .select('order_index')
    .eq('parent_id', parentNodeId)
    .order('order_index', { ascending: false })
    .limit(1)

  const startIndex = (existingNodes?.[0]?.order_index ?? -1) + 1

  const nodeInserts = topics.map((topic, index) => ({
    podcast_id: podcastId,
    parent_id: parentNodeId,
    node_type: 'topic' as const,
    title: topic.title,
    content: topic.summary,
    order_index: startIndex + index,
  }))

  const { data: newNodes, error } = await supabase.from('nodes').insert(nodeInserts).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ topics: newNodes })
}
```

**Step 5: Commit**

```bash
git add app/api/generate/
git commit -m "feat: add AI generation API routes with streaming support"
```

---

### Task 11: Markdown Export API

**Files:**
- Create: `app/api/export/markdown/route.ts`

**Step 1: Create export API**

Create: `app/api/export/markdown/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { podcastId, pathNodeIds } = await request.json()

  // Get podcast info
  const { data: podcast } = await supabase
    .from('podcasts')
    .select('*')
    .eq('id', podcastId)
    .single()

  if (!podcast) return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })

  // Get path nodes in order
  const { data: nodes } = await supabase
    .from('nodes')
    .select('*')
    .in('id', pathNodeIds)

  if (!nodes) return NextResponse.json({ error: 'Nodes not found' }, { status: 404 })

  // Sort nodes by pathNodeIds order
  const sortedNodes = pathNodeIds
    .map((id: string) => nodes.find(n => n.id === id))
    .filter(Boolean)

  // Build markdown
  let markdown = `# ${podcast.title}\n\n`
  let wordCount = 0

  for (const node of sortedNodes) {
    if (node.node_type === 'root') {
      markdown += `> 主题：${node.title}\n\n---\n\n`
    } else if (node.node_type === 'ending') {
      markdown += `## 结束语\n\n${node.content || ''}\n\n`
      wordCount += (node.content || '').length
    } else if (node.content && node.content.length > 100) {
      // Content node (has substantial content)
      markdown += `## ${node.title}\n\n${node.content}\n\n`
      wordCount += node.content.length
    }
  }

  const estimatedMinutes = Math.ceil(wordCount / 250) // ~250 chars per minute for Chinese

  markdown += `---\n\n*生成于 ${new Date().toLocaleDateString('zh-CN')} | 总字数 ${wordCount} 字 | 预计时长 ${estimatedMinutes} 分钟*\n`

  // Save to saved_podcasts
  const { data: saved, error } = await supabase
    .from('saved_podcasts')
    .insert({
      podcast_id: podcastId,
      user_id: user.id,
      markdown_content: markdown,
      path_node_ids: pathNodeIds,
      word_count: wordCount,
      estimated_duration_minutes: estimatedMinutes,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ markdown, saved })
}
```

**Step 2: Commit**

```bash
git add app/api/export/
git commit -m "feat: add Markdown export API with word count and duration estimate"
```

---

## Phase 6: State Management

### Task 12: Zustand Store

**Files:**
- Create: `lib/store/podcast-store.ts`
- Create: `lib/store/types.ts`
- Test: `lib/store/__tests__/podcast-store.test.ts`

**Step 1: Create store types**

Create: `lib/store/types.ts`

```typescript
import type { Podcast, PodcastNode } from '@/lib/supabase/types'

export interface StreamingState {
  isStreaming: boolean
  targetNodeId: string | null
  buffer: string
}

export interface AutoSaveState {
  isDirty: boolean
  lastSaveAt: Date | null
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

export interface PodcastStoreState {
  // Data
  podcast: Podcast | null
  nodes: Map<string, PodcastNode>
  selectedPath: string[]
  activeNodeId: string | null

  // UI State
  streamingState: StreamingState
  autoSaveState: AutoSaveState

  // Actions
  setPodcast: (podcast: Podcast) => void
  setNodes: (nodes: PodcastNode[]) => void
  addNodes: (nodes: PodcastNode[]) => void
  updateNode: (id: string, updates: Partial<PodcastNode>) => void
  appendToNodeContent: (id: string, text: string) => void
  setActiveNode: (id: string | null) => void
  addToPath: (nodeId: string) => void
  setStreaming: (state: Partial<StreamingState>) => void
  markDirty: () => void
  setAutoSaveStatus: (status: AutoSaveState['saveStatus']) => void
  setLastSaveAt: (date: Date) => void
  getPathNodes: () => PodcastNode[]
  getChildNodes: (parentId: string) => PodcastNode[]
  getRootNode: () => PodcastNode | undefined
  reset: () => void
}
```

**Step 2: Write failing test**

Create: `lib/store/__tests__/podcast-store.test.ts`

```typescript
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
```

**Step 3: Run test to verify it fails**

```bash
npm run test:run -- lib/store/__tests__/podcast-store.test.ts
```
Expected: FAIL

**Step 4: Implement store**

Create: `lib/store/podcast-store.ts`

```typescript
import { create } from 'zustand'
import type { PodcastStoreState } from './types'
import type { PodcastNode } from '@/lib/supabase/types'

const initialStreamingState = { isStreaming: false, targetNodeId: null, buffer: '' }
const initialAutoSaveState = { isDirty: false, lastSaveAt: null, saveStatus: 'idle' as const }

export const usePodcastStore = create<PodcastStoreState>((set, get) => ({
  podcast: null,
  nodes: new Map(),
  selectedPath: [],
  activeNodeId: null,
  streamingState: { ...initialStreamingState },
  autoSaveState: { ...initialAutoSaveState },

  setPodcast: (podcast) => set({ podcast }),

  setNodes: (nodes: PodcastNode[]) => {
    const map = new Map<string, PodcastNode>()
    nodes.forEach(n => map.set(n.id, n))
    set({ nodes: map })
  },

  addNodes: (nodes: PodcastNode[]) => {
    set(state => {
      const newMap = new Map(state.nodes)
      nodes.forEach(n => newMap.set(n.id, n))
      return { nodes: newMap, autoSaveState: { ...state.autoSaveState, isDirty: true } }
    })
  },

  updateNode: (id, updates) => {
    set(state => {
      const newMap = new Map(state.nodes)
      const existing = newMap.get(id)
      if (existing) newMap.set(id, { ...existing, ...updates })
      return { nodes: newMap, autoSaveState: { ...state.autoSaveState, isDirty: true } }
    })
  },

  appendToNodeContent: (id, text) => {
    set(state => {
      const newMap = new Map(state.nodes)
      const existing = newMap.get(id)
      if (existing) {
        newMap.set(id, { ...existing, content: (existing.content || '') + text })
      }
      return { nodes: newMap }
    })
  },

  setActiveNode: (id) => set({ activeNodeId: id }),

  addToPath: (nodeId) => {
    set(state => ({
      selectedPath: [...state.selectedPath, nodeId],
      autoSaveState: { ...state.autoSaveState, isDirty: true },
    }))
  },

  setStreaming: (partial) => {
    set(state => ({ streamingState: { ...state.streamingState, ...partial } }))
  },

  markDirty: () => {
    set(state => ({ autoSaveState: { ...state.autoSaveState, isDirty: true } }))
  },

  setAutoSaveStatus: (status) => {
    set(state => ({
      autoSaveState: { ...state.autoSaveState, saveStatus: status, isDirty: status === 'saved' ? false : state.autoSaveState.isDirty },
    }))
  },

  setLastSaveAt: (date) => {
    set(state => ({ autoSaveState: { ...state.autoSaveState, lastSaveAt: date } }))
  },

  getPathNodes: () => {
    const { nodes, selectedPath } = get()
    return selectedPath.map(id => nodes.get(id)).filter(Boolean) as PodcastNode[]
  },

  getChildNodes: (parentId: string) => {
    const { nodes } = get()
    return Array.from(nodes.values())
      .filter(n => n.parent_id === parentId)
      .sort((a, b) => a.order_index - b.order_index)
  },

  getRootNode: () => {
    const { nodes } = get()
    return Array.from(nodes.values()).find(n => n.node_type === 'root')
  },

  reset: () => set({
    podcast: null,
    nodes: new Map(),
    selectedPath: [],
    activeNodeId: null,
    streamingState: { ...initialStreamingState },
    autoSaveState: { ...initialAutoSaveState },
  }),
}))
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- lib/store/__tests__/podcast-store.test.ts
```
Expected: PASS

**Step 6: Commit**

```bash
git add lib/store/
git commit -m "feat: add Zustand podcast store with state management and tests"
```

---

## Phase 7: Infinite Canvas & UI Components

### Task 13: Custom React Flow Node Components

**Files:**
- Create: `components/canvas/RootNode.tsx`
- Create: `components/canvas/TopicNode.tsx`
- Create: `components/canvas/ContentNode.tsx`
- Create: `components/canvas/EndingNode.tsx`
- Create: `components/canvas/MoreButton.tsx`
- Create: `components/canvas/nodeTypes.ts`

This task creates all 5 custom node types for React Flow. Each node has distinct visual styling and interactions as defined in the design doc. Code is provided in full for each component. Due to the visual nature of these components, testing will be done via manual verification in the browser rather than unit tests.

**Step 1 through Step 6: Create each node component and the nodeTypes registry**

See design doc for visual specifications (colors, sizes, shapes). Implementation details:

- `RootNode`: Blue/indigo, largest, bold border, displays podcast title
- `TopicNode`: Green/teal, medium, shows title + summary + action buttons ("生成演讲稿" / "展开子话题")
- `ContentNode`: Orange/amber, collapsible/expandable, streaming text display, expand button for sub-topics
- `EndingNode`: Red/crimson, dashed border, triggers ending generation
- `MoreButton`: Gray, dashed, triggers loading more topics

**Step 7: Commit**

```bash
git add components/canvas/
git commit -m "feat: add custom React Flow node components for all node types"
```

---

### Task 14: Infinite Canvas Component

**Files:**
- Create: `components/canvas/InfiniteCanvas.tsx`
- Create: `components/canvas/useAutoLayout.ts`

**Key implementation details:**

- Uses `@xyflow/react` ReactFlow component with custom nodeTypes
- `useAutoLayout` hook calculates vertical tree layout:
  - Children placed below parent, 80px vertical gap
  - Content nodes placed to the right of parent
  - Auto-pans to new nodes when generated
  - "More" button at second-to-last position, "Ending" always last
- Dark theme to match overall design
- Canvas controls: zoom, pan, fit view
- Connects to Zustand store for node data

**Step 1: Create auto-layout hook and InfiniteCanvas component**

**Step 2: Verify in browser**

```bash
npm run dev
```
Navigate to studio page, verify canvas renders and interactions work.

**Step 3: Commit**

```bash
git add components/canvas/
git commit -m "feat: add infinite canvas with auto-layout and dark theme"
```

---

### Task 15: Streaming Content Hook

**Files:**
- Create: `lib/hooks/useStreamingGeneration.ts`

**Step 1: Create streaming hook**

This hook handles:
- Calling `/api/generate/content` or `/api/generate/ending`
- Reading SSE stream with `ReadableStreamDefaultReader`
- Updating Zustand store with `appendToNodeContent` on each chunk
- Managing `streamingState` (isStreaming, targetNodeId)
- Error handling and retry logic

**Step 2: Commit**

```bash
git add lib/hooks/
git commit -m "feat: add streaming generation hook with SSE support"
```

---

### Task 16: Topic Generation Hook

**Files:**
- Create: `lib/hooks/useTopicGeneration.ts`

**Step 1: Create topic generation hook**

This hook handles:
- Calling `/api/generate/topics` and `/api/generate/more-topics`
- Adding returned nodes to Zustand store
- Creating "ending" node automatically (fixed at last position)
- Managing loading state

**Step 2: Commit**

```bash
git add lib/hooks/
git commit -m "feat: add topic generation hook"
```

---

## Phase 8: Pages & Integration

### Task 17: Home Page & Layout

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Step 1: Update global layout with dark theme and fonts**
**Step 2: Create landing page with login/register CTAs**
**Step 3: Commit**

```bash
git add app/layout.tsx app/page.tsx app/globals.css
git commit -m "feat: add landing page and dark theme layout"
```

---

### Task 18: Dashboard Page

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `components/dashboard/PodcastCard.tsx`

**Step 1: Create dashboard with podcast list**

- Fetches podcasts from `/api/podcast`
- Shows cards with title, status, last updated, word count
- "New Podcast" button → navigates to `/studio`
- Delete button with confirmation
- Click card → navigates to `/studio/[id]`

**Step 2: Commit**

```bash
git add app/dashboard/ components/dashboard/
git commit -m "feat: add dashboard page with podcast list"
```

---

### Task 19: Studio Page (Topic Input)

**Files:**
- Create: `app/studio/page.tsx`

**Step 1: Create studio entry page**

- Modal/dialog style input for podcast topic
- Input field + "开始创作" button
- On submit: POST `/api/podcast` → redirect to `/studio/[id]`

**Step 2: Commit**

```bash
git add app/studio/page.tsx
git commit -m "feat: add studio entry page with topic input"
```

---

### Task 20: Studio Workspace Page (Main Canvas)

**Files:**
- Create: `app/studio/[podcastId]/page.tsx`
- Create: `components/studio/TopBar.tsx`
- Create: `components/studio/AutoSaveIndicator.tsx`

**Step 1: Create workspace page**

- Loads podcast data from `/api/podcast/[id]`
- Initializes Zustand store with podcast and nodes
- Renders TopBar + InfiniteCanvas
- TopBar contains: title, auto-save indicator, save button, zoom controls

**Step 2: Commit**

```bash
git add app/studio/ components/studio/
git commit -m "feat: add studio workspace page with toolbar and canvas"
```

---

## Phase 9: Auto-Save & Export

### Task 21: Auto-Save Hook

**Files:**
- Create: `lib/hooks/useAutoSave.ts`

**Step 1: Create auto-save hook**

```typescript
// Runs setInterval every 30 seconds
// Checks isDirty flag from Zustand store
// If dirty: serializes nodes + canvas state → PUT /api/podcast/[id]/autosave
// Updates saveStatus and lastSaveAt
// Resets isDirty to false on success
```

**Step 2: Commit**

```bash
git add lib/hooks/useAutoSave.ts
git commit -m "feat: add 30-second auto-save hook"
```

---

### Task 22: Manual Save (Export Markdown)

**Files:**
- Create: `lib/hooks/useExportMarkdown.ts`

**Step 1: Create export hook**

- Collects selectedPath from store
- POST `/api/export/markdown`
- Triggers browser download of `.md` file
- Shows success notification

**Step 2: Commit**

```bash
git add lib/hooks/useExportMarkdown.ts
git commit -m "feat: add Markdown export with download"
```

---

## Phase 10: Polish & Verification

### Task 23: Error Handling & Loading States

**Files:**
- Create: `components/ui/LoadingSpinner.tsx`
- Create: `components/ui/ErrorMessage.tsx`

Add loading spinners, error boundaries, and retry buttons across all generation actions.

**Commit:**

```bash
git add components/ui/
git commit -m "feat: add loading states and error handling UI"
```

---

### Task 24: End-to-End Verification

**Manual testing checklist:**

1. [ ] Register new account
2. [ ] Login with account
3. [ ] Create new podcast with topic
4. [ ] Verify root node appears on canvas
5. [ ] Generate sub-topics (6-8 appear)
6. [ ] Verify "ending" option is last
7. [ ] Click "more" → 5 additional topics appear
8. [ ] Select topic → generate speech script (streaming)
9. [ ] Verify content streams in real-time
10. [ ] Collapse/expand content node
11. [ ] Generate sub-topics from content node
12. [ ] Generate ending → verify summary content
13. [ ] Auto-save triggers after 30 seconds
14. [ ] Manual save → download Markdown file
15. [ ] Verify Markdown content is complete path
16. [ ] Refresh page → data persists
17. [ ] Dashboard shows podcast in list
18. [ ] Delete podcast from dashboard
19. [ ] Logout → redirected to login

**Commit final state:**

```bash
git add -A
git commit -m "feat: complete Perpetua MVP with all core features"
```
