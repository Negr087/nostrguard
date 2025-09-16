"use client"
import { useEffect, useRef } from "react"

export function NostrLoginBubble() {
  const nlRef = useRef<any>(null)

  // Inicializar NostrLogin
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initNostrLogin = async () => {
        // Wait for any nostr-login related functions to be available
        let attempts = 0
        let initFunction = null

        while (!initFunction && attempts < 100) {
          // Look for init functions in nostr globals
          const nostrGlobals = Object.keys(window).filter(k =>
            k.toLowerCase().includes('nostr') ||
            k.toLowerCase().includes('login')
          )

          for (const key of nostrGlobals) {
            const obj = (window as any)[key]
            if (obj && typeof obj === 'object' && obj.init && typeof obj.init === 'function') {
              initFunction = obj.init
              console.log(`Found init function in window.${key}`)
              break
            }
          }

          if (!initFunction) {
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++
          }
        }

        if (initFunction && !nlRef.current) {
          nlRef.current = initFunction({
            methods: ['connect', 'extension', 'local'],
            theme: 'default',
            bunkerUrl: true,
            checkSig: false
          })

          console.log('NostrLogin initialized via dynamic discovery')
        } else if (!initFunction) {
          console.log('No NostrLogin init function found after waiting')
        }
      }

      initNostrLogin()
    }
  }, [])

  // El bubble es invisible - NostrLogin maneja su propia UI
  return null
}