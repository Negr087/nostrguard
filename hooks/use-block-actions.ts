"use client"
import { useState, useEffect } from "react"
import type { BlockAction } from "@/lib/nostr"
import { useToast } from "@/hooks/use-toast"
import { SimplePool } from "nostr-tools"
import { nip19 } from "nostr-tools"
import { useNostr } from "./use-nostr"
import { nostrClient } from "@/lib/nostr-client"

export function useBlockActions() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [blockHistory, setBlockHistory] = useState<BlockAction[]>([])
  const [mutedAccounts, setMutedAccounts] = useState<string[]>([])
  const { publicKey } = useNostr()

  // Cargar la lista de bloqueados al inicio
  useEffect(() => {
    if (publicKey) {
      loadMuteList()
    }
  }, [publicKey])

  const loadMuteList = async () => {
    if (!publicKey) return

    try {
      const pool = new SimplePool()
      const relays = ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nos.lol"]

      const events = await pool.querySync(relays, {
        kinds: [10000],
        authors: [publicKey],
        limit: 1,
      })

      const event = Array.from(events)[0]
      if (event) {
        const muted = event.tags
          .filter((tag) => tag[0] === "p")
          .map((tag) => {
            try {
              return nip19.npubEncode(tag[1])
            } catch {
              return tag[1]
            }
          })
        setMutedAccounts(muted)
      }
    } catch (error) {
      console.error("Error loading mute list:", error)
    }
  }

  const blockAccounts = async (npubs: string[], packName: string): Promise<boolean> => {
    if (!publicKey) return false
    
    setIsProcessing(true)
    try {
      // Convertir npubs a hex pubkeys si es necesario
      const pubkeysToBlock = npubs.map(npub => {
        try {
          return nip19.decode(npub).data as string
        } catch {
          return npub
        }
      })

      // Crear y publicar el evento de mute
      const event = await nostrClient.createMuteList(pubkeysToBlock, publicKey)
      
      if (event) {
        setMutedAccounts(prev => [...new Set([...prev, ...npubs])])
        
        const blockAction: BlockAction = {
          timestamp: new Date(),
          packName,
          accountsBlocked: npubs.length,
          type: 'block',
          npubs
        }
        
        setBlockHistory(prev => [...prev, blockAction])
        return true
      }
      return false
    } catch (error) {
      console.error("Error blocking accounts:", error)
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  // Agregar estas nuevas funciones
  const areAccountsBlocked = (npubs: string[]): boolean => {
    // Comprobar si todos los npubs están en la lista de mutedAccounts
    return npubs.every(npub => mutedAccounts.includes(npub))
  }

  const getBlockedCount = (npubs: string[]): number => {
    // Contar cuántos npubs están en la lista de mutedAccounts
    return npubs.filter(npub => mutedAccounts.includes(npub)).length
  }

  return {
    blockAccounts,
    isProcessing,
    blockHistory,
    mutedAccounts,
    areAccountsBlocked,
    getBlockedCount
  }
}