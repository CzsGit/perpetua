'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

type RootNodeData = {
  title: string
  onExpandTopics: () => void
  onGenerateContent: () => void
}

function RootNode({ data }: NodeProps) {
  const { title, onExpandTopics, onGenerateContent } = data as unknown as RootNodeData

  return (
    <div className="min-w-[280px] rounded-xl border-2 border-indigo-400 bg-indigo-600 px-5 py-4 shadow-lg shadow-indigo-500/20">
      <div className="mb-3 text-center">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-indigo-200">
          Root Topic
        </span>
        <h2 className="text-lg font-bold leading-snug text-white">
          {title}
        </h2>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onExpandTopics}
          className="flex-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-400"
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
        className="!h-3 !w-3 !border-2 !border-indigo-300 !bg-indigo-100"
      />
    </div>
  )
}

export default RootNode
