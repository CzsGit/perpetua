'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ScriptStyle } from '@/lib/supabase/types'

export default function StudioPage() {
  const [topic, setTopic] = useState('')
  const [scriptStyle, setScriptStyle] = useState<ScriptStyle>('dialogue')
  const [hostName, setHostName] = useState('')
  const [coHostName, setCoHostName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = topic.trim()
    if (!trimmed) return

    const finalHostName = hostName.trim() || '主播'
    const finalCoHostName = scriptStyle === 'dialogue' ? (coHostName.trim() || '搭档') : null

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmed,
          rootTopic: trimmed,
          scriptStyle,
          hostName: finalHostName,
          coHostName: finalCoHostName,
        }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/login')
          return
        }
        throw new Error('Failed to create podcast')
      }

      const data = await res.json()
      router.push(`/studio/${data.podcast.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6">
      <div className="w-full max-w-lg">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-300"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          返回仪表盘
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <h1 className="mb-2 text-2xl font-bold text-white">创建新播客</h1>
          <p className="mb-6 text-sm text-gray-400">
            输入一个你感兴趣的主题，AI 将帮你生成播客内容
          </p>

          <form onSubmit={handleSubmit}>
            {/* Topic input */}
            <div className="mb-5">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入你今天想聊的主题，例如：金字塔之谜"
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                disabled={loading}
              />
            </div>

            {/* Script style selection */}
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-gray-300">
                脚本风格
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setScriptStyle('dialogue')}
                  disabled={loading}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    scriptStyle === 'dialogue'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="mb-1 text-sm font-medium text-white">
                    双人对话
                  </div>
                  <div className="text-xs text-gray-400">
                    两人一唱一和，搭档替听众提问和反应
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setScriptStyle('monologue')}
                  disabled={loading}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    scriptStyle === 'monologue'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="mb-1 text-sm font-medium text-white">
                    单人独白
                  </div>
                  <div className="text-xs text-gray-400">
                    一个人深度讲述，悬念递进
                  </div>
                </button>
              </div>
            </div>

            {/* Host names */}
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-gray-300">
                角色设置
              </label>
              <div className={`grid gap-3 ${scriptStyle === 'dialogue' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder={scriptStyle === 'dialogue' ? '主讲人名字，如：老高' : '主播名字，如：老高'}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  disabled={loading}
                />
                {scriptStyle === 'dialogue' && (
                  <input
                    type="text"
                    value={coHostName}
                    onChange={(e) => setCoHostName(e.target.value)}
                    placeholder="搭档名字，如：小茉"
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    disabled={loading}
                  />
                )}
              </div>
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  创建中...
                </span>
              ) : (
                '开始创作'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
