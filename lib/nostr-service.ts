import { SimplePool, type Relay } from "nostr-tools"
import type { Event, Filter, UnsignedEvent } from "nostr-tools"
import { getPublicKey } from "nostr-tools"
import { finalizeEvent } from "nostr-tools"
import type { NostrEvent, ScammerPack } from "./nostr"
import { RelayManager } from "./relay-config"

type Sub = {
  close: () => void
}

export class NostrService {
  private static instance: NostrService
  private pool: SimplePool | null = null
  private relayManager: RelayManager
  private isInitialized = false
  private connectionPromise: Promise<void> | null = null
  private activeConnections = new Map<string, any>()

  // Helper function to convert hex to Uint8Array
  private hexToBytes(hex: string): Uint8Array {
    if (hex.length !== 64) {
      throw new Error("Private key must be 64 characters long")
    }
    const bytes = new Uint8Array(32)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
    }
    return bytes
  }

  private constructor() {
    this.relayManager = RelayManager.getInstance()
  }

  static getInstance(): NostrService {
    if (!NostrService.instance) {
      NostrService.instance = new NostrService()
    }
    return NostrService.instance
  }

  async init(): Promise<void> {
    if (this.isInitialized) return
    if (this.connectionPromise) return this.connectionPromise

    this.connectionPromise = this._init()
    return this.connectionPromise
  }

  private async _init(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("NostrService can only be initialized in browser environment")
    }

    try {
      this.pool = new SimplePool()
      this.isInitialized = true
      console.log("[NostrService] Initialized successfully")

      // Connect to relays
      await this.connectToRelays()
    } catch (error) {
      console.error("[NostrService] Failed to initialize:", error)
      throw error
    }
  }

  private async connectToRelays(): Promise<void> {
    const readRelays = this.relayManager.getReadRelays()
    console.log(
      "[NostrService] Connecting to relays:",
      readRelays.map((r) => r.url),
    )

    // Connect to relays with status tracking
    for (const relay of readRelays) {
      try {
        this.relayManager.updateConnectionStatus(relay.url, {
          url: relay.url,
          connecting: true,
          connected: false,
          error: undefined,
        })

        // Test connection
        const testResult = await this.relayManager.testRelay(relay.url, 3000)

        if (testResult.success) {
          this.relayManager.updateConnectionStatus(relay.url, {
            url: relay.url,
            connecting: false,
            connected: true,
            lastAttempt: Date.now(),
          })
          console.log(`[NostrService] Connected to ${relay.url}`)
        } else {
          this.relayManager.updateConnectionStatus(relay.url, {
            url: relay.url,
            connecting: false,
            connected: false,
            error: testResult.error,
            lastAttempt: Date.now(),
          })
          console.warn(`[NostrService] Failed to connect to ${relay.url}:`, testResult.error)
        }
      } catch (error) {
        this.relayManager.updateConnectionStatus(relay.url, {
          url: relay.url,
          connecting: false,
          connected: false,
          error: error instanceof Error ? error.message : "Unknown error",
          lastAttempt: Date.now(),
        })
        console.error(`[NostrService] Error connecting to ${relay.url}:`, error)
      }
    }
  }

  async reconnect(): Promise<void> {
    console.log("[NostrService] Reconnecting to relays...")
    await this.connectToRelays()
  }

  async getScammerPacks(limit = 50): Promise<ScammerPack[]> {
    await this.init()
    if (!this.pool) throw new Error("Pool not initialized")

    const readRelays = this.relayManager.getReadRelays()
    const relayUrls = readRelays.map((r) => r.url)

    console.log("[NostrService] Fetching packs from relays:", relayUrls)

    try {
      const filter: Filter = {
        kinds: [30001],
        limit
      }
      
      // Await the events from querySync
      const events = await this.pool.querySync(relayUrls, filter)

      console.log(`[NostrService] Found ${events.length} pack events`)

      return events
        .map((event: Event) => this.parseScammerPackEvent(event))
        .filter((pack): pack is ScammerPack => pack !== null)
        .sort((a: ScammerPack, b: ScammerPack) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error("[NostrService] Error fetching packs:", error)
      throw error
    }
}

  async getPackById(id: string): Promise<ScammerPack | null> {
    await this.init()
    if (!this.pool) throw new Error("Pool not initialized")

    const readRelays = this.relayManager.getReadRelays()
    const relayUrls = readRelays.map((r) => r.url)

    try {
      return new Promise<ScammerPack | null>((resolve, reject) => {
        let found = false
        const timeout = setTimeout(() => {
          if (!found) {
            sub.close()
            console.log(`[NostrService] Pack ${id} not found after timeout`)
            resolve(null)
          }
        }, 5000)

        const filter: Filter = {
          kinds: [30001],
          "#d": [id],
          limit: 1
        }

        const service = this
        const sub: Sub = this.pool!.subscribeMany(relayUrls, [filter], {
          onevent(event: Event) {
            if (!found) {
              found = true
              clearTimeout(timeout)
              sub.close()
              
              const pack = service.parseScammerPackEvent(event)
              console.log(`[NostrService] Found pack ${id}:`, pack)
              resolve(pack)
            }
          },
          oneose() {
            if (!found) {
              clearTimeout(timeout)
              sub.close()
              console.log(`[NostrService] Pack ${id} not found - EOSE received`)
              resolve(null)
            }
          }
        })
      })
    } catch (error) {
      console.error(`[NostrService] Error fetching pack ${id}:`, error)
      throw error
    }
  }

  async publishPack(pack: ScammerPack, privateKey: string): Promise<boolean> {
    await this.init()
    if (!this.pool) throw new Error("Pool not initialized")

    const writeRelays = this.relayManager.getWriteRelays()
    const relayUrls = writeRelays.map((r) => r.url)

    try {
      const privateKeyBytes = this.hexToBytes(privateKey)
      const pubkey = getPublicKey(privateKeyBytes)

      const unsignedEvent: UnsignedEvent = {
        kind: 30001,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["d", pack.id],
          ["title", pack.name],
          ["description", pack.description],
          ...pack.tags.map((tag) => ["t", tag]),
          ...pack.npubs.map((npub) => ["p", npub]),
        ],
        content: JSON.stringify({
          version: "1.0",
          npubs: pack.npubs,
        }),
        pubkey
      }

      const signedEvent = finalizeEvent(unsignedEvent, privateKeyBytes)

      console.log("[NostrService] Publishing pack to relays:", relayUrls)

      const promises = this.pool.publish(relayUrls, signedEvent)
      const results = await Promise.allSettled(promises)

      const successful = results.filter((r) => r.status === "fulfilled").length
      const failed = results.length - successful

      console.log(`[NostrService] Publish results: ${successful} successful, ${failed} failed`)

      return successful > 0
    } catch (error) {
      console.error("[NostrService] Error publishing pack:", error)
      throw error
    }
  }

  async deletePack(packId: string, privateKey?: string): Promise<boolean> {
    await this.init()
    if (!this.pool || !privateKey) return false

    const writeRelays = this.relayManager.getWriteRelays()
    const relayUrls = writeRelays.map((r) => r.url)

    try {
      const privateKeyBytes = this.hexToBytes(privateKey)
      const pubkey = getPublicKey(privateKeyBytes)

      const unsignedEvent: UnsignedEvent = {
        kind: 5,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["a", `30001:${pubkey}:${packId}`],
          ["k", "30001"],
        ],
        content: "Pack deleted",
        pubkey,
      }

      const signedEvent = finalizeEvent(unsignedEvent, privateKeyBytes)

      const promises = this.pool.publish(relayUrls, signedEvent)
      const results = await Promise.allSettled(promises)

      const successful = results.filter((r) => r.status === "fulfilled").length
      console.log(`[NostrService] Delete results: ${successful} successful deletions`)

      return successful > 0
    } catch (error) {
      console.error("[NostrService] Error deleting pack:", error)
      throw error
    }
  }

  async getPacksByCreator(pubkey: string, limit = 20): Promise<ScammerPack[]> {
    await this.init()
    if (!this.pool) throw new Error("Pool not initialized")

    const readRelays = this.relayManager.getReadRelays()
    const relayUrls = readRelays.map((r) => r.url)

    try {
      const filter: Filter = {
        kinds: [30001],
        authors: [pubkey],
        limit
      }

      // Await the events from querySync
      const events = await this.pool.querySync(relayUrls, filter)

      return events
        .map((event: Event) => this.parseScammerPackEvent(event))
        .filter((pack): pack is ScammerPack => pack !== null)
        .sort((a: ScammerPack, b: ScammerPack) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error("[NostrService] Error fetching packs by creator:", error)
      throw error
    }
}

  async searchPacks(query: string, limit = 20): Promise<ScammerPack[]> {
    await this.init()
    if (!this.pool) throw new Error("Pool not initialized")

    const readRelays = this.relayManager.getReadRelays()
    const relayUrls = readRelays.map((r) => r.url)

    try {
      const filter: Filter = {
        kinds: [30001],
        limit
      }

      // Await the events from querySync
      const events = await this.pool.querySync(relayUrls, filter)

      const packs = events
        .map((event: Event) => this.parseScammerPackEvent(event))
        .filter((pack): pack is ScammerPack => pack !== null)

      const filtered = packs.filter((pack: ScammerPack) =>
        pack.name.toLowerCase().includes(query.toLowerCase()) ||
        pack.description.toLowerCase().includes(query.toLowerCase()) ||
        pack.tags.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))
      )

      return filtered.sort((a: ScammerPack, b: ScammerPack) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error("[NostrService] Error searching packs:", error)
      throw error
    }
}

  private parseScammerPackEvent(event: Event): ScammerPack | null {
    try {
      if (!event || !event.tags || !Array.isArray(event.tags)) {
        console.warn("[NostrService] Invalid event: missing or invalid tags", event)
        return null
      }

      const packIdTag = event.tags.find((tag: string[]) => tag[0] === "d")
      const nameTag = event.tags.find((tag: string[]) => tag[0] === "title")
      const descriptionTag = event.tags.find((tag: string[]) => tag[0] === "description")
      const tagTags = event.tags.filter((tag: string[]) => tag[0] === "t")
      const npubTags = event.tags.filter((tag: string[]) => tag[0] === "p")

      if (!packIdTag || !nameTag) {
        console.warn("[NostrService] Invalid pack event: missing required tags")
        return null
      }

      let contentNpubs: string[] = []
      try {
        if (event.content) {
          const parsed = JSON.parse(event.content)
          if (Array.isArray(parsed.npubs)) {
            contentNpubs = parsed.npubs
          }
        }
      } catch (e) {
        // Content parsing failed, continue with tag npubs only
      }

      const allNpubs = [...npubTags.map((tag: string[]) => tag[1]), ...contentNpubs]
      const uniqueNpubs = [...new Set(allNpubs)].filter(Boolean)

      return {
        id: packIdTag[1],
        name: nameTag[1],
        description: descriptionTag?.[1] || "",
        npubs: uniqueNpubs,
        creator: {
          name: "Unknown",
          pubkey: event.pubkey,
          picture: undefined
        },
        scammerCount: uniqueNpubs.length,
        createdAt: new Date(event.created_at * 1000),
        updatedAt: new Date(event.created_at * 1000),
        eventId: event.id,
        tags: tagTags.map((tag: string[]) => tag[1])
      }
    } catch (error) {
      console.error("[NostrService] Error parsing pack event:", error)
      return null
    }
  }

  getConnectedRelays(): string[] {
    const statuses = this.relayManager.getAllConnectionStatuses()
    return statuses.filter((s) => s.connected).map((s) => s.url)
  }

  getRelayStats() {
    return this.relayManager.getRelayStats()
  }

  async testConnectivity(): Promise<void> {
    await this.relayManager.testAllRelays()
  }

  isHealthy(): boolean {
    if (!this.isInitialized || !this.pool) return false
    const connectedRelays = this.getConnectedRelays()
    const readRelays = this.relayManager.getReadRelays()
    return connectedRelays.length >= Math.ceil(readRelays.length * 0.5)
  }

  getStatus(): {
    initialized: boolean
    healthy: boolean
    connectedRelays: number
    totalRelays: number
    readRelays: number
    writeRelays: number
  } {
    const stats = this.relayManager.getRelayStats()
    const connectedRelays = this.getConnectedRelays()

    return {
      initialized: this.isInitialized,
      healthy: this.isHealthy(),
      connectedRelays: connectedRelays.length,
      totalRelays: stats.total,
      readRelays: this.relayManager.getReadRelays().length,
      writeRelays: this.relayManager.getWriteRelays().length,
    }
  }

  disconnect(): void {
    if (this.pool) {
      const relays = this.relayManager.getRelays()
      const relayUrls = relays.map(relay => relay.url)
      this.pool.close(relayUrls)
      this.pool = null
    }

    const relays = this.relayManager.getRelays()
    relays.forEach((relay) => {
      this.relayManager.updateConnectionStatus(relay.url, {
        url: relay.url,
        connected: false,
        connecting: false,
      })
    })

    this.isInitialized = false
    this.connectionPromise = null
    console.log("[NostrService] Disconnected from all relays")
}
}