import { MsalProvider } from "@azure/msal-react";
import type { IPublicClientApplication } from "@azure/msal-browser";
import { useState } from "react";
import './App.css';
import { Layout } from "./components/Layout";
import { AuthView } from "./pages/AuthView";
import { Dashboard } from "./pages/Dashboard";

interface AppProps {
  pca: IPublicClientApplication;
}

function App({ pca }: AppProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <MsalProvider instance={pca}>
      <Layout>
        {!isAuthenticated ? (
          <AuthView onAuthenticated={() => setIsAuthenticated(true)} />
        ) : (
          <Dashboard />
        )}
      </Layout>
    </MsalProvider>
  );
}

export default App;
