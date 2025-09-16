"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, AlertCircle, Loader2 } from "lucide-react"
import { useNostr } from "@/hooks/use-nostr"
import { nip19 } from "nostr-tools"
import type { NostrPack } from "@/lib/nostr-client"

interface EditPackDialogProps {
  pack: NostrPack | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditPack: (packData: { name: string; description: string; npubs: string[]; tags: string[] }) => Promise<void>
}

export function EditPackDialog({ pack, open, onOpenChange, onEditPack }: EditPackDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { publicKey, isAuthenticated } = useNostr()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    npubs: "",
    tags: "",
  })

  const [npubsList, setNpubsList] = useState<string[]>([])
  const [tagsList, setTagsList] = useState<string[]>([])

  useEffect(() => {
    if (pack && open) {
      setFormData({
        name: pack.name,
        description: pack.description,
        npubs: "",
        tags: "",
      })
      setNpubsList([...pack.npubs])
      setTagsList([...pack.tags])
      setError(null)
    }
  }, [pack, open])

  const isValidNpub = (npub: string): boolean => {
    try {
      if (!npub.startsWith("npub1") || npub.length !== 63) {
        return false
      }
      const decoded = nip19.decode(npub)
      return decoded.type === "npub"
    } catch {
      return false
    }
  }

  const handleAddNpub = () => {
    const npub = formData.npubs.trim()
    if (!npub) return

    if (!isValidNpub(npub)) {
      setError("Invalid NPUB format. Must be a valid npub1... address.")
      return
    }

    if (npubsList.includes(npub)) {
      setError("This NPUB is already in the list.")
      return
    }

    setNpubsList([...npubsList, npub])
    setFormData({ ...formData, npubs: "" })
    setError(null)
  }

  const handleAddTag = () => {
    const tag = formData.tags.trim().toLowerCase()
    if (!tag) return

    const cleanTag = tag.startsWith("#") ? tag.slice(1) : tag

    if (tagsList.includes(cleanTag)) {
      setError("This tag is already in the list.")
      return
    }

    setTagsList([...tagsList, cleanTag])
    setFormData({ ...formData, tags: "" })
    setError(null)
  }

  const handleRemoveNpub = (npub: string) => {
    setNpubsList(npubsList.filter((n) => n !== npub))
    setError(null)
  }

  const handleRemoveTag = (tag: string) => {
    setTagsList(tagsList.filter((t) => t !== tag))
  }

  const handleSubmit = async () => {
    if (!isAuthenticated || !publicKey || !pack) {
      setError("You must be logged in to edit a pack.")
      return
    }

    if (!formData.name.trim() || npubsList.length === 0) {
      setError("Pack name and at least one NPUB are required.")
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      const packData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        npubs: npubsList,
        tags: tagsList,
      }

      await onEditPack(packData)
      onOpenChange(false)
    } catch (error) {
      console.error("[EditPackDialog] Error updating pack:", error)
      setError("Failed to update pack. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null)
    }
    onOpenChange(newOpen)
  }

  const isValid = formData.name.trim() && npubsList.length > 0 && isAuthenticated

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pack</DialogTitle>
          <DialogDescription>Update your scammer pack details and accounts</DialogDescription>
        </DialogHeader>

        {!isAuthenticated && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You must be logged in with Nostr to edit packs.</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Pack Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Crypto Impersonators"
              disabled={!isAuthenticated}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the type of scammer accounts in this pack..."
              rows={3}
              disabled={!isAuthenticated}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-npubs">
              Add NPUBs * <span className="text-sm text-muted-foreground">({npubsList.length} total)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="edit-npubs"
                value={formData.npubs}
                onChange={(e) => setFormData({ ...formData, npubs: e.target.value })}
                placeholder="npub1..."
                onKeyPress={(e) => e.key === "Enter" && handleAddNpub()}
                disabled={!isAuthenticated}
              />
              <Button
                type="button"
                onClick={handleAddNpub}
                variant="outline"
                disabled={!isAuthenticated || !formData.npubs.trim()}
              >
                Add
              </Button>
            </div>
            {npubsList.length > 0 && (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                {npubsList.map((npub) => (
                  <Badge key={npub} variant="secondary" className="text-xs">
                    {npub.slice(0, 16)}...
                    <button
                      onClick={() => handleRemoveNpub(npub)}
                      className="ml-2 hover:text-destructive"
                      disabled={!isAuthenticated}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tags">
              Tags <span className="text-sm text-muted-foreground">({tagsList.length} total)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="scammer, bot, impersonation"
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                disabled={!isAuthenticated}
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="outline"
                disabled={!isAuthenticated || !formData.tags.trim()}
              >
                Add
              </Button>
            </div>
            {tagsList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tagsList.map((tag) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 hover:text-destructive"
                      disabled={!isAuthenticated}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isUpdating}>
            {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isUpdating ? "Updating..." : "Update Pack"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
