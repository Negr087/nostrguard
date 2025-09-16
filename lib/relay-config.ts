// lib/relay-config.ts

export interface RelayInfo {
  url: string
  name: string
  description?: string
  read: boolean
  write: boolean
  enabled: boolean
  priority: number // 1 = highest priority
  lastConnected?: number
  connectionCount?: number
  errorCount?: number
  avgResponseTime?: number
  region?: string
  operator?: string
  fees?: {
    admission?: number
    publication?: number
  }
}

export interface RelayConnectionStatus {
  url: string
  connected: boolean
  connecting: boolean
  error?: string
  lastAttempt?: number
  nextRetry?: number
}

/**
 * Default relay configuration with popular, reliable Nostr relays
 */
export const DEFAULT_RELAYS: RelayInfo[] = [
  // High priority - Most reliable
  {
    url: "wss://relay.damus.io",
    name: "Damus",
    description: "Popular iOS client relay",
    read: true,
    write: true,
    enabled: true,
    priority: 1,
    region: "Global",
    operator: "Damus"
  },
  {
    url: "wss://nos.lol",
    name: "nos.lol",
    description: "Reliable general purpose relay",
    read: true,
    write: true,
    enabled: true,
    priority: 1,
    region: "Global"
  },
  
  // Medium priority - Good alternatives
  {
    url: "wss://relay.nostr.band",
    name: "Nostr Band",
    description: "Analytics and search relay",
    read: true,
    write: true,
    enabled: true,
    priority: 3,
    region: "Global",
    operator: "Nostr Band"
  },
  {
    url: "wss://offchain.pub",
    name: "Offchain",
    description: "Bitcoin focused relay",
    read: true,
    write: true,
    enabled: true,
    priority: 3,
    region: "Global"
  },
  {
    url: "wss://relay.current.fyi",
    name: "Current",
    description: "Music focused relay",
    read: true,
    write: false, // Read-only for this use case
    enabled: true,
    priority: 4,
    region: "Global",
    operator: "Current"
  },

  // Lower priority - Backup options
  {
    url: "wss://brb.io",
    name: "BRB",
    description: "Community relay",
    read: true,
    write: true,
    enabled: false, // Disabled by default
    priority: 5,
    region: "Global"
  },
  {
    url: "wss://relay.nostr.info",
    name: "Nostr Info",
    description: "Information relay",
    read: true,
    write: true,
    enabled: false,
    priority: 5,
    region: "Global"
  }
]

/**
 * Regional relay configurations for better performance
 */
export const REGIONAL_RELAYS: Record<string, RelayInfo[]> = {
  "north-america": [
    {
      url: "wss://nostr.wine",
      name: "Nostr Wine",
      description: "North American relay",
      read: true,
      write: true,
      enabled: true,
      priority: 2,
      region: "North America"
    },
    {
      url: "wss://eden.nostr.land",
      name: "Eden",
      description: "Canadian relay",
      read: true,
      write: true,
      enabled: true,
      priority: 3,
      region: "North America"
    }
  ],
  "europe": [
    {
      url: "wss://relay.orangepill.dev",
      name: "Orange Pill",
      description: "European relay",
      read: true,
      write: true,
      enabled: true,
      priority: 2,
      region: "Europe"
    },
    {
      url: "wss://relay.nostrich.de",
      name: "Nostrich",
      description: "German relay",
      read: true,
      write: true,
      enabled: true,
      priority: 3,
      region: "Europe"
    }
  ],
  "asia": [
    {
      url: "wss://relay-jp.nostr.wirednet.jp",
      name: "WiredNet JP",
      description: "Japanese relay",
      read: true,
      write: true,
      enabled: true,
      priority: 2,
      region: "Asia"
    }
  ]
}

export class RelayManager {
  private static instance: RelayManager
  private relays: RelayInfo[] = []
  private connectionStatuses: Map<string, RelayConnectionStatus> = new Map()
  private userPubkey?: string

  private constructor() {
    this.loadConfiguration()
  }

  static getInstance(): RelayManager {
    if (!RelayManager.instance) {
      RelayManager.instance = new RelayManager()
    }
    return RelayManager.instance
  }

