'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

type TopicNodeData = {
  title: string
  summary?: string
  onExpandTopics: () => void
  onGenerateContent: () => void
}

function TopicNode({ data }: NodeProps) {
  const { title, summary, onExpandTopics, onGenerateContent } = data as unknown as TopicNodeData

  return (
    <div className="min-w-[240px] rounded-xl border-2 border-teal-400 bg-teal-600 px-4 py-3 shadow-lg shadow-teal-500/20">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-teal-300 !bg-teal-100"
      />
      <div className="mb-2">
        <h3 className="text-sm font-bold leading-snug text-white">
          {title}
        </h3>
        {summary && (
          <p className="mt-1 text-xs leading-relaxed text-teal-100/80">
            {summary}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onExpandTopics}
          className="flex-1 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-400"
        >
          展开子话题
        </button>
        <button
          onClick={onGenerateContent}
          className="flex-1 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25"
        >
          生成演讲稿
        </button>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-teal-300 !bg-teal-100"
      />
    </div>
  )
}

export default TopicNode
