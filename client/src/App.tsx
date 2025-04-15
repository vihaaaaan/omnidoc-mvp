import { Route, Switch } from "wouter";
import { useAuth } from "@/hooks/auth-provider";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import PatientDetail from "@/pages/patient-detail";
import SessionLink from "@/pages/session-link";
import NotFound from "@/pages/not-found";

function App() {
  const { authState } = useAuth();
  
  // If auth is still loading, show a loading indicator
  if (authState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
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
      
      {/* Session link - publicly accessible, no authentication needed */}
      <Route path="/session/:sessionId/:token" component={SessionLink} />
      
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