  /**
   * Load relay configuration from localStorage or use defaults
   */
  private loadConfiguration() {
    if (typeof window === "undefined") {
      this.relays = [...DEFAULT_RELAYS]
      return
    }

    try {
      const stored = localStorage.getItem("relay-config")
      if (stored) {
        const config = JSON.parse(stored)
        this.relays = config.relays || DEFAULT_RELAYS
        this.userPubkey = config.userPubkey
      } else {
        this.relays = [...DEFAULT_RELAYS]
      }
    } catch (error) {
      console.error("[RelayManager] Error loading configuration:", error)
      this.relays = [...DEFAULT_RELAYS]
    }
  }

  /**
   * Save current configuration to localStorage
   */
  private saveConfiguration() {
    if (typeof window === "undefined") return

    try {
      const config = {
        relays: this.relays,
        userPubkey: this.userPubkey,
        lastUpdated: Date.now()
      }
      localStorage.setItem("relay-config", JSON.stringify(config))
    } catch (error) {
      console.error("[RelayManager] Error saving configuration:", error)
    }
  }

  /**
   * Set user context for personalized relay configuration
   */
  setUser(pubkey: string | undefined) {
    this.userPubkey = pubkey
    if (pubkey) {
      this.loadUserRelays(pubkey)
    }
    this.saveConfiguration()
  }

  /**
   * Load user-specific relay configuration
   */
  private loadUserRelays(pubkey: string) {
    try {
      const userKey = `relay-config-${pubkey.slice(-8)}`
      const stored = localStorage.getItem(userKey)
      if (stored) {
        const userRelays = JSON.parse(stored)
        // Merge user preferences with defaults
        this.relays = this.mergeRelayConfigs(DEFAULT_RELAYS, userRelays)
      }
    } catch (error) {
      console.error("[RelayManager] Error loading user relays:", error)
    }
  }

  /**
   * Merge user relay preferences with defaults
   */
  private mergeRelayConfigs(defaults: RelayInfo[], userPrefs: RelayInfo[]): RelayInfo[] {
    const merged = [...defaults]
    
    userPrefs.forEach(userRelay => {
      const existingIndex = merged.findIndex(r => r.url === userRelay.url)
      if (existingIndex >= 0) {
        // Update existing relay with user preferences
        merged[existingIndex] = { ...merged[existingIndex], ...userRelay }
      } else {
        // Add new user relay
        merged.push(userRelay)
      }
    })

    return merged.sort((a, b) => a.priority - b.priority)
  }

  /**
   * Get all configured relays
   */
  getRelays(): RelayInfo[] {
    return [...this.relays]
  }

  /**
   * Get enabled relays only
   */
  getEnabledRelays(): RelayInfo[] {
    return this.relays.filter(r => r.enabled)
  }

  /**
   * Get read-enabled relays
   */
  getReadRelays(): RelayInfo[] {
    return this.relays.filter(r => r.enabled && r.read)
  }

  /**
   * Get write-enabled relays
   */
  getWriteRelays(): RelayInfo[] {
    return this.relays.filter(r => r.enabled && r.write)
  }

  /**
   * Get relays by priority (highest first)
   */
  getRelaysByPriority(): RelayInfo[] {
    return this.getEnabledRelays().sort((a, b) => a.priority - b.priority)
  }

  /**
   * Update relay configuration
   */
  updateRelay(url: string, updates: Partial<RelayInfo>) {
    const index = this.relays.findIndex(r => r.url === url)
    if (index >= 0) {
      this.relays[index] = { ...this.relays[index], ...updates }
      this.saveConfiguration()
      return true
    }
    return false
  }

  /**
   * Add new relay
   */
  addRelay(relay: Omit<RelayInfo, 'priority'>) {
    const maxPriority = Math.max(...this.relays.map(r => r.priority), 0)
    const newRelay: RelayInfo = {
      ...relay,
      priority: maxPriority + 1
    }
    
    // Check if relay already exists
    if (this.relays.some(r => r.url === relay.url)) {
      return false
    }

    this.relays.push(newRelay)
    this.saveConfiguration()
    return true
  }

