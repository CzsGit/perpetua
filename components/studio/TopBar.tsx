'use client'

import Link from 'next/link'
import { usePodcastStore } from '@/lib/store/podcast-store'
import AutoSaveIndicator from './AutoSaveIndicator'

interface TopBarProps {
  onExportMarkdown: () => void
  isExporting: boolean
}

export default function TopBar({ onExportMarkdown, isExporting }: TopBarProps) {
  const podcast = usePodcastStore((s) => s.podcast)

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-4">
      {/* Left: podcast title */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          title="返回仪表盘"
        >
          <svg
            className="h-5 w-5"
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
        </Link>
        <h1 className="max-w-[200px] truncate text-sm font-semibold text-white sm:max-w-[400px]">
          {podcast?.title || '加载中...'}
        </h1>
      </div>

      {/* Center: auto-save indicator */}
      <div className="hidden sm:block">
        <AutoSaveIndicator />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExportMarkdown}
          disabled={isExporting}
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? '导出中...' : '保存为 Markdown'}
        </button>
      </div>
    </div>
  )
}
