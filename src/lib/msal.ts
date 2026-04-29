import { PublicClientApplication } from "@azure/msal-browser";
import type { AppSettings } from "../hooks/useSettings";

export const loginRequest = {
    scopes: ["User.Read", "Mail.ReadWrite", "Mail.ReadWrite.Shared", "Mail.Send", "Directory.Read.All"]
};

// Singleton instance wrapper
let msalInstance: PublicClientApplication | null = null;
let msalInitializedPromise: Promise<void> | null = null;

export const initializeMsal = (settings: AppSettings): Promise<void> => {
    const config = {
        auth: {
            clientId: settings.clientId,
            authority: `https://login.microsoftonline.com/${settings.tenantId}`,
            redirectUri: window.location.origin,
            postLogoutRedirectUri: window.location.origin,
            navigateToLoginRequestUrl: true,
        },
        cache: {
            cacheLocation: "sessionStorage",
            storeAuthStateInCookie: false,
        }
    };

    msalInstance = new PublicClientApplication(config);
    msalInitializedPromise = msalInstance.initialize();
    return msalInitializedPromise;
};

/**
 * Handle the redirect result after returning from Microsoft login page.
 * Must be called on app startup.
 */
export const handleRedirect = async (): Promise<void> => {
    if (!msalInstance) return;
    await msalInitializedPromise;
    const result = await msalInstance.handleRedirectPromise();
    if (result?.account) {
        msalInstance.setActiveAccount(result.account);
    }
};

/**
 * Trigger Microsoft login using redirect (same tab — no popup issues).
 */
export const login = async (): Promise<void> => {
    if (!msalInstance) return;
    await msalInitializedPromise;
    return msalInstance.loginRedirect(loginRequest);
};

export const getMsalInstance = () => msalInstance;

export const getAccount = () => {
    return msalInstance ? msalInstance.getActiveAccount() : null;
};
