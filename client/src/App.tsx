import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/login";
import CrearUsuario from "@/pages/crear-usuario";
import VecinoHome from "@/pages/vecino-home";
import GuardiaHome from "@/pages/guardia-home";
import AdminHome from "@/pages/admin-home";
import TestConnection from "@/pages/test-connection";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/crear-usuario" component={CrearUsuario} />
        <Route path="/test-connection" component={TestConnection} />
        <Route path="*">
          <Redirect to="/" />
        </Route>
      </Switch>
    );
  }

  // If user hasn't selected a role yet (still has default role after fresh login)
  if (user && window.location.pathname !== "/role-selection") {
    const currentUrl = window.location.pathname;
    if (currentUrl === "/" && (!user.role || user.role === "vecino")) {
      // Check if this is a fresh login by checking if user has no QR codes or was just created
      // We redirect to role selection on the callback anyway, but this is a safety net
    }
  }

  const userRole = user?.role || "vecino";

  return (
    <Switch>
      <Route path="/">
        {userRole === "administrador" && <Redirect to="/admin" />}
        {userRole === "guardia" && <Redirect to="/guardia" />}
        {userRole === "vecino" && <Redirect to="/vecino" />}
      </Route>
      
      <Route path="/vecino">
        {userRole === "vecino" || userRole === "administrador" ? <VecinoHome /> : <Redirect to="/" />}
      </Route>
      <Route path="/guardia">
        {userRole === "guardia" || userRole === "administrador" ? <GuardiaHome /> : <Redirect to="/" />}
      </Route>
      <Route path="/admin">
        {userRole === "administrador" ? <AdminHome /> : <Redirect to="/" />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
