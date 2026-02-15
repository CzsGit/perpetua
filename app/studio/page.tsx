'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function StudioPage() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = topic.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed, rootTopic: trimmed }),
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
            <div className="mb-4">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入你今天想聊的主题，例如：金字塔之谜"
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                disabled={loading}
              />
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
