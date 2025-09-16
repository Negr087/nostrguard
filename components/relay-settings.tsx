// components/relay-settings.tsx

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle, Clock, Plus, Trash2, TestTube, RefreshCw, Globe, Zap } from "lucide-react"
import { useRelayManager } from "@/hooks/use-relay-manager"
import { useToast } from "@/hooks/use-toast"
import type { RelayInfo } from "@/lib/relay-config"

interface RelaySettingsProps {
  userPubkey?: string
}

export function RelaySettings({ userPubkey }: RelaySettingsProps) {
  const {
    relays,
    stats,
    connectionStatuses,
    updateRelay,
    addRelay,
    removeRelay,
    resetToDefaults,
    addRegionalRelays,
    testRelay,
    testAllRelays,
    isTestingAll,
    getRecommendedRelays
  } = useRelayManager(userPubkey)

  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [testingRelays, setTestingRelays] = useState<Set<string>>(new Set())
  
  // New relay form
  const [newRelay, setNewRelay] = useState({
    url: "",
    name: "",
    description: "",
    read: true,
    write: true,
    enabled: true
  })

  const getConnectionStatus = (url: string) => {
    return connectionStatuses.find(status => status.url === url)
  }

  const getStatusIcon = (url: string) => {
    const status = getConnectionStatus(url)
    if (!status) return <Clock className="h-4 w-4 text-gray-400" />
    
    if (status.connecting) return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
    if (status.connected) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status.error) return <AlertCircle className="h-4 w-4 text-red-500" />
    
    return <Clock className="h-4 w-4 text-gray-400" />
  }

  const getStatusText = (url: string) => {
    const status = getConnectionStatus(url)
    if (!status) return "Unknown"
    
    if (status.connecting) return "Connecting..."
    if (status.connected) return "Connected"
    if (status.error) return status.error
    
    return "Disconnected"
  }

  const handleUpdateRelay = (url: string, updates: Partial<RelayInfo>) => {
    const success = updateRelay(url, updates)
    if (success) {
      toast({
        title: "Relay Updated",
        description: `Relay settings have been updated`,
      })
    }
  }

  const handleAddRelay = () => {
    if (!newRelay.url || !newRelay.name) {
      toast({
        title: "Invalid Input",
        description: "Please provide at least a URL and name for the relay",
        variant: "destructive"
      })
      return
    }

    // Validate WebSocket URL
    if (!newRelay.url.startsWith('wss://') && !newRelay.url.startsWith('ws://')) {
      toast({
        title: "Invalid URL",
        description: "Relay URL must start with wss:// or ws://",
        variant: "destructive"
      })
      return
    }

    const success = addRelay(newRelay)
    if (success) {
      toast({
        title: "Relay Added",
        description: `${newRelay.name} has been added to your relay list`,
      })
      setNewRelay({
        url: "",
        name: "",
        description: "",
        read: true,
        write: true,
        enabled: true
      })
      setShowAddDialog(false)
    } else {
      toast({
        title: "Failed to Add Relay",
        description: "This relay might already exist",
        variant: "destructive"
      })
    }
  }

  const handleRemoveRelay = (url: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      const success = removeRelay(url)
      if (success) {
        toast({
          title: "Relay Removed",
          description: `${name} has been removed from your relay list`,
        })
      }
    }
  }

  const handleTestRelay = async (url: string, name: string) => {
    setTestingRelays(prev => new Set([...prev, url]))
    
    try {
      const result = await testRelay(url)
      toast({
        title: result.success ? "Connection Successful" : "Connection Failed",
        description: result.success 
          ? `${name} responded in ${result.responseTime}ms`
          : `${name}: ${result.error}`,
        variant: result.success ? "default" : "destructive"
      })
    } finally {
      setTestingRelays(prev => {
        const newSet = new Set(prev)
        newSet.delete(url)
        return newSet
      })
    }
  }

  const handleTestAll = async () => {
    await testAllRelays()
    toast({
      title: "Connectivity Test Complete",
      description: "All relays have been tested for connectivity",
    })
  }

  const handleResetToDefaults = () => {
    if (confirm("Are you sure you want to reset to default relay configuration? This will remove all custom relays.")) {
      resetToDefaults()
      toast({
        title: "Reset Complete",
        description: "Relay configuration has been reset to defaults",
      })
    }
  }

  const handleAddRegionalRelays = (region: string) => {
    const success = addRegionalRelays(region)
    if (success) {
      toast({
        title: "Regional Relays Added",
        description: `${region} relays have been added to your configuration`,
      })
    } else {
      toast({
        title: "No New Relays",
        description: "No new relays were added (they may already exist)",
      })
    }
  }

  const recommendedRelays = getRecommendedRelays(3)

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Relay Network Status
          </CardTitle>
          <CardDescription>
            Overview of your relay connections and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Relays</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
              <div className="text-sm text-muted-foreground">Enabled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.connected}</div>
              <div className="text-sm text-muted-foreground">Connected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.connecting}</div>
              <div className="text-sm text-muted-foreground">Connecting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button 
              onClick={handleTestAll} 
              disabled={isTestingAll}
              size="sm"
            >
              {isTestingAll ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Test All Relays
            </Button>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Relay
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Relay</DialogTitle>
                  <DialogDescription>
                    Add a custom Nostr relay to your configuration
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="relay-url">WebSocket URL *</Label>
                    <Input
                      id="relay-url"
                      placeholder="wss://relay.example.com"
                      value={newRelay.url}
                      onChange={(e) => setNewRelay(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="relay-name">Name *</Label>
                    <Input
                      id="relay-name"
                      placeholder="My Relay"
                      value={newRelay.name}
                      onChange={(e) => setNewRelay(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="relay-description">Description</Label>
                    <Input
                      id="relay-description"
                      placeholder="Optional description"
                      value={newRelay.description}
                      onChange={(e) => setNewRelay(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newRelay.read}
                        onCheckedChange={(checked) => setNewRelay(prev => ({ ...prev, read: checked }))}
                      />
                      <Label>Read</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newRelay.write}
                        onCheckedChange={(checked) => setNewRelay(prev => ({ ...prev, write: checked }))}
                      />
                      <Label>Write</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={newRelay.enabled}
                        onCheckedChange={(checked) => setNewRelay(prev => ({ ...prev, enabled: checked }))}
                      />
                      <Label>Enabled</Label>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddRelay}>
                      Add Relay
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Select onValueChange={handleAddRegionalRelays}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Add regional relays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="north-america">North America</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
                <SelectItem value="asia">Asia</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetToDefaults}
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Relays */}
      {recommendedRelays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Recommended Relays
            </CardTitle>
            <CardDescription>
              These relays are performing well and recommended for optimal experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recommendedRelays.map((relay) => (
                <Badge key={relay.url} variant="secondary" className="flex items-center gap-1">
                  {getStatusIcon(relay.url)}
                  {relay.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relay List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Relays</CardTitle>
          <CardDescription>
            Manage your Nostr relay connections and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {relays.map((relay) => {
              const status = getConnectionStatus(relay.url)
              const isTestingRelay = testingRelays.has(relay.url)
              
              return (
                <div key={relay.url} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(relay.url)}
                        <h3 className="font-medium">{relay.name}</h3>
                        <Badge variant={relay.enabled ? "default" : "secondary"}>
                          Priority {relay.priority}
                        </Badge>
                        {relay.region && (
                          <Badge variant="outline">{relay.region}</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {relay.description || relay.url}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className={`flex items-center gap-1 ${
                          status?.connected ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {getStatusText(relay.url)}
                        </span>
                        
                        {relay.avgResponseTime && (
                          <span className="text-muted-foreground">
                            ~{relay.avgResponseTime}ms
                          </span>
                        )}
                        
                        {relay.connectionCount && (
                          <span className="text-muted-foreground">
                            {relay.connectionCount} connections
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={relay.enabled}
                          onCheckedChange={(checked) => 
                            handleUpdateRelay(relay.url, { enabled: checked })
                          }
                        />
                        <Label className="text-xs">Enabled</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={relay.read}
                          onCheckedChange={(checked) => 
                            handleUpdateRelay(relay.url, { read: checked })
                          }
                        />
                        <Label className="text-xs">Read</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={relay.write}
                          onCheckedChange={(checked) => 
                            handleUpdateRelay(relay.url, { write: checked })
                          }
                        />
                        <Label className="text-xs">Write</Label>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestRelay(relay.url, relay.name)}
                        disabled={isTestingRelay}
                      >
                        {isTestingRelay ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRelay(relay.url, relay.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
