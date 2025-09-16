"use client"

import { useState, useEffect, useRef } from "react"
import type { NostrProfile } from "@/lib/nostr"
import { nostrClient } from "@/lib/nostr-client"

declare global {
  interface Window {
    nostrLogin?: {
      pubkey: string
      profile?: NostrProfile
      authMethod: string
    }
    NostrLogin?: any
  }
}

export function useNostr() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<NostrProfile | null>(null)

  const lastLocalStorageValue = useRef('')
  const isInitialized = useRef(false)
  const lastDetectedAuth = useRef<string | null>(null)

  // Check for existing auth and monitor localStorage changes
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    // Check if scripts are loaded
    const checkScriptsLoaded = () => {
      const scriptsLoaded = {
        nostrTools: typeof window !== 'undefined' && !!(window as any).nostr,
        nostrLogin: typeof window !== 'undefined' && !!window.NostrLogin,
        nostrLoginData: typeof window !== 'undefined' && !!window.nostrLogin
      }

      // console.log('🔍 Script loading status:', scriptsLoaded)

      // if (!scriptsLoaded.nostrLogin) {
      //   console.log('⏳ NostrLogin script not loaded yet, will retry...')
      // } else {
      //   console.log('✅ NostrLogin script loaded successfully')
      // }

      return scriptsLoaded
    }

    // Scripts are loaded in layout.tsx, no need for manual loading here
    console.log('🔍 Scripts should be loaded from layout.tsx')

    const checkAuth = () => {
      try {
        const currentValue = localStorage.getItem('nl') || ''
        if (currentValue && currentValue !== lastLocalStorageValue.current) {
          lastLocalStorageValue.current = currentValue
          const parsed = JSON.parse(currentValue)

          if (parsed.pubkey && parsed.authMethod) {
            // console.log('🎯 Auth detected in localStorage:', parsed.pubkey.slice(0, 8))
            setPublicKey(parsed.pubkey)
            setIsAuthenticated(true)
            setIsLoading(false)

            if (parsed.profile) {
              setProfile(parsed.profile)

              // If profile exists but is incomplete (no picture), try to fetch complete profile
              if (!parsed.profile.picture) {
                setTimeout(async () => {
                  try {
                    console.log('🔍 Profile exists but no picture, fetching complete profile...')
                    const fetchedProfile = await nostrClient.getProfile(parsed.pubkey)
                    if (fetchedProfile && fetchedProfile.picture) {
                      setProfile(fetchedProfile)
                      // Update localStorage with complete profile
                      const updatedAuthData = {
                        ...parsed,
                        profile: fetchedProfile,
                        timestamp: Date.now()
                      }
                      localStorage.setItem('nl', JSON.stringify(updatedAuthData))
                    }
                  } catch (error) {
                    console.log('Could not fetch complete profile')
                  }
                }, 200)
              }
            }
          }
        }
      } catch (e) {
        console.log('Error checking localStorage:', e)
      }
    }

    // Check immediately for existing auth
    checkAuth()

    // Monitor localStorage changes every 100ms
    const interval = setInterval(checkAuth, 100)
    return () => clearInterval(interval)
  }, [])

  // Listen for nlAuth events and poll for nostrLogin data
  useEffect(() => {
    const handleAuth = (event: any) => {
      console.log('🎯 nlAuth event received:', event.detail, event)

      if (event.detail) {
        const { type, pubkey, name, picture, authMethod } = event.detail

        if (type === 'login' && pubkey) {
          console.log('🎯 Processing login event for:', pubkey.slice(0, 8))
          setPublicKey(pubkey)
          setIsAuthenticated(true)
          setIsLoading(false)

          // Save to localStorage for persistence
          try {
            const authData = {
              pubkey,
              authMethod: authMethod || 'extension',
              profile: { name, picture },
              timestamp: Date.now()
            }
            localStorage.setItem('nl', JSON.stringify(authData))
            console.log('🎯 Auth data saved to localStorage')
          } catch (e) {
            console.error('Failed to save auth data:', e)
          }

          // Set profile
          if (name || picture) {
            setProfile({ name, picture })
          } else {
            // If no profile data provided, set default and fetch asynchronously
            setProfile({ name: 'Nostr User' })

            // Fetch profile asynchronously
            setTimeout(async () => {
              try {
                console.log('🔍 No profile data in event, fetching from Nostr...')
                const fetchedProfile = await nostrClient.getProfile(pubkey)
                if (fetchedProfile && (fetchedProfile.name || fetchedProfile.picture)) {
                  setProfile(fetchedProfile)
                  // Update localStorage with fetched profile
                  const authData = {
                    pubkey,
                    authMethod: authMethod || 'extension',
                    profile: fetchedProfile,
                    timestamp: Date.now()
                  }
                  localStorage.setItem('nl', JSON.stringify(authData))
                }
              } catch (error) {
                console.log('Could not fetch profile, keeping default')
              }
            }, 100)
          }
        } else if (type === 'logout') {
          console.log('🎯 Processing logout event')
          setPublicKey(null)
          setIsAuthenticated(false)
          setProfile(null)
          setIsLoading(false)
        }
      }
    }

    // Listen for events on multiple targets
    const targets = [window, document]
    targets.forEach(target => {
      target.addEventListener('nlAuth', handleAuth)
    })
    console.log('🎯 Auth event listeners registered')

    // Poll for any nostr auth data changes (fallback for missed events)
    const pollNostrLogin = () => {
      if (isAuthenticated) return // Already authenticated

      // Check all nostr-related globals for auth data
      const nostrGlobals = Object.keys(window).filter(k =>
        k.toLowerCase().includes('nostr') ||
        k.toLowerCase().includes('login') ||
        k.toLowerCase().includes('connect')
      )

      for (const key of nostrGlobals) {
        const obj = (window as any)[key]
        if (obj && typeof obj === 'object' && obj.pubkey && !isAuthenticated) {
          // Only log once when auth is first detected
          if (!lastDetectedAuth.current) {
            console.log(`🎯 Polling detected auth data in window.${key}:`, obj.pubkey.slice(0, 8))
            lastDetectedAuth.current = obj.pubkey
          }

          // Manually dispatch the event that React should receive
          const authEvent = new CustomEvent('nlAuth', {
            detail: {
              type: 'login',
              pubkey: obj.pubkey,
              name: obj.profile?.name,
              picture: obj.profile?.picture,
              authMethod: obj.authMethod || 'connect'
            }
          })
          window.dispatchEvent(authEvent)
          return // Found auth data, stop checking
        }
      }
    }

    // Poll every 500ms for nostrLogin data (less aggressive)
    const pollInterval = setInterval(pollNostrLogin, 500)

    return () => {
      targets.forEach(target => {
        target.removeEventListener('nlAuth', handleAuth)
      })
      clearInterval(pollInterval)
    }
  }, [isAuthenticated])




  // Connect function
  const connect = async () => {
    setIsLoading(true)

    try {
      // First try NostrLogin if available
      // Try to find any nostr-login related functions
      const nostrGlobals = Object.keys(window).filter(k =>
        k.toLowerCase().includes('nostr') ||
        k.toLowerCase().includes('login') ||
        k.toLowerCase().includes('connect')
      )

      console.log('Available nostr globals:', nostrGlobals)

      // Look for any function that might be the login launcher
      let loginFunction = null
      for (const key of nostrGlobals) {
        const obj = (window as any)[key]
        if (obj && typeof obj === 'object' && obj.launch && typeof obj.launch === 'function') {
          loginFunction = obj.launch
          console.log(`Found login function in window.${key}`)
          break
        }
        if (typeof obj === 'function' && key.toLowerCase().includes('login')) {
          loginFunction = obj
          console.log(`Found login function: window.${key}`)
          break
        }
      }

      if (loginFunction) {
        console.log('🚀 Launching found login function...')
        try {
          await loginFunction()
          console.log('✅ Login function launched successfully')

          // After launch, poll for authentication data
          let authCheckAttempts = 0
          const checkAuthAfterLaunch = () => {
            authCheckAttempts++

            // Check all nostr globals for auth data
            for (const key of nostrGlobals) {
              const obj = (window as any)[key]
              if (obj && typeof obj === 'object' && obj.pubkey) {
                console.log(`🎯 Auth data found in window.${key}:`, obj.pubkey.slice(0, 8))
                setPublicKey(obj.pubkey)
                setIsAuthenticated(true)
                setIsLoading(false)
                if (obj.profile) {
                  setProfile(obj.profile)
                }
                // Save to localStorage
                try {
                  const authData = {
                    pubkey: obj.pubkey,
                    authMethod: obj.authMethod || 'connect',
                    profile: obj.profile || null,
                    timestamp: Date.now()
                  }
                  localStorage.setItem('nl', JSON.stringify(authData))
                } catch (e) {
                  console.error('Failed to save auth data:', e)
                }
                return
              }
            }

            if (authCheckAttempts < 40) { // Check for 20 seconds
              setTimeout(checkAuthAfterLaunch, 500)
            } else {
              console.log('No auth data found after launch, trying direct extension...')
            }
          }
          setTimeout(checkAuthAfterLaunch, 500) // Start checking immediately

          return
        } catch (launchError: any) {
          console.error('❌ Login function launch failed:', launchError)
          console.log('🔄 Trying direct nostr extension...')
        }
      } else {
        console.log('🔄 No login function found, trying direct nostr extension...')
      }

      // Fallback: Try direct nostr extension authentication
      if (typeof window !== 'undefined' && (window as any).nostr) {
        try {
          console.log('🚀 Trying direct nostr extension authentication...')
          const pubkey = await (window as any).nostr.getPublicKey()
          console.log('✅ Direct nostr auth successful:', pubkey.slice(0, 8))

          // Simulate login event
          setPublicKey(pubkey)
          setIsAuthenticated(true)
          setIsLoading(false)

          // Save to localStorage
          const authData = {
            pubkey,
            authMethod: 'extension',
            profile: null,
            timestamp: Date.now()
          }
          localStorage.setItem('nl', JSON.stringify(authData))

          // Try to get profile
          try {
            // This is a simplified approach - in a real app you'd fetch the profile
            setProfile({ name: 'Nostr User' })
          } catch (profileError) {
            console.log('Could not fetch profile, using default')
          }

          return
        } catch (directError: any) {
          console.error('❌ Direct nostr auth failed:', directError)
          throw new Error('Nostr extension authentication failed. Please make sure you have a Nostr extension installed.')
        }
      } else {
        throw new Error('No Nostr authentication method available. Please install a Nostr extension or check script loading.')
      }
    } catch (error) {
      console.error('❌ Connect error:', error)
      setIsLoading(false)
      throw error
    }
  }

  const disconnect = () => {
    try {
      console.log('🎯 Disconnecting user')
      // Limpiar estado local
      setPublicKey(null)
      setIsAuthenticated(false)
      setProfile(null)

      // Limpiar localStorage
      try {
        localStorage.removeItem('nl')
        console.log('🎯 Cleared localStorage')
      } catch (e) {
        console.log('Could not clear localStorage')
      }

      // Buscar y llamar logout function
      const nostrGlobals = Object.keys(window).filter(k =>
        k.toLowerCase().includes('nostr') ||
        k.toLowerCase().includes('login')
      )

      for (const key of nostrGlobals) {
        const obj = (window as any)[key]
        if (obj && typeof obj === 'object' && obj.logout && typeof obj.logout === 'function') {
          console.log(`Calling logout on window.${key}`)
          obj.logout()
          break
        }
      }
    } catch (error) {
      console.error('Error during disconnect:', error)
    }
  }

  const showLoginModal = async () => {
    await connect()
  }

  return {
    isAuthenticated,
    publicKey,
    connect,
    isLoading,
    profile,
    disconnect,
    showLoginModal
  }
}