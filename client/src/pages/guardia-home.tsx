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
import { Input } from "@/components/ui/input";
import { LogOut, CheckCircle, XCircle, Camera, Keyboard } from "lucide-react";
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
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
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
    setManualMode(false);
    setValidationResult(null);
  };

  const startManualMode = () => {
    setManualMode(true);
    setScanning(false);
    setValidationResult(null);
    setManualCode("");
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setScanning(false);
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código QR",
        variant: "destructive",
      });
      return;
    }
    const trimmedCode = manualCode.trim();
    console.log("[Manual Code Submit] Code to validate:", trimmedCode, "Length:", trimmedCode.length);
    validateQrMutation.mutate(trimmedCode);
  };

  // Initialize scanner when scanning state becomes true
  useEffect(() => {
    if (!scanning) return;

    // Wait a tick to ensure DOM element exists
    const timeout = setTimeout(() => {
      try {
        const html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false
          },
          false
        );

        html5QrcodeScanner.render(
          (decodedText) => {
            console.log("QR code detected:", decodedText);
            validateQrMutation.mutate(decodedText);
          },
          (error) => {
            // Silently ignore scanning errors
            console.debug("QR scan error:", error);
          }
        );

        setScanner(html5QrcodeScanner);
        console.log("Scanner initialized successfully");
      } catch (error) {
        console.error("Failed to initialize scanner:", error);
        setScanning(false);
        
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        // Check if it's a permission error
        if (errorMsg.includes("Permission denied") || errorMsg.includes("NotAllowedError")) {
          toast({
            title: "Permiso de cámara denegado",
            description: "Por favor, permite acceso a la cámara en la configuración del navegador",
            variant: "destructive",
          });
        } else if (errorMsg.includes("NotFoundError")) {
          toast({
            title: "Cámara no encontrada",
            description: "Este dispositivo no tiene cámara disponible",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "No se pudo inicializar el escáner de QR",
            variant: "destructive",
          });
        }
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
        {!scanning && !manualMode && !validationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Validar Acceso del Visitante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base text-muted-foreground">
                Elige cómo deseas validar el código QR del visitante
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  onClick={startScanning}
                  className="py-3 text-lg h-12"
                  data-testid="button-start-scan"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Escanear con Cámara
                </Button>
                <Button 
                  onClick={startManualMode}
                  variant="outline"
                  className="py-3 text-lg h-12"
                  data-testid="button-manual-mode"
                >
                  <Keyboard className="h-5 w-5 mr-2" />
                  Ingresar Manualmente
                </Button>
              </div>
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
              <div 
                id="qr-reader" 
                className="w-full" 
                style={{ minHeight: "400px" }}
                data-testid="qr-reader-container"
              />
            </CardContent>
          </Card>
        )}

        {manualMode && !validationResult && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-xl font-semibold">Ingresar Código QR</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => setManualMode(false)}
                data-testid="button-cancel-manual"
              >
                Cancelar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base text-muted-foreground">
                Copia y pega o ingresa el código QR del visitante
              </p>
              <Input 
                placeholder="Pega aquí el código QR..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleManualSubmit();
                  }
                }}
                data-testid="input-manual-code"
                className="text-lg py-3 h-12"
                autoFocus
              />
              <Button 
                onClick={handleManualSubmit}
                disabled={validateQrMutation.isPending || !manualCode.trim()}
                className="w-full h-12"
                data-testid="button-validate-manual"
              >
                {validateQrMutation.isPending ? "Validando..." : "Validar Código"}
              </Button>
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
