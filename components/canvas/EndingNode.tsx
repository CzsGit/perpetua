'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

type EndingNodeData = {
  title: string
  content: string | null
  isExpanded: boolean
  isStreaming: boolean
  onGenerateEnding: () => void
  onToggleExpand: () => void
}

function EndingNode({ data }: NodeProps) {
  const { title, content, isExpanded, isStreaming, onGenerateEnding, onToggleExpand } =
    data as unknown as EndingNodeData

  const hasContent = !!content

  return (
    <div className="min-w-[240px] rounded-xl border-2 border-dashed border-red-400 bg-red-700 px-4 py-3 shadow-lg shadow-red-500/20">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-red-300 !bg-red-100"
      />
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <span className="mb-0.5 block text-xs font-medium uppercase tracking-wider text-red-200">
            结束语
          </span>
          <h3 className="text-sm font-bold leading-snug text-white">
            {title || '结束语'}
          </h3>
        </div>
        {hasContent && (
          <button
            onClick={onToggleExpand}
            className="shrink-0 rounded-md bg-white/15 px-2 py-1 text-xs text-white transition-colors hover:bg-white/25"
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        )}
      </div>

      {!hasContent && !isStreaming && (
        <button
          onClick={onGenerateEnding}
          className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500"
        >
          生成结束语
        </button>
      )}

      {(hasContent || isStreaming) && isExpanded && (
        <div className="max-h-[300px] overflow-y-auto rounded-lg bg-black/20 p-3">
          {content ? (
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-red-50">
              {content}
              {isStreaming && (
                <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-white" />
              )}
            </p>
          ) : isStreaming ? (
            <div className="flex items-center gap-2 text-xs text-red-100">
              <span className="inline-block h-3 w-1.5 animate-pulse bg-white" />
              <span>生成中...</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default EndingNode
