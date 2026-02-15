'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PodcastCard from '@/components/dashboard/PodcastCard'
import type { Podcast } from '@/lib/supabase/types'

export default function DashboardPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchPodcasts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchPodcasts() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/podcast')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/auth/login')
          return
        }
        throw new Error('Failed to fetch podcasts')
      }
      const data = await res.json()
      setPodcasts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/podcast/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setPodcasts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('删除失败，请重试')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-white">我的播客</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/studio"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              新建播客
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-white"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-gray-400">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
              <span>加载中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="mb-4 text-red-400">{error}</p>
            <button
              onClick={fetchPodcasts}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              重试
            </button>
          </div>
        ) : podcasts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="mb-2 text-lg text-gray-400">
              还没有播客，开始创作第一个吧！
            </p>
            <p className="mb-6 text-sm text-gray-600">
              点击下方按钮，输入一个主题即可开始
            </p>
            <Link
              href="/studio"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              开始创作
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {podcasts.map((podcast) => (
              <PodcastCard
                key={podcast.id}
                podcast={podcast}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
