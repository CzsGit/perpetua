'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

type MoreButtonData = {
  onLoadMore: () => void
  isLoading: boolean
}

function MoreButton({ data }: NodeProps) {
  const { onLoadMore, isLoading } = data as unknown as MoreButtonData

  return (
    <div className="min-w-[160px] rounded-xl border-2 border-dashed border-gray-500 bg-gray-700 px-4 py-3 shadow-md">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-gray-400 !bg-gray-200"
      />
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-600 px-3 py-2 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-white" />
            <span>加载中...</span>
          </>
        ) : (
          <>
            <span className="text-base leading-none">+</span>
            <span>加载更多...</span>
          </>
        )}
      </button>
    </div>
  )
}

export default MoreButton
