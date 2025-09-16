import { SimplePool, type Event, nip19 } from "nostr-tools"
import type { NostrProfile } from "./nostr"

// Definición de tipos para window.nostr
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>
      signEvent(event: any): Promise<any> // Cambiado de Event a any para coincidir
      getRelays(): Promise<{ [url: string]: { read: boolean, write: boolean } }>
    }
  }
}

// Interfaz para resultados de publicación
interface PublishResult {
  relay: string
  status: 'success' | 'failed' | 'timeout' | 'error'
  reason?: string
  error?: any
}

// Interfaz principal para los packs de scammers
export interface NostrPack {
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

export class NostrClient {
  private pool: SimplePool
  private relays: string[]

  constructor(relays?: string[]) {
    this.pool = new SimplePool()
    this.relays = relays || [
      "wss://relay.damus.io",
      "wss://relay.primal.net",
      "wss://nos.lol",
      "wss://relay.nostr.band",
      "wss://nostr.wine",
      "wss://wot.nostr.party",
      "wss://hist.nostr.land",
      "wss://nostr.mom",
    ]
  }

  // Crear un nuevo pack de scammers
  async createScammerPack(
    packData: { name: string; description: string; npubs: string[]; tags: string[] },
    publicKey: string,
  ): Promise<Event> {
    if (!window.nostr) {
      throw new Error("Nostr provider not found")
    }

    const packId = crypto.randomUUID()
    const hexNpubs = this.convertNpubsToHex(packData.npubs)

    const event = {
      kind: 30001,
      pubkey: publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["d", packId],
        ["title", packData.name],
        ["description", packData.description],
        ["L", "nostrguard"],
        ["l", "scammer-pack", "nostrguard"],
        ...hexNpubs.map((pubkey) => ["p", pubkey, "", "scammer"]),
        ...packData.tags.map((tag) => ["t", tag]),
      ],
      content: "",
    }

    const signedEvent = await window.nostr.signEvent(event)
    await this.publishEvent(signedEvent)
    return signedEvent
  }

  // Crear una lista de bloqueo
  async createMuteList(npubs: string[], publicKey: string): Promise<Event> {
    if (!window.nostr) {
      throw new Error("Nostr provider not found")
    }

    const hexNpubs = this.convertNpubsToHex(npubs)

    const event = {
      kind: 10000,
      pubkey: publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: hexNpubs.map((pubkey) => ["p", pubkey]),
      content: "",
    }

    const signedEvent = await window.nostr.signEvent(event)
    await this.publishEvent(signedEvent)
    return signedEvent
  }

  // Obtener packs de un usuario específico
  async getUserPacks(publicKey: string): Promise<NostrPack[]> {
    try {
      const events = await this.pool.querySync(this.relays, {
        kinds: [30001],
        authors: [publicKey],
        "#L": ["nostrguard"],
      })

      return Array.from(events).map((event) => this.eventToPack(event))
    } catch (error) {
      console.error("Error fetching user packs:", error)
      return []
    }
  }

  // Obtener todos los packs públicos
  async getAllPacks(): Promise<NostrPack[]> {
    const events = await this.pool.querySync(this.relays, {
      kinds: [30001],
      "#L": ["nostrguard"],
      "#l": ["scammer-pack"],
    })

    return Array.from(events).map(this.eventToPack)
  }

  // Obtener un pack específico por ID
  async getPackById(packId: string): Promise<NostrPack | null> {
    if (/^[0-9a-f]{64}$/.test(packId)) {
      const events = await this.pool.querySync(this.relays, {
        ids: [packId],
      })
      const event = Array.from(events)[0]
      return event ? this.eventToPack(event) : null
    }
    
    const events = await this.pool.querySync(this.relays, {
      kinds: [30001],
      "#d": [packId],
      "#L": ["nostrguard"],
    })
    
    const event = Array.from(events)[0]
    return event ? this.eventToPack(event) : null
  }

  // Actualizar un pack existente
  async updatePack(
    packId: string,
    packData: { name: string; description: string; npubs: string[]; tags: string[] },
    publicKey: string,
  ): Promise<Event> {
    if (!window.nostr) {
      throw new Error("Nostr provider not found")
    }

    const hexNpubs = this.convertNpubsToHex(packData.npubs)

    const event = {
      kind: 30001,
      pubkey: publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["d", packId],
        ["title", packData.name],
        ["description", packData.description],
        ["L", "nostrguard"],
        ["l", "scammer-pack", "nostrguard"],
        ...hexNpubs.map((pubkey) => ["p", pubkey, "", "scammer"]),
        ...packData.tags.map((tag) => ["t", tag]),
      ],
      content: "",
    }

