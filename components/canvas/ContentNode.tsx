'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

type ContentNodeData = {
  title: string
  content: string | null
  isStreaming: boolean
}

function ContentNode({ data }: NodeProps) {
  const { title, content, isStreaming } = data as unknown as ContentNodeData

  const preview = content
    ? content.slice(0, 20) + (content.length > 20 ? '...' : '')
    : null

  return (
    <div className="w-[240px] cursor-pointer rounded-xl border-2 border-amber-400 bg-amber-600 px-4 py-3 shadow-lg shadow-amber-500/20 transition-all duration-200 hover:border-amber-300 hover:shadow-amber-500/30">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-amber-300 !bg-amber-100"
      />
      <h3 className="text-sm font-bold leading-snug text-white">{title}</h3>
      {isStreaming ? (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-100">
          <span className="inline-block h-3 w-1.5 animate-pulse bg-white" />
          <span>生成中...</span>
        </div>
      ) : preview ? (
        <p className="mt-1 text-xs text-amber-100/80">{preview}</p>
      ) : (
        <p className="mt-1 text-xs text-amber-200/60">暂无内容</p>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-amber-300 !bg-amber-100"
      />
    </div>
  )
}

export default ContentNode
