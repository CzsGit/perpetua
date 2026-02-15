'use client'

import { useRouter } from 'next/navigation'
import type { Podcast } from '@/lib/supabase/types'

interface PodcastCardProps {
  podcast: Podcast
  onDelete: (id: string) => void
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diff = now - date

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return new Date(dateString).toLocaleDateString('zh-CN')
}

export default function PodcastCard({ podcast, onDelete }: PodcastCardProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/studio/${podcast.id}`)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个播客吗？此操作不可撤销。')) {
      onDelete(podcast.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700 hover:bg-gray-800/80"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-base font-semibold text-white line-clamp-2">
          {podcast.title}
        </h3>
        <button
          onClick={handleDelete}
          className="ml-2 shrink-0 rounded-md px-2 py-1 text-xs text-red-400 opacity-0 transition-opacity hover:bg-red-400/10 group-hover:opacity-100"
        >
          删除
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            podcast.status === 'completed'
              ? 'bg-green-400/10 text-green-400'
              : 'bg-yellow-400/10 text-yellow-400'
          }`}
        >
          {podcast.status === 'completed' ? '已完成' : '草稿'}
        </span>
        <span className="text-xs text-gray-500">
          {formatRelativeTime(podcast.updated_at)}
        </span>
      </div>
    </div>
  )
}
