'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

type EndingNodeData = {
  title: string
  content: string | null
  isStreaming: boolean
  onGenerateEnding: () => void
}

function EndingNode({ data }: NodeProps) {
  const { title, content, isStreaming, onGenerateEnding } =
    data as unknown as EndingNodeData

  const hasContent = !!content
  const preview = content
    ? content.slice(0, 20) + (content.length > 20 ? '...' : '')
    : null

  return (
    <div className="w-[240px] rounded-xl border-2 border-dashed border-red-400 bg-red-700 px-4 py-3 shadow-lg shadow-red-500/20">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-red-300 !bg-red-100"
      />
      <span className="mb-0.5 block text-xs font-medium uppercase tracking-wider text-red-200">
        结束语
      </span>
      <h3 className="text-sm font-bold leading-snug text-white">
        {title || '结束语'}
      </h3>

      {!hasContent && !isStreaming && (
        <button
          onClick={onGenerateEnding}
          className="mt-2 w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500"
        >
          生成结束语
        </button>
      )}

      {isStreaming && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-red-100">
          <span className="inline-block h-3 w-1.5 animate-pulse bg-white" />
          <span>生成中...</span>
        </div>
      )}

      {hasContent && !isStreaming && preview && (
        <p className="mt-1 cursor-pointer text-xs text-red-100/80">{preview}</p>
      )}
    </div>
  )
}

export default EndingNode
