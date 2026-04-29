import { PublicClientApplication, type Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_MS_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MS_TENANT_ID || 'common'}`,
        redirectUri: import.meta.env.VITE_MS_REDIRECT_URI,
    },
    cache: {
        cacheLocation: "sessionStorage",
    }
};

// Add scopes here for ID token to be used at Microsoft identity platform endpoints.
export const loginRequest = {
    scopes: ["User.Read", "Mail.ReadWrite", "Mail.ReadWrite.Shared", "Mail.Send"]
};

export const msalInstance = new PublicClientApplication(msalConfig);
