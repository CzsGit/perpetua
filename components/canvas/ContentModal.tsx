'use client'

import { useCallback, useMemo } from 'react'
import { usePodcastStore } from '@/lib/store/podcast-store'

interface ContentModalProps {
  onExpandTopics: (parentNodeId: string) => void
  onGenerateEnding: (nodeId: string) => void
}

interface DialogueLine {
  speaker: 'host' | 'cohost' | 'narration'
  name: string
  text: string
}

function parseDialogueContent(
  content: string,
  hostName: string,
  coHostName: string
): DialogueLine[] {
  const lines: DialogueLine[] = []
  const rawLines = content.split('\n')

  for (const line of rawLines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith(hostName + '：') || trimmed.startsWith(hostName + ':')) {
      const sep = trimmed.indexOf('：') !== -1 ? '：' : ':'
      lines.push({
        speaker: 'host',
        name: hostName,
        text: trimmed.slice(trimmed.indexOf(sep) + 1).trim(),
      })
    } else if (trimmed.startsWith(coHostName + '：') || trimmed.startsWith(coHostName + ':')) {
      const sep = trimmed.indexOf('：') !== -1 ? '：' : ':'
      lines.push({
        speaker: 'cohost',
        name: coHostName,
        text: trimmed.slice(trimmed.indexOf(sep) + 1).trim(),
      })
    } else {
      // Append to previous line if it's continuation, or treat as narration
      if (lines.length > 0) {
        lines[lines.length - 1].text += '\n' + trimmed
      } else {
        lines.push({ speaker: 'narration', name: '', text: trimmed })
      }
    }
  }

  return lines
}

const speakerStyles = {
  host: {
    badge: 'bg-indigo-500/20 text-indigo-300',
    border: 'border-l-indigo-500/40',
  },
  cohost: {
    badge: 'bg-teal-500/20 text-teal-300',
    border: 'border-l-teal-500/40',
  },
  narration: {
    badge: '',
    border: 'border-l-gray-600/40',
  },
}

export default function ContentModal({
  onExpandTopics,
  onGenerateEnding,
}: ContentModalProps) {
  const activeNodeId = usePodcastStore((s) => s.activeNodeId)
  const nodes = usePodcastStore((s) => s.nodes)
  const podcast = usePodcastStore((s) => s.podcast)
  const setActiveNode = usePodcastStore((s) => s.setActiveNode)

  const node = activeNodeId ? nodes.get(activeNodeId) : null

  const isDialogue = podcast?.script_style === 'dialogue'
  const hostName = podcast?.host_name || '主播'
  const coHostName = podcast?.co_host_name || '搭档'

  const dialogueLines = useMemo(() => {
    if (!isDialogue || !node?.content) return null
    return parseDialogueContent(node.content, hostName, coHostName)
  }, [isDialogue, node?.content, hostName, coHostName])

  const handleClose = useCallback(() => {
    setActiveNode(null)
  }, [setActiveNode])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose()
      }
    },
    [handleClose]
  )

  const handleExpandTopics = useCallback(() => {
    if (!activeNodeId) return
    handleClose()
    onExpandTopics(activeNodeId)
  }, [activeNodeId, handleClose, onExpandTopics])

  const handleGenerateEnding = useCallback(() => {
    if (!activeNodeId) return
    handleClose()
    onGenerateEnding(activeNodeId)
  }, [activeNodeId, handleClose, onGenerateEnding])

  // Only show modal for content/ending nodes that have been clicked
  if (!node || (node.node_type !== 'content' && node.node_type !== 'ending')) {
    return null
  }

  const isContent = node.node_type === 'content'
  const isEnding = node.node_type === 'ending'
  const hasContent = !!node.content

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="mx-4 flex max-h-[80vh] w-full max-w-[640px] flex-col rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className={`flex items-center justify-between border-b border-gray-700 px-6 py-4 ${
          isContent ? 'bg-amber-600/10' : 'bg-red-600/10'
        }`}>
          <div>
            {isEnding && (
              <span className="mb-0.5 block text-xs font-medium uppercase tracking-wider text-red-400">
                结束语
              </span>
            )}
            <h2 className="text-lg font-bold text-white">{node.title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {hasContent ? (
            isDialogue && dialogueLines ? (
              <div className="space-y-3">
                {dialogueLines.map((line, i) => {
                  const styles = speakerStyles[line.speaker]
                  return (
                    <div key={i} className={`border-l-2 pl-3 ${styles.border}`}>
                      {line.speaker !== 'narration' && (
                        <span className={`mb-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${styles.badge}`}>
                          {line.name}
                        </span>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                        {line.text}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {node.content}
              </p>
            )
          ) : (
            <p className="text-sm text-gray-500">暂无内容</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-700 px-6 py-4">
          {isContent && (
            <button
              onClick={handleExpandTopics}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-400"
            >
              基于此内容展开子话题
            </button>
          )}
          {isEnding && !hasContent && (
            <button
              onClick={handleGenerateEnding}
              className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500"
            >
              生成结束语
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
