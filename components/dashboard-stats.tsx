"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Users, AlertTriangle, TrendingUp } from "lucide-react"

interface DashboardStatsProps {
  totalPacks: number
  totalBlockedAccounts: number
  myPacks: number
  recentBlocks: number
}

export function DashboardStats({ totalPacks, totalBlockedAccounts, myPacks, recentBlocks }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paquetes Disponibles</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPacks}</div>
          <p className="text-xs text-muted-foreground">Paquetes curados por la comunidad</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cuentas Protegidas</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalBlockedAccounts}</div>
          <p className="text-xs text-muted-foreground">Estafadores identificados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mis Paquetes</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{myPacks}</div>
          <p className="text-xs text-muted-foreground">Paquetes que has creado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Bloqueos Recientes</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentBlocks}</div>
          <p className="text-xs text-muted-foreground">Últimos 7 días</p>
        </CardContent>
      </Card>
    </div>
  )
}
