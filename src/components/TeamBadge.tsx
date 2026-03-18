import { getTeamByConstructorId } from '@/utils'

interface TeamBadgeProps {
  constructorId: string
  showName?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function TeamBadge({ constructorId, showName = true, size = 'md' }: TeamBadgeProps) {
  const team = getTeamByConstructorId(constructorId)

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  }

  const color = team?.color ?? '#6b7280'
  const name = team?.shortName ?? constructorId

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-semibold ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="w-2 h-2 rounded-sm flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {showName && name}
    </span>
  )
}
