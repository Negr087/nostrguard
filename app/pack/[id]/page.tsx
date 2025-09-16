"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertTriangle,
  Edit,
  Trash2,
  Users,
  Calendar,
  ArrowLeft,
  Shield,
  Copy,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { useNostr } from "@/hooks/use-nostr"
import { useToast } from "@/hooks/use-toast"
import { nostrClient } from "@/lib/nostr-client"
import type { ScammerPack } from "@/lib/nostr"
import { BlockConfirmationDialog } from "@/components/block-confirmation-dialog"
import { useBlockActions } from "@/hooks/use-block-actions"
import { CreatePackDialog } from "@/components/create-pack-dialog"
import { SimplePool } from 'nostr-tools'

interface NostrProfile {
  name?: string
  picture?: string
  about?: string
  nip05?: string
  display_name?: string
}

export default function PackDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { publicKey: hookPubkey, isLoading: nostrLoading, isAuthenticated: hookAuth } = useNostr()
  const { toast } = useToast()
  const { blockAccounts, isProcessing } = useBlockActions()

  const [pack, setPack] = useState<ScammerPack | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copiedNpub, setCopiedNpub] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoadingFromNostr, setIsLoadingFromNostr] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [creatorProfile, setCreatorProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const fetchCreatorProfile = async (pubkey: string) => {
    if (!pubkey || pubkey === "unknown") return;
    
    setLoadingProfile(true)
    try {
      const pool = new SimplePool()
      const relays = [
        "wss://relay.damus.io",
        "wss://nos.lol", 
        "wss://relay.nostr.band",
        "wss://nostr.mom"
      ]
      
      const events = await pool.querySync(relays, { 
        kinds: [0], 
        authors: [pubkey], 
        limit: 1 
      })

      const eventsArray = Array.from(events)
      if (eventsArray.length > 0 && eventsArray[0]?.content) {
        const profileContent = JSON.parse(eventsArray[0].content)
        setCreatorProfile(profileContent)
      }
      pool.close(relays)
    } catch (error) {
      console.error('Error fetching creator profile:', error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const loadPack = async (packId: string) => {
    if (!packId) return;
    setLoadError(null)
    setIsLoadingFromNostr(true)

    try {
      // Try to get pack by ID from Nostr
      const foundPack = await nostrClient.getPackById(packId)

      if (foundPack) {
        setPack(foundPack)
        // Fetch creator profile after pack is loaded
        if (foundPack.creator.pubkey && foundPack.creator.pubkey !== "unknown") {
          fetchCreatorProfile(foundPack.creator.pubkey)
        }
        return
      }

      // If not found by event ID, try to find in user's packs
      if (hookPubkey) {
        const userPacks = await nostrClient.getUserPacks(hookPubkey)
        const userPack = userPacks.find((p) => p.id === packId)

        if (userPack) {
          setPack(userPack)
          // Fetch creator profile after pack is loaded
          if (userPack.creator.pubkey && userPack.creator.pubkey !== "unknown") {
            fetchCreatorProfile(userPack.creator.pubkey)
          }
          return
        }
      }

      // If still not found, search all packs
      const allPacks = await nostrClient.getAllPacks()
      const foundInAll = allPacks.find((p) => p.id === packId)

      if (foundInAll) {
        setPack(foundInAll)
        // Fetch creator profile after pack is loaded
        if (foundInAll.creator.pubkey && foundInAll.creator.pubkey !== "unknown") {
          fetchCreatorProfile(foundInAll.creator.pubkey)
        }
        return
      }

      setLoadError("Pack not found")
    } catch (error) {
      console.error("Error loading pack:", error)
      setLoadError("Failed to load pack from Nostr network")
    } finally {
      setIsLoadingFromNostr(false)
    }
  }

  const handleRefresh = () => {
    if (params.id) {
      setCreatorProfile(null) // Reset profile when refreshing
      loadPack(params.id as string)
    }
  }

  useEffect(() => {
    if (!params.id || nostrLoading) return;
    loadPack(params.id as string);
  }, [params.id, hookPubkey, nostrLoading])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const copyToClipboard = async (npub: string) => {
    try {
      await navigator.clipboard.writeText(npub)
      setCopiedNpub(npub)
      setTimeout(() => setCopiedNpub(null), 2000)
      toast({
        title: "Copied",
        description: "Npub copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy npub",
        variant: "destructive",
      })
    }
  }

  const handleBlockAll = () => {
    setDialogOpen(true)
  }

  const handleConfirmBlock = async () => {
    if (!pack || !hookPubkey) return;

    try {
      const success = await blockAccounts(pack.npubs, pack.name)
      if (success) {
        toast({
          title: "Accounts Blocked",
          description: `Successfully blocked ${pack.npubs.length} accounts`,
        })
        setDialogOpen(false)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block accounts",
        variant: "destructive",
      })
    }
  }

  const handleEdit = () => {
    if (!pack) return;
    setIsEditModalOpen(true)
  }

  const handleUpdatePack = async (updatedData: { name: string; description: string; npubs: string[]; tags: string[] }) => {
    if (!pack || !hookPubkey) return

    try {
      const updatedEvent = await nostrClient.updatePack(pack.id, updatedData, hookPubkey)

      const updatedPack = {
        ...pack,
        name: updatedData.name,
        description: updatedData.description,
        npubs: updatedData.npubs,
        tags: updatedData.tags,
        scammerCount: updatedData.npubs.length,
        updatedAt: new Date()
      }

      setPack(updatedPack)
      setIsEditModalOpen(false)

      toast({
        title: "Pack Updated",
        description: "Your pack has been updated successfully"
      })
    } catch (error) {
      console.error("Error updating pack:", error)
      toast({
        title: "Error",
        description: "Failed to update pack",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!pack || !confirm(`Are you sure you want to delete "${pack.name}"?`)) return

    setIsDeleting(true)
    try {
      if (hookAuth && hookPubkey === pack.creator.pubkey) {
        await nostrClient.deletePack(pack.id, hookPubkey)

        toast({
          title: "Pack Deleted",
          description: `Pack "${pack.name}" has been deleted from Nostr`,
        })
      } else {
        toast({
          title: "Error",
          description: "You can only delete your own packs",
          variant: "destructive",
        })
        return
      }

      router.push("/")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete pack",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (nostrLoading || isLoadingFromNostr) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p>Loading pack...</p>
          {isLoadingFromNostr && <p className="text-sm text-muted-foreground">Searching in Nostr network...</p>}
        </div>
      </div>
    )
  }

  if (!pack && !loadError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pack Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested pack could not be found.</p>
          <div className="space-y-2">
            <Button onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Search Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Error Loading Pack</h1>
          <p className="text-muted-foreground mb-4">{loadError}</p>
          <div className="space-y-2">
            <Button onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!pack) return null

  const isOwner = hookPubkey === pack?.creator.pubkey
  const isNostrPack = pack.creator && pack.creator.pubkey !== "unknown"
  
  // Get display info for creator
  const displayName = creatorProfile?.name || pack.creator.name
  const displayPicture = creatorProfile?.picture

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Connection Status */}
          {isNostrPack && (
            <div className="mb-4">
              <Badge variant="default">🌐 Loaded from Nostr</Badge>
            </div>
          )}
        </div>

        <div className="grid gap-6">
          {/* Pack Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    {pack.name}
                  </CardTitle>
                  <CardDescription className="text-base">{pack.description}</CardDescription>
                  
                  {/* Creator info with avatar */}
                  {isNostrPack && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Created by</span>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          {loadingProfile ? (
                            <AvatarFallback className="text-[8px] bg-gray-300">
                              <Loader2 className="h-3 w-3 animate-spin" />
                            </AvatarFallback>
                          ) : (
                            <>
                              <AvatarImage 
                                src={displayPicture} 
                                alt={displayName} 
                              />
                              <AvatarFallback className="text-[8px] bg-purple-500 text-white font-medium">
                                {displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        <span className="font-medium">{displayName}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>

                  {isOwner && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleEdit} disabled={!hookAuth}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDelete}
                        disabled={!hookAuth || isDeleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{pack.npubs.length} accounts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Created {formatDate(pack.createdAt)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {pack.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              <Button onClick={handleBlockAll} className="w-full sm:w-auto" disabled={isProcessing || !hookAuth}>
                <Shield className="h-4 w-4 mr-2" />
                {!hookAuth ? "Login to Block All" : "Block All Accounts"}
              </Button>
              {!hookAuth && (
                <p className="text-sm text-muted-foreground mt-2">You need to be logged in to block accounts</p>
              )}
            </CardContent>
          </Card>

          {/* Accounts List */}
          <Card>
            <CardHeader>
              <CardTitle>Scammer Accounts ({pack.npubs.length})</CardTitle>
              <CardDescription>List of all npubs included in this pack. Click to copy.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pack.npubs.map((npub, index) => (
                  <div key={npub} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground">#{index + 1}</span>
                      <code className="text-sm font-mono break-all">{npub}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(npub)}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      {copiedNpub === npub ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BlockConfirmationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pack={pack}
        action="block"
        onConfirm={handleConfirmBlock}
        isProcessing={isProcessing}
      />
      
      {/* Modal de edición usando CreatePackDialog */}
      <CreatePackDialog 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onCreatePack={handleUpdatePack}
        initialData={{
          name: pack.name,
          description: pack.description,
          npubs: pack.npubs,
          tags: pack.tags
        }}
        mode="edit"
      />
    </>
  )
}