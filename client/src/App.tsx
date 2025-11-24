import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import VecinoHome from "@/pages/vecino-home";
import GuardiaHome from "@/pages/guardia-home";
import AdminHome from "@/pages/admin-home";
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
        <Route path="/" component={Landing} />
        <Route path="*">
          <Redirect to="/" />
        </Route>
      </Switch>
    );
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
