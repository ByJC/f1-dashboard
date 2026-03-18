import { getDriverByCode, getDriver } from '@/utils'

interface DriverChipProps {
  driverId?: string
  code?: string
  showName?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function DriverChip({ driverId, code, showName = false, size = 'md' }: DriverChipProps) {
  const driver = driverId ? getDriver(driverId) : code ? getDriverByCode(code) : undefined

  if (!driver) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-gray-800 text-gray-400">
        {code ?? driverId ?? '???'}
      </span>
    )
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-bold ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${driver.color}20`,
        color: driver.color,
        border: `1px solid ${driver.color}40`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: driver.color }}
      />
      {driver.code}
      {showName && (
        <span className="font-normal text-gray-300 ml-1">
          {driver.firstName} {driver.lastName}
        </span>
      )}
    </span>
  )
}
