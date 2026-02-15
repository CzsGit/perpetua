interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export default function ErrorMessage({ message, onRetry, retryLabel = '重试' }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}
