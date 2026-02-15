interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-[1.5px]',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-3 text-gray-400">
      <span
        className={`inline-block animate-spin rounded-full border-gray-600 border-t-white ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      />
      {text && <span className="text-sm">{text}</span>}
    </div>
  )
}
