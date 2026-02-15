'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePodcastStore } from '@/lib/store/podcast-store'

/**
 * Auto-save hook that monitors dirty state and saves changes.
 * Uses a 30-second interval that checks if changes are pending,
 * plus an immediate debounced save 3 seconds after each mutation.
 */
export function useAutoSave(podcastId: string | null) {
  const nodes = usePodcastStore((s) => s.nodes)
  const autoSaveState = usePodcastStore((s) => s.autoSaveState)
  const setAutoSaveStatus = usePodcastStore((s) => s.setAutoSaveStatus)
  const setLastSaveAt = usePodcastStore((s) => s.setLastSaveAt)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const performSave = useCallback(async () => {
    if (!podcastId || !usePodcastStore.getState().autoSaveState.isDirty) return

    setAutoSaveStatus('saving')
    try {
      const allNodes = Array.from(usePodcastStore.getState().nodes.values())
      const res = await fetch(`/api/podcast/${podcastId}/autosave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: allNodes,
          canvasState: {},
        }),
      })
      if (res.ok) {
        setAutoSaveStatus('saved')
        setLastSaveAt(new Date())
      } else {
        setAutoSaveStatus('error')
      }
    } catch {
      setAutoSaveStatus('error')
    }
  }, [podcastId, setAutoSaveStatus, setLastSaveAt])

  // Debounced save: triggers 3 seconds after the store becomes dirty
  useEffect(() => {
    if (autoSaveState.isDirty) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(performSave, 3000)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [autoSaveState.isDirty, nodes, performSave])

  // Periodic save: every 30 seconds as a safety net
  useEffect(() => {
    const interval = setInterval(performSave, 30000)
    return () => clearInterval(interval)
  }, [performSave])

  return { performSave, saveStatus: autoSaveState.saveStatus }
}
