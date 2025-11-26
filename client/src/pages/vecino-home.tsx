import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Plus, QrCode as QrCodeIcon, Copy, Check, ArrowLeft, MessageCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { QrCode } from "@shared/schema";
import logoUrl from "@assets/images_1763955668403.png";

export default function VecinoHome() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [visitorName, setVisitorName] = useState("");
  const [visitorType, setVisitorType] = useState("");
  const [description, setDescription] = useState("");
  const [selectedQr, setSelectedQr] = useState<QrCode | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const qrDisplayRef = useRef<HTMLDivElement>(null);


  const { data: qrCodes, isLoading: codesLoading } = useQuery<QrCode[]>({
    queryKey: ["/api/qr-codes"],
    enabled: !!user,
  });

  const createQrMutation = useMutation({
    mutationFn: async (data: { visitorName: string; visitorType: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/qr-codes", data);
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("[Create QR Success] Full data received:", data);
      console.log("[Create QR Success] Code field:", data?.code);
      console.log("[Create QR Success] ID field:", data?.id);
      queryClient.invalidateQueries({ queryKey: ["/api/qr-codes"] });
      setSelectedQr(data);
      setVisitorName("");
      setVisitorType("");
      setDescription("");
      toast({
        title: "Código QR generado",
        description: "El código QR ha sido creado exitosamente",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "No autorizado",
          description: "Sesión expirada. Redirigiendo...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "No se pudo generar el código QR",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !visitorType) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }
    createQrMutation.mutate({ visitorName, visitorType, description });
  };

  const handleCopyCode = () => {
    if (!selectedQr?.code) {
      toast({
        title: "Error",
        description: "No hay código disponible para copiar",
        variant: "destructive",
      });
      return;
    }
    console.log("[Copy Code] Copying code:", selectedQr.code);
    navigator.clipboard.writeText(selectedQr.code).then(() => {
      setCopiedCode(true);
      toast({
        title: "Código copiado",
        description: `${selectedQr.code}`,
      });
      setTimeout(() => setCopiedCode(false), 3000);
    }).catch((err) => {
      console.error("[Copy Code] Error copying:", err);
      toast({
        title: "Error",
        description: "No se pudo copiar el código",
        variant: "destructive",
      });
    });
  };

  const handleShareWhatsApp = async () => {
    if (!selectedQr?.accessPassword || !selectedQr?.code) {
      toast({
        title: "Error",
        description: "No hay contraseña disponible",
        variant: "destructive",
      });
      return;
    }

    try {
      const message = `Hola, aquí está la contraseña de acceso para ${selectedQr.visitorName}:\n\n${selectedQr.accessPassword}\n\nPresentala en la caseta de seguridad.`;

      // Generar imagen PNG del QR
      const qrImageUrl = await QRCode.toDataURL(selectedQr.code, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // Convertir data URL a blob
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const file = new File([blob], `codigo-qr-${selectedQr.visitorName}.png`, { type: 'image/png' });

      // Intentar usar Web Share API (funciona mejor en móvil)
      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Código QR de Acceso',
            text: message,
            files: [file],
          });
          return;
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return; // Usuario canceló
          }
          // Continuar con fallback
        }
      }

      // Fallback: Descargar imagen y abrir WhatsApp
      const link = document.createElement('a');
      link.href = qrImageUrl;
      link.download = `codigo-qr-${selectedQr.visitorName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Imagen descargada",
        description: "La imagen del QR se descargó. Abre WhatsApp y comparte la imagen manualmente.",
      });

      // Abrir WhatsApp
      setTimeout(() => {
        window.open(`https://wa.me`, "_blank");
      }, 1000);

    } catch (error) {
      console.error("Error al compartir:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar la imagen.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (qr: QrCode) => {
    if (qr.isUsed === "true") {
      return <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold" data-testid={`badge-status-${qr.id}`}>Usado</Badge>;
    }
    return <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs font-semibold" data-testid={`badge-status-${qr.id}`}>Activo</Badge>;
  };

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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Zendala" className="h-10 w-10 object-contain" data-testid="img-header-logo" />
            <div>
              <h1 className="text-xl font-semibold" data-testid="text-page-title">Panel de Vecino</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {user?.role === "administrador" && (
              <Button 
                variant="outline" 
                onClick={() => setLocation("/admin")}
                data-testid="button-back-to-panel"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Panel
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Generar Código QR</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="visitor-name" className="text-sm font-medium">
                  Nombre del visitante *
                </Label>
                <Input
                  id="visitor-name"
                  placeholder="Ej: Juan Pérez"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="h-12"
                  data-testid="input-visitor-name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitor-type" className="text-sm font-medium">
                  Tipo *
                </Label>
                <Select value={visitorType} onValueChange={setVisitorType} required>
                  <SelectTrigger className="h-12" id="visitor-type" data-testid="select-visitor-type">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visita" data-testid="select-option-visita">Visita</SelectItem>
                    <SelectItem value="proveedor" data-testid="select-option-proveedor">Proveedor</SelectItem>
                    <SelectItem value="prestador" data-testid="select-option-prestador">Prestador de Servicios</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Descripción (opcional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Información adicional sobre la visita"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full py-3 text-lg h-12"
                disabled={createQrMutation.isPending}
                data-testid="button-generate-qr"
              >
                <Plus className="h-5 w-5 mr-2" />
                {createQrMutation.isPending ? "Generando..." : "Generar Código QR"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-semibold mb-4" data-testid="text-my-codes-title">Mis Códigos</h2>
          {codesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : !qrCodes || qrCodes.length === 0 ? (
            <Card className="p-6">
              <p className="text-center text-muted-foreground" data-testid="text-no-codes">
                No has generado códigos QR aún
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {qrCodes.map((qr) => (
                <Card 
                  key={qr.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedQr(qr)}
                  data-testid={`card-qr-${qr.id}`}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-16 w-16 bg-white p-2 rounded-md">
                        <QRCodeSVG value={qr.code} size={48} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold truncate" data-testid={`text-visitor-name-${qr.id}`}>
                        {qr.visitorName}
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {qr.visitorType}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {new Date(qr.createdAt!).toLocaleDateString('es-MX', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(qr)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!selectedQr} onOpenChange={(open) => !open && setSelectedQr(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-qr-details">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedQr?.isUsed === "true" ? "Código Usado" : "Código QR Activo"}
            </DialogTitle>
          </DialogHeader>
          {selectedQr && (
            <div className="space-y-4">
              {selectedQr.isUsed === "true" && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold">
                    ⚠️ Este código ya ha sido utilizado
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    No puedes usar este código nuevamente. Genera uno nuevo si necesitas acceso.
                  </p>
                </div>
              )}
              <div className="flex justify-center bg-white p-4 rounded-lg">
                <QRCodeSVG value={selectedQr.code} size={180} data-testid="qr-code-display" />
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="text-base font-semibold" data-testid="text-qr-visitor-name">{selectedQr.visitorName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="text-sm capitalize" data-testid="text-qr-visitor-type">{selectedQr.visitorType}</p>
                </div>
                {selectedQr.description && (
                  <div>
                    <p className="text-xs text-muted-foreground">Descripción</p>
                    <p className="text-sm" data-testid="text-qr-description">{selectedQr.description}</p>
                  </div>
                )}
                {selectedQr.isUsed !== "true" && (
                  <div className="space-y-3 border-t pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Contraseña de Acceso</p>
                      <div className="bg-primary/10 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold font-mono tracking-wider text-primary" data-testid="text-access-password">
                          {selectedQr.accessPassword}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedQr.accessPassword);
                            toast({
                              title: "Contraseña copiada",
                              description: selectedQr.accessPassword,
                            });
                          }}
                          className="flex-1"
                          size="sm"
                          data-testid="button-copy-password"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                        <Button
                          onClick={handleShareWhatsApp}
                          variant="outline"
                          className="flex-1"
                          size="sm"
                          data-testid="button-share-whatsapp"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs text-muted-foreground">O código QR</p>
                      <p className="text-xs text-muted-foreground">
                        Dile al guardia: <strong>{selectedQr.accessPassword}</strong>
                      </p>
                      <div className="flex justify-center bg-white p-3 rounded-lg" ref={qrDisplayRef}>
                        <QRCodeSVG value={selectedQr.code} size={120} data-testid="qr-code-display" />
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Creado</p>
                  <p className="text-xs font-mono">
                    {new Date(selectedQr.createdAt!).toLocaleString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  {getStatusBadge(selectedQr)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
