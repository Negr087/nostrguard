"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Shield, LogOut, Settings, ChevronDown, User } from "lucide-react"
import { useNostr } from "@/hooks/use-nostr"
import Link from "next/link"

export function DashboardHeader() {
  const { publicKey, disconnect, profile, isAuthenticated, showLoginModal } = useNostr()

  const getInitials = (pubkey: string) => {
    return pubkey.slice(0, 2).toUpperCase()
  }

  const getDisplayName = () => {
    if (profile?.name) return profile.name
    if (publicKey) return `${publicKey.slice(0, 8)}...`
    return "User"
  }

  const handleLogout = () => {
    try {
      disconnect()
    } catch (error) {
      console.error("Logout failed, showing login modal:", error)
      // If logout fails, show the login modal as fallback
      showLoginModal()
    }
  }

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">NostrGuard</h1>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/packs">
              <Button variant="ghost" size="sm">
                View Packs
              </Button>
            </Link>

            {isAuthenticated ? (
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        {profile?.picture ? (
          <AvatarImage src={profile.picture} alt={profile?.name || "Profile"} />
        ) : null}
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {publicKey ? getInitials(publicKey) : "U"}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{getDisplayName()}</span>
    </div>
    
    {/* Solo la burbuja de nostr-login */}
    <Button
      onClick={showLoginModal}
      variant="default"
      size="sm"
      className="bg-green-600 hover:bg-green-700"
    >
      <User className="h-4 w-4 mr-1" />
      Manage
    </Button>
  </div>
) : (
  <Button onClick={showLoginModal} variant="default" size="sm">
    <User className="h-4 w-4 mr-2" />
    Login
  </Button>
)}
          </div>
        </div>
      </div>
    </header>
  )
}
