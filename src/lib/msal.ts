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
    const config = getMsalConfig(settings);
    if (!msalInstance) {
        msalInstance = new PublicClientApplication(config);
    } else {
        const currentConfig = msalInstance.getConfiguration();
        if (currentConfig.auth.clientId !== settings.clientId || 
            currentConfig.auth.authority !== config.auth.authority) {
            msalInstance = new PublicClientApplication(config);
        }
    }
    return msalInstance;
};

export const getMsalInstance = () => {
    return msalInstance;
};
