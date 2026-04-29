import { PublicClientApplication, type Configuration } from "@azure/msal-browser";
import type { AppSettings } from "../hooks/useSettings";

export const getMsalConfig = (settings: AppSettings): Configuration => ({
    auth: {
        clientId: settings.clientId,
        authority: `https://login.microsoftonline.com/${settings.tenantId || 'common'}`,
        redirectUri: settings.redirectUri || window.location.origin,
    },
    cache: {
        cacheLocation: "sessionStorage",
    }
});

export const loginRequest = {
    scopes: ["User.Read", "Mail.ReadWrite", "Mail.ReadWrite.Shared", "Mail.Send"]
};

// Singleton instance wrapper
let msalInstance: PublicClientApplication | null = null;

export const initializeMsal = (settings: AppSettings) => {
    if (!msalInstance) {
        msalInstance = new PublicClientApplication(getMsalConfig(settings));
    }
    return msalInstance;
};

export const getMsalInstance = () => {
    return msalInstance;
};
