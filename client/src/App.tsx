import { Route, Switch } from "wouter";
import { useAuth } from "@/hooks/auth-provider";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import PatientDetail from "@/pages/patient-detail";
import NotFound from "@/pages/not-found";

function App() {
  const { authState } = useAuth();
  
  // If auth is still loading, don't render routes yet
  if (authState.loading) {
    return null;
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      {/* Protected routes - only accessible when authenticated */}
      <Route path="/dashboard">
        {authState.isAuthenticated ? <Dashboard /> : <LoginPage />}
      </Route>
      
      <Route path="/patients/:id">
        {authState.isAuthenticated ? <PatientDetail /> : <LoginPage />}
      </Route>
      
      {/* Redirect to dashboard if authenticated, login if not */}
      <Route path="/">
        {authState.isAuthenticated ? <Dashboard /> : <LoginPage />}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