  /**
   * Remove relay
   */
  removeRelay(url: string): boolean {
    const initialLength = this.relays.length
    this.relays = this.relays.filter(r => r.url !== url)
    
    if (this.relays.length < initialLength) {
      this.saveConfiguration()
      return true
    }
    return false
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults() {
    this.relays = [...DEFAULT_RELAYS]
    this.saveConfiguration()
  }

  /**
   * Add regional relays based on user location
   */
  addRegionalRelays(region: keyof typeof REGIONAL_RELAYS) {
    const regionalRelays = REGIONAL_RELAYS[region]
    if (!regionalRelays) return false

    let added = 0
    regionalRelays.forEach(relay => {
      if (this.addRelay(relay)) {
        added++
      }
    })

    return added > 0
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(url: string, status: Partial<RelayConnectionStatus>) {
    const current = this.connectionStatuses.get(url) || {
      url,
      connected: false,
      connecting: false
    }

    this.connectionStatuses.set(url, { ...current, ...status })

    // Update relay stats
    const relay = this.relays.find(r => r.url === url)
    if (relay && status.connected !== undefined) {
      if (status.connected) {
        relay.lastConnected = Date.now()
        relay.connectionCount = (relay.connectionCount || 0) + 1
        relay.errorCount = Math.max((relay.errorCount || 0) - 1, 0) // Reduce error count on success
      } else if (status.error) {
        relay.errorCount = (relay.errorCount || 0) + 1
      }
      this.saveConfiguration()
    }
  }

  /**
   * Get connection status for a relay
   */
  getConnectionStatus(url: string): RelayConnectionStatus | undefined {
    return this.connectionStatuses.get(url)
  }

  /**
   * Get all connection statuses
   */
  getAllConnectionStatuses(): RelayConnectionStatus[] {
    return Array.from(this.connectionStatuses.values())
  }

  /**
   * Get relay statistics
   */
  getRelayStats(): {
    total: number
    enabled: number
    connected: number
    connecting: number
    failed: number
  } {
    const statuses = this.getAllConnectionStatuses()
    return {
      total: this.relays.length,
      enabled: this.getEnabledRelays().length,
      connected: statuses.filter(s => s.connected).length,
      connecting: statuses.filter(s => s.connecting).length,
      failed: statuses.filter(s => s.error && !s.connected).length
    }
  }

  /**
   * Get recommended relays for optimal performance
   */
  getRecommendedRelays(maxCount: number = 5): RelayInfo[] {
    return this.getEnabledRelays()
      .sort((a, b) => {
        // Sort by priority, connection success, and low error count
        const aScore = a.priority + (a.errorCount || 0) - (a.connectionCount || 0)
        const bScore = b.priority + (b.errorCount || 0) - (b.connectionCount || 0)
        return aScore - bScore
      })
      .slice(0, maxCount)
  }

  /**
   * Test relay connectivity
   */
  async testRelay(url: string, timeout: number = 5000): Promise<{
    success: boolean
    responseTime?: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      return new Promise((resolve) => {
        const ws = new WebSocket(url)
        const timeoutId = setTimeout(() => {
          ws.close()
          resolve({
            success: false,
            error: "Connection timeout"
          })
        }, timeout)

        ws.onopen = () => {
          clearTimeout(timeoutId)
          const responseTime = Date.now() - startTime
          ws.close()
          resolve({
            success: true,
            responseTime
          })
        }

        ws.onerror = () => {
          clearTimeout(timeoutId)
          resolve({
            success: false,
            error: "Connection failed"
          })
        }
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Bulk test all enabled relays
   */
  async testAllRelays(): Promise<Map<string, {
    success: boolean
    responseTime?: number
    error?: string
  }>> {
    const results = new Map()
    const enabledRelays = this.getEnabledRelays()
    
    await Promise.allSettled(
      enabledRelays.map(async (relay) => {
        const result = await this.testRelay(relay.url)
        results.set(relay.url, result)
        
        // Update relay stats
        if (result.success && result.responseTime) {
          const currentAvg = relay.avgResponseTime || 0
          relay.avgResponseTime = Math.round((currentAvg + result.responseTime) / 2)
        }
      })
    )

    this.saveConfiguration()
    return results
  }
}