    const signedEvent = await window.nostr.signEvent(event)
    await this.publishEvent(signedEvent)
    return signedEvent
  }

  // Eliminar un pack
  async deletePack(packId: string, publicKey: string): Promise<Event> {
    if (!window.nostr) {
      throw new Error("Nostr provider not found")
    }

    const event = {
      kind: 5,
      pubkey: publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["a", `30001:${publicKey}:${packId}`],
      ],
      content: "Pack deleted by user",
    }

    const signedEvent = await window.nostr.signEvent(event)
    await this.publishEvent(signedEvent)
    return signedEvent
  }

  // Obtener la lista de bloqueados del usuario
  async getMuteList(publicKey: string): Promise<string[]> {
    const events = await this.pool.querySync(this.relays, {
      kinds: [10000],
      authors: [publicKey],
      limit: 1,
    })

    const event = Array.from(events)[0]
    if (!event) return []

    return event.tags.filter((tag) => tag[0] === "p").map((tag) => tag[1])
  }

  // Obtener el perfil de un usuario
  async getProfile(publicKey: string): Promise<NostrProfile | null> {
    try {
      const events = await this.pool.querySync(this.relays, {
        kinds: [0],
        authors: [publicKey],
        limit: 1,
      })

      const event = Array.from(events)[0]
      if (!event) return null

      const profile = JSON.parse(event.content)
      return {
        name: profile.name,
        display_name: profile.display_name,
        about: profile.about,
        picture: profile.picture,
        nip05: profile.nip05
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      return null
    }
  }

  // Bloquear cuentas
  async blockAccounts(npubs: string[], publicKey: string): Promise<Event> {
    const currentMuted = await this.getMuteList(publicKey)
    const newNpubs = npubs.filter((npub) => !currentMuted.includes(npub))
    const allMuted = [...currentMuted, ...newNpubs]

    return this.createMuteList(allMuted, publicKey)
  }

  // Método privado para publicar eventos
  private async publishEvent(event: Event): Promise<void> {
  console.log("Publishing event to relays:", this.relays.length)
  
  const publishPromises = this.relays.map(async (relay) => {
    try {
      const pub = this.pool.publish([relay], event)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 5000)
      )
      
      await Promise.race([pub, timeoutPromise])
      console.log(`SUCCESS: Published to ${relay}`)
      return { relay, status: 'success' as const }
    } catch (error: any) {
      const status = error.message === 'timeout' ? 'timeout' : 'error'
      console.warn(`${status.toUpperCase()}: ${relay}`)
      return { relay, status, error }
    }
  })
  
  const results = await Promise.allSettled(publishPromises)
  const successful = results.filter(r => 
    r.status === 'fulfilled' && r.value.status === 'success'
  ).length
  
  console.log(`Final results: ${successful}/${this.relays.length} successful`)
  
  if (successful === 0) {
    throw new Error("Failed to publish to any relay")
  }
}

  // Método privado para convertir un evento a un pack
  private eventToPack(event: Event): NostrPack {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1] || event.id
    const title = event.tags.find((t) => t[0] === "title")?.[1] || "Unnamed Pack"
    const description = event.tags.find((t) => t[0] === "description")?.[1] || ""
    const npubs = event.tags
      .filter((t) => t[0] === "p")
      .map((t) => {
        try {
          return nip19.npubEncode(t[1])
        } catch {
          return t[1]
        }
      })
    const tags = event.tags.filter((t) => t[0] === "t").map((t) => t[1])

    return {
      id: dTag,
      name: title,
      description,
      npubs,
      tags,
      creator: {
        name: "Nostr User",
        pubkey: event.pubkey,
      },
      scammerCount: npubs.length,
      createdAt: new Date(event.created_at * 1000),
      updatedAt: new Date(event.created_at * 1000),
      eventId: event.id,
    }
  }

  // Método privado para convertir npubs a hex
  private convertNpubsToHex(npubs: string[]): string[] {
    return npubs.map((npub) => {
      try {
        if (npub.startsWith("npub")) {
          const decoded = nip19.decode(npub)
          return decoded.data as string
        }
        return npub
      } catch {
        return npub
      }
    })
  }

  // Método para cerrar las conexiones
  close(): void {
    this.pool.close(this.relays)
  }
}

// Instancia singleton del cliente
export const nostrClient = new NostrClient()