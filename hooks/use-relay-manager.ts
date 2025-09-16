// hooks/use-relay-manager.ts

import { useState, useEffect, useCallback } from 'react'
import { RelayManager, RelayInfo, RelayConnectionStatus } from '@/lib/relay-config'

interface RelayStats {
  total: number
  enabled: number
  connected: number
  connecting: number
  failed: number
}

interface UseRelayManagerReturn {
  // Relay data
  relays: RelayInfo[]
  enabledRelays: RelayInfo[]
  readRelays: RelayInfo[]
  writeRelays: RelayInfo[]
  
  // Connection status
  connectionStatuses: RelayConnectionStatus[]
  stats: RelayStats
  
  // Actions
  updateRelay: (url: string, updates: Partial<RelayInfo>) => boolean
  addRelay: (relay: Omit<RelayInfo, 'priority'>) => boolean
  removeRelay: (url: string) => boolean
  resetToDefaults: () => void
  addRegionalRelays: (region: string) => boolean
  
  // Testing
  testRelay: (url: string) => Promise<{
    success: boolean
    responseTime?: number
    error?: string
  }>
  testAllRelays: () => Promise<void>
  isTestingAll: boolean
  
  // Utilities
  getRecommendedRelays: (maxCount?: number) => RelayInfo[]
  refreshStats: () => void
}

export function useRelayManager(userPubkey?: string): UseRelayManagerReturn {
  const [relayManager] = useState(() => RelayManager.getInstance())
  const [relays, setRelays] = useState<RelayInfo[]>([])
  const [connectionStatuses, setConnectionStatuses] = useState<RelayConnectionStatus[]>([])
  const [stats, setStats] = useState<RelayStats>({
    total: 0,
    enabled: 0,
    connected: 0,
    connecting: 0,
    failed: 0
  })
  const [isTestingAll, setIsTestingAll] = useState(false)

  // Update user context when pubkey changes
  useEffect(() => {
    relayManager.setUser(userPubkey)
    refreshData()
  }, [userPubkey])

  // Refresh all data
  const refreshData = useCallback(() => {
    setRelays(relayManager.getRelays())
    setConnectionStatuses(relayManager.getAllConnectionStatuses())
    setStats(relayManager.getRelayStats())
  }, [relayManager])

  // Refresh stats only
  const refreshStats = useCallback(() => {
    setStats(relayManager.getRelayStats())
    setConnectionStatuses(relayManager.getAllConnectionStatuses())
  }, [relayManager])

  // Initial load
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Derived data
  const enabledRelays = relays.filter(r => r.enabled)
  const readRelays = relays.filter(r => r.enabled && r.read)
  const writeRelays = relays.filter(r => r.enabled && r.write)

  // Actions
  const updateRelay = useCallback((url: string, updates: Partial<RelayInfo>) => {
    const success = relayManager.updateRelay(url, updates)
    if (success) {
      refreshData()
    }
    return success
  }, [relayManager, refreshData])

  const addRelay = useCallback((relay: Omit<RelayInfo, 'priority'>) => {
    const success = relayManager.addRelay(relay)
    if (success) {
      refreshData()
    }
    return success
  }, [relayManager, refreshData])

  const removeRelay = useCallback((url: string) => {
    const success = relayManager.removeRelay(url)
    if (success) {
      refreshData()
    }
    return success
  }, [relayManager, refreshData])

  const resetToDefaults = useCallback(() => {
    relayManager.resetToDefaults()
    refreshData()
  }, [relayManager, refreshData])

  const addRegionalRelays = useCallback((region: string) => {
    const success = relayManager.addRegionalRelays(region as any)
    if (success) {
      refreshData()
    }
    return success
  }, [relayManager, refreshData])

  const testRelay = useCallback(async (url: string) => {
    const result = await relayManager.testRelay(url)
    refreshStats() // Refresh to get updated connection status
    return result
  }, [relayManager, refreshStats])

  const testAllRelays = useCallback(async () => {
    setIsTestingAll(true)
    try {
      await relayManager.testAllRelays()
      refreshData() // Full refresh after testing all
    } finally {
      setIsTestingAll(false)
    }
  }, [relayManager, refreshData])

  const getRecommendedRelays = useCallback((maxCount?: number) => {
    return relayManager.getRecommendedRelays(maxCount)
  }, [relayManager])

  return {
    // Data
    relays,
    enabledRelays,
    readRelays,
    writeRelays,
    
    // Status
    connectionStatuses,
    stats,
    
    // Actions
    updateRelay,
    addRelay,
    removeRelay,
    resetToDefaults,
    addRegionalRelays,
    
    // Testing
    testRelay,
    testAllRelays,
    isTestingAll,
    
    // Utilities
    getRecommendedRelays,
    refreshStats
  }
}
