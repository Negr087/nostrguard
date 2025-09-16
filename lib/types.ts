// lib/types.ts - Centralizar todos los tipos
export interface NostrProfile {
  name?: string
  display_name?: string
  about?: string
  picture?: string
  nip05?: string
}

export interface NostrCreator {
  name: string
  pubkey: string
  picture?: string
}

export interface NostrPack {
  id: string
  name: string
  description: string
  npubs: string[]
  tags: string[]
  creator: NostrCreator
  scammerCount: number
  createdAt: Date | number // Permitir ambos para compatibilidad
  updatedAt: Date | number
  eventId: string
}

// Para compatibilidad hacia atrás
export interface ScammerPack {
  id: string
  name: string
  description: string
  npubs: string[]
  creator: string
  created_at: number
  tags: string[]
}

// Función para convertir ScammerPack a NostrPack
export function convertScammerPackToNostrPack(pack: ScammerPack): NostrPack {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    npubs: pack.npubs,
    tags: pack.tags,
    creator: {
      name: "Unknown User",
      pubkey: pack.creator,
      picture: undefined,
    },
    scammerCount: pack.npubs.length,
    createdAt: new Date(pack.created_at),
    updatedAt: new Date(pack.created_at),
    eventId: pack.id,
  }
}

// Función para convertir NostrPack a ScammerPack
export function convertNostrPackToScammerPack(pack: NostrPack): ScammerPack {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    npubs: pack.npubs,
    creator: pack.creator.pubkey,
    created_at: typeof pack.createdAt === 'number' 
      ? pack.createdAt 
      : pack.createdAt.getTime(),
    tags: pack.tags,
  }
}
