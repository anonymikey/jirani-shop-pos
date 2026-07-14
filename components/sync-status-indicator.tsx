'use client'

import { useOfflineSync } from '@/hooks/useOfflineSync'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react'

interface SyncStatusIndicatorProps {
  shopId: string
  showStats?: boolean
}

/**
 * Sync Status Indicator Component
 * Displays current sync status and pending queue items
 * Always visible in header/footer to show connection state
 */
export function SyncStatusIndicator({ shopId, showStats = false }: SyncStatusIndicatorProps) {
  const { isOnline, syncStatus, stats } = useOfflineSync(shopId)

  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'online':
        return {
          label: 'Online',
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          icon: Wifi,
        }
      case 'offline':
        return {
          label: 'Offline',
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          icon: WifiOff,
        }
      case 'syncing':
        return {
          label: 'Syncing',
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          icon: Loader2,
        }
      case 'sync-failed':
        return {
          label: 'Sync Failed',
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          icon: AlertCircle,
        }
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          icon: WifiOff,
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}>
      <Icon className={`w-4 h-4 ${config.textColor} ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
      <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
      {showStats && stats.pending > 0 && (
        <Badge variant="secondary" className="ml-1 text-xs">
          {stats.pending} pending
        </Badge>
      )}
    </div>
  )
}
