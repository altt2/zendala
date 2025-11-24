import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, QrCode, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/generated_images/zendala_residential_community_logo.png";

export default function RoleSelection() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    {
      id: "vecino",
      title: "Vecino",
      description: "Genera códigos QR para tus invitados y proveedores",
      icon: QrCode,
    },
    {
      id: "guardia",
      title: "Guardia",
      description: "Escanea códigos QR y controla el acceso al fraccionamiento",
      icon: Shield,
    },
    {
      id: "administrador",
      title: "Administrador",
      description: "Gestiona accesos y consulta el historial completo",
      icon: Users,
    },
  ];

  const handleSelectRole = async (roleId: string) => {
    setSelectedRole(roleId);
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/set-role", { role: roleId });
      
      // Invalidate ALL queries to clear cache when role changes
      await queryClient.invalidateQueries();
      
      toast({
        title: "Rol establecido",
        description: `Te identificaste como ${roles.find(r => r.id === roleId)?.title}`,
      });

      // Redirect to appropriate page
      setTimeout(() => {
        if (roleId === "vecino") {
          setLocation("/vecino");
        } else if (roleId === "guardia") {
          setLocation("/guardia");
        } else if (roleId === "administrador") {
          setLocation("/admin");
        }
      }, 300);
    } catch (error) {
      console.error("Error setting role:", error);
      toast({
        title: "Error",
        description: "No se pudo establecer el rol. Intenta de nuevo.",
        variant: "destructive",
      });
      setSelectedRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
          <img src={logoUrl} alt="Zendala" className="h-24 w-24 object-contain" data-testid="img-logo" />
          
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-title">
              ¿Cómo deseas identificarte?
            </h1>
            <p className="text-base text-muted-foreground max-w-md" data-testid="text-subtitle">
              Selecciona tu perfil para acceder al sistema
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl my-8">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;

              return (
                <Card
                  key={role.id}
                  className={`p-6 text-center space-y-4 cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-primary border-primary" : ""
                  }`}
                  onClick={() => !isLoading && handleSelectRole(role.id)}
                  data-testid={`card-role-${role.id}`}
                >
                  <div className="flex justify-center">
                    <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold">{role.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRole(role.id);
                    }}
                    data-testid={`button-select-${role.id}`}
                  >
                    {isSelected && isLoading ? "Configurando..." : "Seleccionar"}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
