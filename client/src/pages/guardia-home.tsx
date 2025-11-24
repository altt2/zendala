import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, CheckCircle, XCircle, Camera } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import logoUrl from "@assets/generated_images/zendala_residential_community_logo.png";

interface QrValidationResult {
  valid: boolean;
  qrCode?: {
    id: string;
    visitorName: string;
    visitorType: string;
    description?: string;
    createdAt: string;
    createdBy: {
      firstName: string;
      lastName: string;
    };
  };
  message?: string;
}

export default function GuardiaHome() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<QrValidationResult | null>(null);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);


  const validateQrMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest("POST", "/api/qr-codes/validate", { code });
    },
    onSuccess: (data: QrValidationResult) => {
      setValidationResult(data);
      if (scanner) {
        scanner.clear();
        setScanner(null);
      }
      setScanning(false);
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
        description: "No se pudo validar el código QR",
        variant: "destructive",
      });
    },
  });

  const grantAccessMutation = useMutation({
    mutationFn: async (qrCodeId: string) => {
      return await apiRequest("POST", "/api/access-logs", { qrCodeId });
    },
    onSuccess: () => {
      toast({
        title: "Acceso concedido",
        description: "El visitante ha sido registrado exitosamente",
      });
      setValidationResult(null);
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
        description: "No se pudo registrar el acceso",
        variant: "destructive",
      });
    },
  });

  const startScanning = () => {
    setScanning(true);
    setValidationResult(null);
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setScanning(false);
  };

  // Initialize scanner when scanning state becomes true
  useEffect(() => {
    if (!scanning) return;

    // Wait a tick to ensure DOM element exists
    const timeout = setTimeout(() => {
      try {
        const html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        html5QrcodeScanner.render(
          (decodedText) => {
            validateQrMutation.mutate(decodedText);
          },
          (error) => {
            console.log("QR scan error:", error);
          }
        );

        setScanner(html5QrcodeScanner);
      } catch (error) {
        console.error("Failed to initialize scanner:", error);
        setScanning(false);
        toast({
          title: "Error",
          description: "No se pudo inicializar la cámara",
          variant: "destructive",
        });
      }
    }, 100);

    return () => {
      clearTimeout(timeout);
    };
  }, [scanning]);

  // Cleanup scanner resources
  useEffect(() => {
    return () => {
      if (scanner) {
        try {
          scanner.clear().catch(() => {});
        } catch (e) {
          console.log("Scanner cleanup error:", e);
        }
      }
      
      const videoElement = document.querySelector('#qr-reader video');
      if (videoElement) {
        const stream = (videoElement as HTMLVideoElement).srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, [scanner]);

  const handleGrantAccess = () => {
    if (validationResult?.qrCode) {
      grantAccessMutation.mutate(validationResult.qrCode.id);
    }
  };

  const handleDeny = () => {
    setValidationResult(null);
    toast({
      title: "Acceso denegado",
      description: "El visitante no ha sido registrado",
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "V";
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      visita: { color: "bg-blue-600", label: "Visita" },
      proveedor: { color: "bg-orange-600", label: "Proveedor" },
      prestador: { color: "bg-purple-600", label: "Prestador de Servicios" },
    };
    const badge = badges[type] || badges.visita;
    return (
      <Badge className={`${badge.color} hover:${badge.color} text-white px-3 py-1 text-xs font-semibold`} data-testid="badge-visitor-type">
        {badge.label}
      </Badge>
    );
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
              <h1 className="text-xl font-semibold" data-testid="text-page-title">Panel de Guardia</h1>
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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {!scanning && !validationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Escanear Código QR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base text-muted-foreground">
                Presiona el botón para activar la cámara y escanear el código QR del visitante
              </p>
              <Button 
                onClick={startScanning}
                className="w-full py-3 text-lg h-12"
                data-testid="button-start-scan"
              >
                <Camera className="h-5 w-5 mr-2" />
                Activar Escáner
              </Button>
            </CardContent>
          </Card>
        )}

        {scanning && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-semibold">Escaneando...</CardTitle>
              <Button 
                variant="outline" 
                onClick={stopScanning}
                data-testid="button-stop-scan"
              >
                Cancelar
              </Button>
            </CardHeader>
            <CardContent>
              <div id="qr-reader" className="w-full" data-testid="qr-reader-container"></div>
            </CardContent>
          </Card>
        )}

        {validationResult && (
          <Card>
            <CardContent className="p-6 space-y-6">
              {validationResult.valid && validationResult.qrCode ? (
                <>
                  <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-green-600" data-testid="icon-valid" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold" data-testid="text-validation-status">Código Válido</h2>
                    <p className="text-base text-muted-foreground">Revisa los datos y concede el acceso</p>
                  </div>

                  <div className="flex justify-center">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {getInitials(validationResult.qrCode.visitorName.split(' ')[0], validationResult.qrCode.visitorName.split(' ')[1])}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Visitante</p>
                      <p className="text-2xl font-bold" data-testid="text-visitor-name">{validationResult.qrCode.visitorName}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Tipo de visita</p>
                      {getTypeBadge(validationResult.qrCode.visitorType)}
                    </div>

                    {validationResult.qrCode.description && (
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Descripción</p>
                        <p className="text-base" data-testid="text-description">{validationResult.qrCode.description}</p>
                      </div>
                    )}

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Autorizado por</p>
                      <p className="text-base font-semibold" data-testid="text-authorized-by">
                        {validationResult.qrCode.createdBy.firstName} {validationResult.qrCode.createdBy.lastName}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Generado el</p>
                      <p className="text-sm font-mono">
                        {new Date(validationResult.qrCode.createdAt).toLocaleString('es-MX')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={handleDeny}
                      className="h-12"
                      data-testid="button-deny"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Denegar
                    </Button>
                    <Button 
                      onClick={handleGrantAccess}
                      disabled={grantAccessMutation.isPending}
                      className="h-12"
                      data-testid="button-grant-access"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      {grantAccessMutation.isPending ? "Registrando..." : "Permitir Acceso"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <XCircle className="h-16 w-16 text-destructive" data-testid="icon-invalid" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-destructive" data-testid="text-validation-status">Código Inválido</h2>
                    <p className="text-base text-muted-foreground">
                      {validationResult.message || "Este código QR no es válido o ya ha sido utilizado"}
                    </p>
                  </div>

                  <Button 
                    onClick={() => setValidationResult(null)}
                    className="w-full h-12"
                    data-testid="button-scan-again"
                  >
                    Escanear Otro Código
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
