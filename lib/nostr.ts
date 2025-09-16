export interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

// Nostr dependencies configuration
export const NOSTR_CONFIG = {
  versions: {
    tools: '2.5.2',
    login: '1.7.11'
  },
  cdn: {
    tools: 'https://unpkg.com/nostr-tools@2.5.2/lib/esm/index.js',
    login: 'https://unpkg.com/nostr-login@1.7.11/dist/unpkg.js'
  }
}

export interface NostrProfile {
  name?: string
  display_name?: string
  about?: string
  picture?: string
  nip05?: string
}

export interface BlockAction {
  timestamp: Date | number
  packName: string
  accountsBlocked: number
  type: "block" | "mute" | "unblock"
  npubs: string[]
}

// Actualizar esta interfaz para que coincida con NostrPack
export interface ScammerPack {
  id: string
  name: string
  description: string
  npubs: string[]
  tags: string[]
  creator: {
    name: string
    pubkey: string
    picture?: string
  }
  scammerCount: number
  createdAt: Date
  updatedAt: Date
  eventId: string
}

// Interfaz para resultados de publicación
export interface PublishResult {
  relay: string
  status: 'success' | 'failed' | 'timeout' | 'error'
  reason?: string
  error?: any
}

export class NostrClient {
  private relays: string[] = [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.nostr.band",
    "wss://relay.primal.net",
  ]

  async getPublicKey(): Promise<string | null> {
    if (typeof window !== "undefined" && (window as any).nostr) {
      try {
        return await (window as any).nostr.getPublicKey()
      } catch (error) {
        console.error("Error getting public key:", error)
        return null
      }
    }
    return null
  }

  async signEvent(event: Partial<NostrEvent>): Promise<NostrEvent | null> {
    if (typeof window !== "undefined" && (window as any).nostr) {
      try {
        return await (window as any).nostr.signEvent(event)
      } catch (error) {
        console.error("Error signing event:", error)
        return null
      }
    }
    return null
  }

  // Reemplazar toda la función por:
async createBlockListEvent(npubsToBlock: string[]): Promise<NostrEvent | null> {
  try {
    const { nip19 } = await import('nostr-tools')
    const pubkeysToBlock = npubsToBlock.map((npub) => {
      try {
        const decoded = nip19.decode(npub)
        return decoded.type === 'npub' ? decoded.data : npub
      } catch {
        return npub // Si falla el decode, asumir que ya es pubkey
      }
    })
    
    const event: Partial<NostrEvent> = {
      kind: 10000, // ✅ Mute List
      created_at: Math.floor(Date.now() / 1000),
      tags: pubkeysToBlock.map((pubkey) => ["p", pubkey]),
      content: "",
    }
    
    return await this.signEvent(event)
  } catch (error) {
    console.error("Error creating mute list event:", error)
    return null
  }
}

  // Reemplazar toda la función publishEvent por:
async publishEvent(event: NostrEvent): Promise<boolean[]> {
  const { SimplePool } = await import('nostr-tools/pool')
  const pool = new SimplePool()
  
  try {
    const results = await Promise.allSettled(
      this.relays.map(relay => pool.publish([relay], event))
    )
    
    return results.map(r => r.status === 'fulfilled')
  } finally {
    pool.close(this.relays)
  }
}
}
export const nostrClient = new NostrClient()
