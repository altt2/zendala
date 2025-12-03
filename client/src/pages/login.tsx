import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, setAuthToken } from "@/lib/config";
import logoUrl from "@assets/images_1763955668403.png";

export default function Login() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu usuario",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu contraseña",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Try local login first
      const response = await fetch(getApiUrl("/api/login-local"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', response.headers.get('content-type'));

      // Parse response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        const text = await response.text();
        console.error('Response text:', text.substring(0, 200));
        throw new Error(`Server error (${response.status}): Invalid JSON response`);
      }

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      // Save JWT token from response
      if (data.token) {
        setAuthToken(data.token);
      }

      // Redirect to home page - app will handle role-based routing
      window.location.href = "/";
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al intentar iniciar sesión",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={logoUrl} alt="Zendala" className="h-32 w-32 object-contain" data-testid="img-logo" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Usuario
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                data-testid="input-username"
                className="focus-visible:ring-primary"
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
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                data-testid="input-password"
                className="focus-visible:ring-primary"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              size="lg"
              data-testid="button-login"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o</span>
            </div>
          </div>

          {/* Create User Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              // This will be set up in App.tsx to navigate to /crear-usuario
              window.location.pathname = "/crear-usuario";
            }}
            data-testid="button-create-user-link"
          >
            Crear nuevo usuario
          </Button>
        </div>
      </Card>
    </div>
  );
}
