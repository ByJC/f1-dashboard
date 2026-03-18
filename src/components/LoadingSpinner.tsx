export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-600 animate-spin"
          style={{ animationDuration: '0.8s' }}
        />
      </div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  )
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="text-4xl">⚠️</div>
      <p className="text-red-400 font-semibold">Failed to load data</p>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  )
}
