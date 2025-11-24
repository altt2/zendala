import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LogOut, 
  QrCode as QrCodeIcon, 
  Camera, 
  ClipboardList,
  Users,
  CheckCircle,
  Activity
} from "lucide-react";
import logoUrl from "@assets/generated_images/zendala_residential_community_logo.png";

interface AccessLogWithDetails {
  id: string;
  accessedAt: string;
  qrCode: {
    visitorName: string;
    visitorType: string;
    description?: string;
    createdBy: {
      firstName: string;
      lastName: string;
    };
  };
  guard: {
    firstName: string;
    lastName: string;
  };
}

interface DashboardStats {
  accessesToday: number;
  activeCodes: number;
  codesUsedThisWeek: number;
  totalAccesses: number;
}

export default function AdminHome() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");


  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
  });

  const { data: accessLogs, isLoading: logsLoading } = useQuery<AccessLogWithDetails[]>({
    queryKey: ["/api/access-logs"],
    enabled: !!user,
  });

  const filteredLogs = accessLogs?.filter((log) => {
    const matchesSearch = 
      log.qrCode.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.qrCode.createdBy.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.qrCode.createdBy.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.guard.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.guard.lastName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || log.qrCode.visitorType === filterType;
    
    return matchesSearch && matchesType;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Zendala" className="h-10 w-10 object-contain" data-testid="img-header-logo" />
            <div>
              <h1 className="text-xl font-semibold" data-testid="text-page-title">Panel de Administrador</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = "/api/logout"}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md" data-testid="tabs-navigation">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <Activity className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <ClipboardList className="h-4 w-4 mr-2" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statsLoading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </>
              ) : (
                <>
                  <Card data-testid="card-stat-today">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Accesos Hoy</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-stat-today">{stats?.accessesToday || 0}</div>
                      <p className="text-xs text-muted-foreground">Registros del día</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-stat-active">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Códigos Activos</CardTitle>
                      <QrCodeIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-stat-active">{stats?.activeCodes || 0}</div>
                      <p className="text-xs text-muted-foreground">Sin usar</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-stat-week">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Usados Esta Semana</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-stat-week">{stats?.codesUsedThisWeek || 0}</div>
                      <p className="text-xs text-muted-foreground">Últimos 7 días</p>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-stat-total">
                    <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Accesos</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" data-testid="text-stat-total">{stats?.totalAccesses || 0}</div>
                      <p className="text-xs text-muted-foreground">Histórico completo</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="hover-elevate">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Generar Código QR</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crea códigos QR para visitantes, proveedores o prestadores de servicios
                  </p>
                  <Button 
                    onClick={() => window.location.href = "/vecino"}
                    className="w-full h-12"
                    data-testid="button-goto-generate"
                  >
                    <QrCodeIcon className="h-5 w-5 mr-2" />
                    Ir a Generador
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Escanear Código QR</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Lee códigos QR y concede acceso al fraccionamiento
                  </p>
                  <Button 
                    onClick={() => window.location.href = "/guardia"}
                    className="w-full h-12"
                    data-testid="button-goto-scan"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Ir a Escáner
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Filtros de Búsqueda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Buscar</Label>
                    <Input
                      id="search"
                      placeholder="Nombre del visitante o vecino..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-12"
                      data-testid="input-search"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-type">Tipo de Visitante</Label>
                    <select
                      id="filter-type"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      data-testid="select-filter-type"
                    >
                      <option value="all">Todos</option>
                      <option value="visita">Visita</option>
                      <option value="proveedor">Proveedor</option>
                      <option value="prestador">Prestador de Servicios</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold" data-testid="text-history-title">
                Historial de Accesos ({filteredLogs?.length || 0})
              </h2>
              
              {logsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : !filteredLogs || filteredLogs.length === 0 ? (
                <Card className="p-6">
                  <p className="text-center text-muted-foreground" data-testid="text-no-logs">
                    No se encontraron registros
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <Card key={log.id} data-testid={`card-log-${log.id}`}>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Fecha y Hora</p>
                            <p className="text-sm font-mono font-medium" data-testid={`text-log-date-${log.id}`}>
                              {new Date(log.accessedAt).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-sm font-mono">
                              {new Date(log.accessedAt).toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Visitante</p>
                            <p className="text-sm font-semibold" data-testid={`text-log-visitor-${log.id}`}>
                              {log.qrCode.visitorName}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {log.qrCode.visitorType}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Autorizado por</p>
                            <p className="text-sm" data-testid={`text-log-resident-${log.id}`}>
                              {log.qrCode.createdBy.firstName} {log.qrCode.createdBy.lastName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Guardia</p>
                            <p className="text-sm" data-testid={`text-log-guard-${log.id}`}>
                              {log.guard.firstName} {log.guard.lastName}
                            </p>
                          </div>
                        </div>
                        {log.qrCode.description && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground">Descripción</p>
                            <p className="text-sm" data-testid={`text-log-description-${log.id}`}>
                              {log.qrCode.description}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
