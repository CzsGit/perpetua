'use client'

import { usePodcastStore } from '@/lib/store/podcast-store'

export default function AutoSaveIndicator() {
  const autoSaveState = usePodcastStore((s) => s.autoSaveState)

  const { saveStatus, isDirty } = autoSaveState

  if (saveStatus === 'saving') {
    return (
      <span className="text-xs text-yellow-400">
        保存中...
      </span>
    )
  }

  if (isDirty) {
    return (
      <span className="text-xs text-orange-400">
        未保存更改
      </span>
    )
  }

  if (saveStatus === 'saved') {
    return (
      <span className="text-xs text-gray-500">
        已自动保存
      </span>
    )
  }

  if (saveStatus === 'error') {
    return (
      <span className="text-xs text-red-400">
        保存失败
      </span>
    )
  }

  return (
    <span className="text-xs text-gray-600">
      已自动保存
    </span>
  )
}
