"use client"

import { useState } from "react"
import { ScammerPackCard } from "./scammer-pack-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Plus, Shield } from "lucide-react"
import { getScammerPacks, getAllTags } from "@/lib/scammer-packs"
import type { ScammerPack } from "@/lib/nostr"
import { useToast } from "@/hooks/use-toast"
import { useNostr } from "@/hooks/use-nostr"

export function ScammerPacksGrid() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const { isAuthenticated } = useNostr()
  const [packs] = useState<ScammerPack[]>(getScammerPacks(isAuthenticated))
  const { toast } = useToast()

  const allTags = getAllTags()

  const filteredPacks = packs.filter((pack) => {
    const matchesSearch =
      pack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pack.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => pack.tags.includes(tag))
    return matchesSearch && matchesTags
  })

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const handleViewDetails = (packId: string) => {
    toast({
      title: "Coming Soon",
      description: "Detailed view will be available soon",
    })
  }

  if (isAuthenticated && packs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Scammer Packs</h2>
            <p className="text-muted-foreground">No packs available yet</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Pack
          </Button>
        </div>

        <div className="text-center py-12 space-y-4">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Welcome to NostrGuard</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You're now connected! Start by creating your first scammer pack or wait for the community to contribute
              packs.
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Pack
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scammer Packs</h2>
          <p className="text-muted-foreground">
            {isAuthenticated
              ? `${filteredPacks.length} packs available`
              : `${filteredPacks.length} demo packs (login to see real packs)`}
          </p>
        </div>
        {isAuthenticated && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Pack
          </Button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Demo Mode</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            You're viewing demo packs. Login with Nostr to access real scammer packs and create your own.
          </p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by:</span>
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/80"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
          {selectedTags.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="text-xs">
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Packs Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPacks.map((pack) => (
          <ScammerPackCard key={pack.id} pack={pack} onViewDetails={handleViewDetails} />
        ))}
      </div>

      {filteredPacks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No packs found matching your search</p>
        </div>
      )}
    </div>
  )
}
