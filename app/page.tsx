"use client"

import { useState, useEffect, useCallback } from "react"
import { CreatePackDialog } from "@/components/create-pack-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Zap, Lock, Plus, Filter } from "lucide-react"
import { useNostr } from "@/hooks/use-nostr"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { nostrClient, type NostrPack } from "@/lib/nostr-client"
import { MyPacksList } from "@/components/my-packs-list"

export default function HomePage() {
  const { isAuthenticated, publicKey, isLoading, profile, disconnect } = useNostr()
  const router = useRouter()
  const [, forceUpdate] = useState({})

  // console.log('🏠 HomePage render - isAuthenticated:', isAuthenticated, 'publicKey:', publicKey?.slice(0, 8))

  // Debug: check localStorage for authentication
  useEffect(() => {
    const checkLocalStorageAuth = () => {
      if (typeof window !== 'undefined') {
        try {
          const nlData = localStorage.getItem('nl')
          if (nlData) {
            const parsed = JSON.parse(nlData)
            // console.log('🏠 localStorage auth found:', {
            //   pubkey: parsed.pubkey?.slice(0, 8),
            //   authMethod: parsed.authMethod,
            //   hasProfile: !!parsed.profile
            // })
          } else {
            // console.log('🏠 No auth data in localStorage')
          }
        } catch (e) {
          // console.log('🏠 Error checking localStorage:', e)
        }
      }
    }

    checkLocalStorageAuth()
    const interval = setInterval(checkLocalStorageAuth, 2000)
    return () => clearInterval(interval)
  }, [])

  // Diagnostic function to run in console
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugNostrAuth = () => {
        console.log('🔍 === NOSTR AUTH DIAGNOSTIC ===')

        // Check script loading
        console.log('📦 Script Loading Status:')
        console.log('   - window.nostr (native API):', !!(window as any).nostr)
        console.log('   - window.NostrLogin (login lib):', !!window.NostrLogin)
        console.log('   - window.nostrLogin (login data):', !!window.nostrLogin)

        // Check if scripts are in DOM
        const scripts = document.querySelectorAll('script[src*="unpkg"]')
        console.log('   - Scripts in DOM:', scripts.length)
        scripts.forEach((script, i) => {
          console.log(`     ${i + 1}. ${script.getAttribute('src')}`)
        })

        console.log('🔑 Authentication Status:')
        console.log('1. window.nostrLogin:', !!window.nostrLogin)
        if (window.nostrLogin) {
          console.log('   - pubkey:', window.nostrLogin.pubkey?.slice(0, 8))
          console.log('   - profile:', window.nostrLogin.profile)
        }

        console.log('2. window.NostrLogin:', !!window.NostrLogin)
        if (window.NostrLogin) {
          console.log('   - available methods:', Object.keys(window.NostrLogin))
        }

        console.log('3. localStorage nl:', localStorage.getItem('nl'))

        console.log('4. React state:')
        console.log('   - isAuthenticated:', isAuthenticated)
        console.log('   - publicKey:', publicKey?.slice(0, 8))
        console.log('   - profile:', profile)

        console.log('5. Global nostr objects:')
        const nostrKeys = Object.keys(window).filter(k => k.toLowerCase().includes('nostr'))
        console.log('   - Found keys:', nostrKeys)

        // Test network connectivity
        console.log('🌐 Network Test:')
        fetch('https://unpkg.com/nostr-login@1.7.11/dist/unpkg.js', { method: 'HEAD' })
          .then(response => console.log('   - unpkg accessible:', response.ok))
          .catch(error => console.log('   - unpkg error:', error.message))

        console.log('🔍 === END DIAGNOSTIC ===')
      }

      // Manual script loading function
      (window as any).loadNostrScripts = () => {
        console.log('🔄 Loading Nostr scripts manually...')

        // Load nostr-tools first
        const script1 = document.createElement('script')
        script1.src = 'https://unpkg.com/nostr-tools@2.5.2/lib/esm/index.js'
        script1.onload = () => {
          console.log('✅ nostr-tools loaded successfully')
          // Then load nostr-login
          const script2 = document.createElement('script')
          script2.src = 'https://unpkg.com/nostr-login@1.7.11/dist/unpkg.js'
          script2.onload = () => console.log('✅ nostr-login loaded successfully')
          script2.onerror = () => console.error('❌ Failed to load nostr-login')
          document.head.appendChild(script2)
        }
        script1.onerror = () => console.error('❌ Failed to load nostr-tools')
        document.head.appendChild(script1)
      }

      console.log('💡 Ejecuta debugNostrAuth() en la consola para diagnóstico completo')
      console.log('💡 Si los scripts no se cargan, ejecuta loadNostrScripts()')
    }
  }, [isAuthenticated, publicKey, profile])

  // Debug: verificar cambios en autenticación
  useEffect(() => {
    // console.log('🏠 Auth state changed - isAuthenticated:', isAuthenticated, 'publicKey:', publicKey?.slice(0, 8))
    // Force re-render to ensure UI updates
    forceUpdate({})
  }, [isAuthenticated, publicKey])
  
  const [userPacks, setUserPacks] = useState<NostrPack[]>([])
  const [isLoadingPacks, setIsLoadingPacks] = useState(false)
  const [packFilter, setPackFilter] = useState<'all' | 'mine'>('all')

  // console.log('🏠 HomePage render - userPacks:', userPacks.length)

  const loadPacksFromNostr = useCallback(async () => {
    setIsLoadingPacks(true)
    try {
      const packs = await nostrClient.getAllPacks()
      
      const uniquePacks = packs.filter((pack, index, arr) => 
        arr.findIndex(p => p.id === pack.id) === index
      )
      
      setUserPacks(uniquePacks)
      console.log("[v0] Loaded all public packs from Nostr:", uniquePacks.length)
    } catch (error) {
      console.error("Error loading packs:", error)
    } finally {
      setIsLoadingPacks(false)
    }
  }, [])

  useEffect(() => {
    if (userPacks.length === 0) {
      loadPacksFromNostr()
    }
  }, [userPacks.length, loadPacksFromNostr])

  const handleEditPack = useCallback((packId: string) => {
    router.push(`/pack/${packId}`)
  }, [router])

  const handleDeletePack = useCallback(async (packId: string) => {
    if (!publicKey) return

    try {
      await nostrClient.deletePack(packId, publicKey)
      setUserPacks(prev => prev.filter(pack => pack.id !== packId))
    } catch (error) {
      console.error("Error deleting pack:", error)
      throw error
    }
  }, [publicKey])

  const handleCreatePack = useCallback(async (packData: { name: string; description: string; npubs: string[]; tags: string[] }) => {
    if (!publicKey || !isAuthenticated) {
      console.warn("User not authenticated")
      return
    }

    try {
      const event = await nostrClient.createScammerPack(packData, publicKey)

      const newPack: NostrPack = {
        id: event.tags.find((t) => t[0] === "d")?.[1] || event.id,
        name: packData.name,
        description: packData.description,
        npubs: packData.npubs,
        tags: packData.tags,
        creator: {
          name: profile?.name || "Nostr User",
          pubkey: publicKey,
          picture: profile?.picture,
        },
        scammerCount: packData.npubs.length,
        createdAt: new Date(),
        updatedAt: new Date(),
        eventId: event.id,
      }

      setUserPacks(prev => {
        const existingIndex = prev.findIndex(p => p.id === newPack.id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = newPack
          return updated
        }
        return [newPack, ...prev]
      })
      console.log("[v0] Pack published to Nostr successfully")
    } catch (error) {
      console.error("Error creating pack:", error)
      throw error
    }
  }, [publicKey, isAuthenticated, profile])

  // Filter packs based on selected filter
  const filteredPacks = userPacks.filter(pack => {
    if (packFilter === 'mine' && publicKey) {
      return pack.creator.pubkey === publicKey
    }
    return true // 'all' filter shows all packs
  })

  // Debug logging for filter
  console.log('🔍 Filter Debug:', {
    packFilter,
    totalPacks: userPacks.length,
    filteredPacks: filteredPacks.length,
    publicKey: publicKey?.slice(0, 8),
    packCreators: userPacks.map(p => ({
      name: p.name,
      creator: p.creator.pubkey.slice(0, 8),
      isYours: p.creator.pubkey === publicKey
    }))
  })

  const formatTimeAgo = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date

    if (isNaN(dateObj.getTime())) {
      return "unknown"
    }

    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "just now"
    if (diffInHours < 24) return `${diffInHours} hours ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return "1 day ago"
    if (diffInDays < 7) return `${diffInDays} days ago`

    return dateObj.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">NostrGuard</h1>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 p-2 rounded-lg hover:bg-accent">
                      <Avatar className="h-8 w-8">
                        {profile?.picture ? (
                          <AvatarImage src={profile.picture} alt={profile?.name || "Profile"} />
                        ) : null}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {publicKey ? publicKey.slice(-4).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{profile?.name || "Nostr User"}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="cursor-default focus:bg-transparent">
                      <div className="flex flex-col">
                        <span className="font-medium">{profile?.name || "Nostr User"}</span>
                        <span className="text-xs text-muted-foreground">
                          {publicKey ? `${publicKey.slice(0, 16)}...` : ""}
                        </span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={disconnect}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-balance">Protect your Nostr experience from scammers</h2>
          <p className="text-xl text-muted-foreground text-pretty">
            Manage curated packs of suspicious accounts and block them all with a single click. Keep your feed clean and
            secure.
          </p>

          {isAuthenticated ? (
            <div className="pt-8 space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 max-w-md mx-auto">
                <div className="flex items-center gap-3 justify-center text-purple-700">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Connected to Nostr!</span>
                </div>
                <p className="text-purple-600 text-sm mt-2">You can now create and manage scammer packs</p>
              </div>

              <div className="flex justify-center">
                <CreatePackDialog onCreatePack={handleCreatePack}>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Pack
                  </Button>
                </CreatePackDialog>
              </div>

              {userPacks.length > 0 && (
                <div className="max-w-6xl mx-auto mt-12">
                  <div className="mb-6 flex items-center justify-center gap-4">
                    <h3 className="text-2xl font-bold text-foreground">Public Packs</h3>
                    <select 
  value={packFilter} 
  onChange={(e) => setPackFilter(e.target.value as 'all' | 'mine')}
  className="border rounded px-3 py-1 bg-background text-foreground"
>
  <option value="all">All packs</option>
  <option value="mine">Your packs</option>
</select>
                  </div>
                  <p className="text-muted-foreground text-center mb-6">
                    {packFilter === 'all'
                      ? 'Community-maintained scammer packs'
                      : 'Packs created by you'
                    }
                    <span className="ml-2 text-sm">
                      ({filteredPacks.length} of {userPacks.length} packs)
                    </span>
                  </p>
                  
                  <MyPacksList
                    packs={filteredPacks}
                    onEditPack={publicKey ? handleEditPack : undefined}
                    onDeletePack={publicKey ? handleDeletePack : undefined}
                    currentUserPubkey={publicKey || undefined}
                    isLoading={isLoadingPacks}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="pt-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                <div className="text-center text-blue-700">
                  <Shield className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-medium">Click the Nostr login button in the top right to connect</p>
                  <p className="text-sm text-blue-600 mt-1">The login bubble will appear automatically</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Curated Packs</CardTitle>
              <CardDescription>
                Access community-maintained lists of suspicious accounts and known scammers
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-secondary mb-2" />
              <CardTitle>Mass Blocking</CardTitle>
              <CardDescription>Block dozens of accounts simultaneously with a single click</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Lock className="h-8 w-8 text-accent mb-2" />
              <CardTitle>Total Privacy</CardTitle>
              <CardDescription>
                Your private key never leaves your extension. Full control over your data
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>NostrGuard - Community protection for Nostr</p>
            <p className="mt-2">Open source and made by negr0 with eggs.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}