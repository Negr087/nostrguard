import type { ScammerPack } from "./nostr"

export const SAMPLE_SCAMMER_PACKS: ScammerPack[] = [
  {
    id: "crypto-impersonators",
    name: "Crypto Impersonators",
    description: "Accounts impersonating well-known crypto figures to scam with fake investments",
    npubs: [
      "npub1qj3k5r8p2t6w9x3m7c4n8v5b2z9f6d3q8k7r4p1t6w9x3m7c4n8v5b2z9f6",
      "npub1x7k2r5q8t3w6z9c4n7v2b5m8f1d6p3q8k7r4t1w6z9c4n7v2b5m8f1d6p3",
      "npub1z9f6d3q8k7r4t1w6x3m7c4n8v5b2m8f1d6p3q8k7r4t1w6z9c4n7v2b5x7",
      "npub1m8f1d6p3q8k7r4t1w6z9c4n7v2b5x7k2r5q8t3w6x3m7c4n8v5b2z9f6d3",
      "npub1v2b5x7k2r5q8t3w6z9c4n7m8f1d6p3q8k7r4t1w6x3m7c4n8v5b2z9f6d3q8",
    ],
    creator: {
      name: "Moderator",
      pubkey: "npub1moderator1community123456789abcdef",
      picture: undefined
    },
    scammerCount: 5,
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
    eventId: "crypto-impersonators",
    tags: ["impersonation", "crypto", "investment-scam"],
  },
]

// Store for user-created packs (in a real app, this would be in a database)
const userPacks: ScammerPack[] = []

export function getAllPacks(): ScammerPack[] {
  return [...SAMPLE_SCAMMER_PACKS, ...userPacks]
}

export function getScammerPacks(isAuthenticated: boolean): ScammerPack[] {
  if (isAuthenticated) {
    // For authenticated users, return both sample packs and user packs
    // In a real app, you'd filter by user's packs or community packs
    return getAllPacks()
  }
  return SAMPLE_SCAMMER_PACKS
}

export function getPackById(id: string, publicKey?: string): ScammerPack | undefined {

  // Buscar en sample packs primero
  const samplePack = SAMPLE_SCAMMER_PACKS.find((pack) => pack.id === id)
  if (samplePack) {
    return samplePack
  }

  // Buscar en localStorage
  if (typeof window !== "undefined") {
    // Si hay publicKey, buscar en su storage específico
    if (publicKey) {
      const key = `packs-${publicKey}`
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const userPacks = JSON.parse(stored)
          const userPack = userPacks.find((pack: any) => pack.id === id)
if (userPack) {
  return {
    id: userPack.id,
    name: userPack.name,
    description: userPack.description,
    npubs: userPack.npubs || [],
    creator: {
      name: "Unknown",
      pubkey: typeof userPack.creator === 'string' 
        ? userPack.creator 
        : (userPack.creator?.pubkey || publicKey || "unknown"),
      picture: undefined
    },
    scammerCount: (userPack.npubs || []).length,
    createdAt: new Date(userPack.created_at || Date.now()),
    updatedAt: new Date(userPack.created_at || Date.now()),
    eventId: userPack.id,
    tags: userPack.tags || [],
  }
}
        }
      } catch (error) {
        console.error("[getPackById] Error reading user packs:", error)
      }
    }

    // Buscar en todos los packs como fallback
    const allKeys = Object.keys(localStorage).filter((key) => key.startsWith("packs-"))
    for (const key of allKeys) {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          const userPacks = JSON.parse(stored)
          const userPack = userPacks.find((pack: any) => pack.id === id)
          if (userPack) {
  return {
    id: userPack.id,
    name: userPack.name,
    description: userPack.description,
    npubs: userPack.npubs || [],
    creator: {
      name: "Unknown",
      pubkey: typeof userPack.creator === 'string' 
        ? userPack.creator 
        : (userPack.creator?.pubkey || "unknown"),
      picture: undefined
    },
    scammerCount: (userPack.npubs || []).length,
    createdAt: new Date(userPack.created_at || Date.now()),
    updatedAt: new Date(userPack.created_at || Date.now()),
    eventId: userPack.id,
    tags: userPack.tags || [],
  }
}
        }
      } catch (error) {
        console.error("[getPackById] Error in fallback search:", error)
      }
    }
  }

  return undefined
}

export function getPacksByTag(tag: string): ScammerPack[] {
  return getAllPacks().filter((pack) => pack.tags.includes(tag))
}

export function getAllTags(): string[] {
  const tags = new Set<string>()
  getAllPacks().forEach((pack) => {
    pack.tags.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags)
}

export function deletePackById(id: string): boolean {
  // Eliminar de userPacks en memoria
  const index = userPacks.findIndex((pack) => pack.id === id)
  if (index !== -1) {
    userPacks.splice(index, 1)
  }

  // Eliminar del localStorage
  if (typeof window !== "undefined") {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith("packs-"))
    for (const key of keys) {
      try {
        const packs = JSON.parse(localStorage.getItem(key) || "[]")
        const filteredPacks = packs.filter((pack: any) => pack.id !== id)
        if (packs.length !== filteredPacks.length) {
          localStorage.setItem(key, JSON.stringify(filteredPacks))
          return true
        }
      } catch (error) {
        console.error("Error deleting from localStorage:", error)
      }
    }
  }

  return index !== -1
}

export function updatePackById(id: string, updatedPack: Partial<ScammerPack>): ScammerPack | undefined {
  const index = userPacks.findIndex((pack) => pack.id === id)
  if (index !== -1) {
    userPacks[index] = { ...userPacks[index], ...updatedPack }
    return userPacks[index]
  }
  return undefined
}

import { NostrService } from "./nostr-service"

export async function getPacksFromNostr(): Promise<ScammerPack[]> {
  try {
    const nostrService = NostrService.getInstance()
    await nostrService.init()
    return await nostrService.getScammerPacks()
  } catch (error) {
    console.error("Error fetching packs from Nostr:", error)
    return SAMPLE_SCAMMER_PACKS // Fallback to samples
  }
}

export async function getPackByIdFromNostr(id: string): Promise<ScammerPack | null> {
  try {
    const nostrService = NostrService.getInstance()
    await nostrService.init()
    return await nostrService.getPackById(id)
  } catch (error) {
    console.error("Error fetching pack from Nostr:", error)
    const pack = getPackById(id)
    return pack || null // Convertimos undefined a null
  }
}
