import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, QrCode, Users } from "lucide-react";
import logoUrl from "@assets/generated_images/zendala_residential_community_logo.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
          <img src={logoUrl} alt="Zendala" className="h-24 w-24 object-contain" data-testid="img-logo" />
          
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-title">
              Sistema de Control de Acceso
            </h1>
            <p className="text-base text-muted-foreground max-w-md" data-testid="text-subtitle">
              Bienvenido al sistema de control de acceso del fraccionamiento Zendala
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl my-8">
            <Card className="p-6 text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Vecinos</h3>
              <p className="text-sm text-muted-foreground">
                Genera códigos QR para tus invitados y proveedores
              </p>
            </Card>

            <Card className="p-6 text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Guardias</h3>
              <p className="text-sm text-muted-foreground">
                Escanea códigos QR y controla el acceso al fraccionamiento
              </p>
            </Card>

            <Card className="p-6 text-center space-y-3">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Administrador</h3>
              <p className="text-sm text-muted-foreground">
                Gestiona accesos y consulta el historial completo
              </p>
            </Card>
          </div>

          <Button 
            size="lg" 
            className="py-3 px-6 text-lg h-12"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
