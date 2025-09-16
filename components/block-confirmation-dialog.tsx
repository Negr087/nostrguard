"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Shield, Loader2 } from "lucide-react"
import type { NostrPack } from "@/lib/types"

interface BlockConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pack: NostrPack | null
  action: "block" | null
  onConfirm: () => Promise<void>
  isProcessing: boolean
  progressCount?: number // Cantidad de accounts procesados
}

export function BlockConfirmationDialog({
  open,
  onOpenChange,
  pack,
  action,
  onConfirm,
  isProcessing,
}: BlockConfirmationDialogProps) {
  const [progress, setProgress] = useState(0)

  if (!pack || !action) return null

  const actionText = "block"
  const actionPastText = "blocked"
  const Icon = Shield

  const handleConfirm = async () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      await onConfirm()
      setProgress(100)
      setTimeout(() => {
        onOpenChange(false)
        setProgress(0)
      }, 1000)
    } catch (error) {
      clearInterval(interval)
      setProgress(0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <DialogTitle>Confirm mass {actionText}</DialogTitle>
          </div>
          <DialogDescription>
            You are about to {actionText} all accounts from pack "{pack.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  This action will affect {pack.npubs.length} accounts
                </p>
                <p className="text-xs text-destructive/80">
  A mute list event (kind 10000) will be published to your configured Nostr relays, blocking these accounts across all compatible clients.
</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Pack details:</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <strong>Name:</strong> {pack.name}
              </p>
              <p>
                <strong>Description:</strong> {pack.description}
              </p>
              <p>
                <strong>Accounts:</strong> {pack.npubs.length}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {pack.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              This will update your mute list across all Nostr clients that support NIP-51.
            </p>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Icon className="h-4 w-4 mr-2" />
                Block {pack.npubs.length} accounts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
