"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Calendar, AlertTriangle } from "lucide-react"
import { BlockConfirmationDialog } from "./block-confirmation-dialog"
import { useBlockActions } from "@/hooks/use-block-actions"
import type { NostrPack } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ScammerPackCardProps {
  pack: NostrPack
  onViewDetails?: (packId: string) => void
}

export function ScammerPackCard({ pack, onViewDetails }: ScammerPackCardProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<"block" | null>(null)
  const { blockAccounts, isProcessing, areAccountsBlocked, getBlockedCount } = useBlockActions()

  const allBlocked = areAccountsBlocked(pack.npubs)
  const blockedCount = getBlockedCount(pack.npubs)
  const partiallyBlocked = blockedCount > 0 && blockedCount < pack.npubs.length

  const formatDate = (date: Date | number) => {
  const dateObj = typeof date === 'number' ? new Date(date) : date
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric", 
  })
}

  const handleAction = (action: "block") => {
    setSelectedAction(action)
    setDialogOpen(true)
  }

  const handleConfirm = async () => {
    if (!selectedAction) return

    if (selectedAction === "block") {
      await blockAccounts(pack.npubs, pack.name)
    }
  }

  const handleCardClick = () => {
    router.push(`/pack/${pack.id}`)
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleCardClick}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {pack.name}
              </CardTitle>
              <CardDescription className="text-sm">{pack.description}</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-4 w-4">
              {pack.creator.picture ? (
                <AvatarImage src={pack.creator.picture} alt={pack.creator.name} />
              ) : null}
              <AvatarFallback className="text-xs">
                {pack.creator.name ? pack.creator.name.slice(0, 2).toUpperCase() : pack.creator.pubkey.slice(-2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>By {pack.creator.name || "Nostr User"}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{pack.npubs.length} accounts</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(pack.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {pack.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleAction("block")
              }}
              className="flex-1"
              size="sm"
              disabled={isProcessing || allBlocked}
              variant={allBlocked ? "secondary" : "default"}
            >
              <Shield className="h-4 w-4 mr-2" />
              {allBlocked
                ? "All Blocked"
                : partiallyBlocked
                  ? `Block Remaining (${pack.npubs.length - blockedCount})`
                  : "Block All"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <BlockConfirmationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pack={pack}
        action={selectedAction}
        onConfirm={handleConfirm}
        isProcessing={isProcessing}
      />
    </>
  )
}