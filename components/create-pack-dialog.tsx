"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, X, AlertCircle, Loader2 } from "lucide-react"
import { useNostr } from "@/hooks/use-nostr"
import { nip19 } from "nostr-tools"

interface CreatePackDialogProps {
  onCreatePack: (packData: { name: string; description: string; npubs: string[]; tags: string[] }) => void
  children?: React.ReactNode
  // Nuevas props para modo edición
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialData?: {
    name: string
    description: string
    npubs: string[]
    tags: string[]
  }
  mode?: 'create' | 'edit'
}

export function CreatePackDialog({ 
  onCreatePack, 
  children, 
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialData,
  mode = 'create'
}: CreatePackDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { publicKey, isAuthenticated } = useNostr()

  // Usar estado controlado si se proporciona, sino usar estado interno
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const onOpenChange = controlledOnOpenChange || setInternalOpen

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    npubs: "",
    tags: "",
  })

  const [npubsList, setNpubsList] = useState<string[]>([])
  const [tagsList, setTagsList] = useState<string[]>([])

  // Cargar datos iniciales cuando se abre el modal en modo edición
  useEffect(() => {
    if (open && initialData && mode === 'edit') {
      setFormData({
        name: initialData.name,
        description: initialData.description,
        npubs: "",
        tags: "",
      })
      setNpubsList([...initialData.npubs])
      setTagsList([...initialData.tags])
      setError(null)
    }
  }, [open, initialData, mode])

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
    if (!isAuthenticated || !publicKey) {
      setError("You must be logged in to create a pack.")
      return
    }

    if (!formData.name.trim() || npubsList.length === 0) {
      setError("Pack name and at least one NPUB are required.")
      return
    }

    setIsPublishing(true)
    setError(null)

    try {
      const packData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        npubs: npubsList,
        tags: tagsList,
      }

      // Call the parent callback which will handle Nostr publishing
      await onCreatePack(packData)

      // Reset form
      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error("[CreatePackDialog] Error creating/updating pack:", error)
      setError(`Failed to ${mode} pack. Please try again.`)
    } finally {
      setIsPublishing(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", npubs: "", tags: "" })
    setNpubsList([])
    setTagsList([])
    setError(null)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const isValid = formData.name.trim() && npubsList.length > 0 && isAuthenticated

  const dialogTitle = mode === 'edit' ? 'Edit Pack' : 'Create New Pack'
  const dialogDescription = mode === 'edit' 
    ? 'Update your pack information and accounts'
    : 'Create a new pack of scammer accounts to share with the Nostr community'
  const submitButtonText = mode === 'edit' 
    ? (isPublishing ? 'Updating...' : 'Update Pack')
    : (isPublishing ? 'Publishing to Nostr...' : 'Create Pack')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      {!children && mode === 'create' && (
        <DialogTrigger asChild>
          <Button disabled={!isAuthenticated}>
            <Plus className="w-4 h-4 mr-2" />
            Create Pack
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {!isAuthenticated && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You must be logged in with Nostr to {mode} packs.</AlertDescription>
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
            <Label htmlFor="name">Pack Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Crypto Impersonators"
              disabled={!isAuthenticated}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the type of scammer accounts in this pack..."
              rows={3}
              disabled={!isAuthenticated}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="npubs">
              Add NPUBs * <span className="text-sm text-muted-foreground">({npubsList.length} added)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="npubs"
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
            <Label htmlFor="tags">
              Tags <span className="text-sm text-muted-foreground">({tagsList.length} added)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="tags"
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
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPublishing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPublishing}>
            {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
