"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertTriangle, Edit, Trash2, Users, Calendar } from "lucide-react"
import { SimplePool } from 'nostr-tools'
import type { NostrPack } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface MyPacksListProps {
  packs: NostrPack[]
  onEditPack?: (packId: string) => void
  onDeletePack?: (packId: string) => Promise<void>
  currentUserPubkey?: string
  isLoading?: boolean
}

export function MyPacksList({ packs, onEditPack, onDeletePack, currentUserPubkey, isLoading = false }: MyPacksListProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, any>>({})

  useEffect(() => {
  let pools: SimplePool[] = []

  const fetchCreatorProfiles = async () => {
    for (const pack of packs) {
      if (pack.creator.pubkey && !creatorProfiles[pack.creator.pubkey]) {
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
              authors: [pack.creator.pubkey], 
              limit: 1 
            })

            const eventsArray = Array.from(events)
            if (eventsArray.length > 0 && eventsArray[0]?.content) {
              const profileContent = JSON.parse(eventsArray[0].content)
              setCreatorProfiles(prev => ({
                ...prev,
                [pack.creator.pubkey]: profileContent
              }))
            }
            pool.close(relays)
          } catch (error) {
            console.error('Error fetching creator profile:', error)
          }
        }
      }
    }

    if (packs.length > 0) {
    fetchCreatorProfiles()
  }

  // Cleanup function
  return () => {
    pools.forEach(pool => pool.close([]))
    setCreatorProfiles({})
  }
}, [packs]) // Quitar creatorProfiles de las dependencias para evitar loop infinito

  const formatDate = (date: Date | number) => {
    const timestamp = typeof date === 'number' ? date : date.getTime()
    const dateObj = new Date(timestamp)
    
    if (isNaN(dateObj.getTime())) {
      return "fecha desconocida"
    }

    return dateObj.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTimeAgo = (date: Date | number) => {
    const timestamp = typeof date === 'number' ? date : date.getTime()
    const dateObj = new Date(timestamp)
    
    if (isNaN(dateObj.getTime())) {
      return "unknown"
    }

    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60))

    if (diffInHours < 1) return "hace poco"
    if (diffInHours < 24) return `hace ${diffInHours} horas`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return "hace 1 día"
    if (diffInDays < 7) return `hace ${diffInDays} días`

    return formatDate(dateObj)
  }

  const handleDelete = async (packId: string, packName: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el paquete "${packName}"?`)) {
      try {
        await onDeletePack?.(packId)
        
        toast({
          title: "Paquete eliminado",
          description: `Se eliminó el paquete "${packName}"`,
        })
      } catch (error) {
        console.error("Error deleting pack:", error)
        toast({
          title: "Error",
          description: "No se pudo eliminar el paquete",
          variant: "destructive"
        })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (packs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tienes paquetes creados</h3>
          <p className="text-muted-foreground text-center mb-4">
            Crea tu primer paquete de estafadores para ayudar a proteger la comunidad
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {packs.map((pack, index) => {
        const creatorProfile = creatorProfiles[pack.creator.pubkey]
        const displayName = creatorProfile?.name || pack.creator.name
        const displayPicture = creatorProfile?.picture
        
        return (
          <Card
            key={`${pack.id}-${typeof pack.updatedAt === 'number' ? pack.updatedAt : pack.updatedAt.getTime() || index}`}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/pack/${pack.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage 
                        src={displayPicture} 
                        alt={displayName} 
                      />
                      <AvatarFallback className="text-[10px] bg-purple-500 text-white font-medium">
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {pack.name}
                  </CardTitle>
                  <CardDescription className="text-sm">{pack.description}</CardDescription>
                  
                  {/* Creator info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>por {displayName}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {onEditPack && currentUserPubkey === pack.creator.pubkey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditPack(pack.id)
                      }}
                      title="Editar paquete"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}

                  {onDeletePack && currentUserPubkey === pack.creator.pubkey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(pack.id, pack.name)
                      }}
                      title="Eliminar paquete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{pack.scammerCount || pack.npubs.length} cuentas</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatTimeAgo(pack.updatedAt)}</span>
                </div>
              </div>

              {pack.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {pack.tags.slice(0, 5).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {pack.tags.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{pack.tags.length - 5}
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}