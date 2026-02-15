'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

type ContentNodeData = {
  title: string
  content: string | null
  isExpanded: boolean
  isStreaming: boolean
  onToggleExpand: () => void
  onExpandTopics: () => void
}

function ContentNode({ data }: NodeProps) {
  const { title, content, isExpanded, isStreaming, onToggleExpand, onExpandTopics } =
    data as unknown as ContentNodeData

  return (
    <div
      className={`rounded-xl border-2 border-amber-400 bg-amber-600 shadow-lg shadow-amber-500/20 transition-all duration-200 ${
        isExpanded ? 'w-[600px]' : 'min-w-[240px]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-amber-300 !bg-amber-100"
      />
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold leading-snug text-white">
            {title}
          </h3>
          <button
            onClick={onToggleExpand}
            className="shrink-0 rounded-md bg-white/15 px-2 py-1 text-xs text-white transition-colors hover:bg-white/25"
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>

        {isExpanded && (
          <>
            <div className="mb-2 max-h-[400px] overflow-y-auto rounded-lg bg-black/20 p-3">
              {content ? (
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-amber-50">
                  {content}
                  {isStreaming && (
                    <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-white" />
                  )}
                </p>
              ) : isStreaming ? (
                <div className="flex items-center gap-2 text-xs text-amber-100">
                  <span className="inline-block h-3 w-1.5 animate-pulse bg-white" />
                  <span>生成中...</span>
                </div>
              ) : (
                <p className="text-xs text-amber-200/60">暂无内容</p>
              )}
            </div>
            <button
              onClick={onExpandTopics}
              className="w-full rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-400"
            >
              基于此内容展开子话题
            </button>
          </>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-amber-300 !bg-amber-100"
      />
    </div>
  )
}

export default ContentNode
