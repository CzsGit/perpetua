'use client'

import { useState, useCallback } from 'react'
import { usePodcastStore } from '@/lib/store/podcast-store'

/**
 * Hook for exporting the current podcast (or selected path) as a Markdown file.
 * Calls the export API and triggers a browser download.
 */
export function useExportMarkdown() {
  const [isExporting, setIsExporting] = useState(false)
  const podcast = usePodcastStore((s) => s.podcast)
  const selectedPath = usePodcastStore((s) => s.selectedPath)
  const nodes = usePodcastStore((s) => s.nodes)

  const exportMarkdown = useCallback(async () => {
    if (!podcast) return

    setIsExporting(true)
    try {
      const pathNodeIds =
        selectedPath.length > 0
          ? selectedPath
          : Array.from(nodes.values()).map((n) => n.id)

      const res = await fetch('/api/export/markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastId: podcast.id,
          pathNodeIds,
        }),
      })

      if (!res.ok) throw new Error('Export failed')

      const data = await res.json()

      // Trigger browser download
      const blob = new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${podcast.title}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('导出失败，请重试')
    } finally {
      setIsExporting(false)
    }
  }, [podcast, selectedPath, nodes])

  return { exportMarkdown, isExporting }
}
