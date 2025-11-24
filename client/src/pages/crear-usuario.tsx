import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import logoUrl from "@assets/images_1763955668403.png";
import { ArrowLeft } from "lucide-react";

export default function CrearUsuario() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [role, setRole] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!role) {
      toast({
        title: "Error",
        description: "Por favor selecciona un rol",
        variant: "destructive",
      });
      return;
    }

    if (!firstName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa el nombre",
        variant: "destructive",
      });
      return;
    }

    if (!lastName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa el apellido",
        variant: "destructive",
      });
      return;
    }

    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa el usuario",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Error",
        description: "Por favor ingresa la contraseña",
        variant: "destructive",
      });
      return;
    }

    if (!adminPassword) {
      toast({
        title: "Error",
        description: "Por favor ingresa la contraseña de administrador",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/users/create", {
        username,
        firstName,
        lastName,
        password,
        adminPassword,
        role,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al crear usuario");
      }

      toast({
        title: "Éxito",
        description: `Usuario ${username} creado correctamente`,
      });

      // Reset form
      setRole("");
      setFirstName("");
      setLastName("");
      setUsername("");
      setPassword("");
      setAdminPassword("");

      // Redirect back to login
      setTimeout(() => {
        setLocation("/");
      }, 500);
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={logoUrl} alt="Zendala" className="h-24 w-24 object-contain" data-testid="img-logo" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-foreground" data-testid="text-title">
            Crear nuevo usuario
          </h1>

          {/* Form */}
          <form onSubmit={handleCreateUser} className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                Rol
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role" data-testid="select-role">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vecino" data-testid="option-vecino">
                    Vecino
                  </SelectItem>
                  <SelectItem value="guardia" data-testid="option-guardia">
                    Guardia
                  </SelectItem>
                  <SelectItem value="administrador" data-testid="option-administrador">
                    Administrador
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                Nombre
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Ingresa el nombre"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
                data-testid="input-firstName"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Apellido
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Ingresa el apellido"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
                data-testid="input-lastName"
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Usuario
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa el usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                data-testid="input-username"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa la contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                data-testid="input-password"
              />
            </div>

            {/* Admin Password */}
            <div className="space-y-2">
              <Label htmlFor="adminPassword" className="text-sm font-medium">
                Contraseña de Administrador
              </Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="Ingresa la contraseña de admin"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                disabled={isLoading}
                data-testid="input-adminPassword"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full mt-6"
              disabled={isLoading}
              size="lg"
              data-testid="button-create-user"
            >
              {isLoading ? "Creando usuario..." : "Crear usuario"}
            </Button>
          </form>

          {/* Back Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/")}
            disabled={isLoading}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </Card>
    </div>
  );
}
