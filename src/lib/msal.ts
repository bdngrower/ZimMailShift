import { PublicClientApplication, type Configuration } from "@azure/msal-browser";
import type { AppSettings } from "../hooks/useSettings";

// Dedicated redirect page for popup flows - must be a static HTML page,
// not the SPA root, so React Router doesn't intercept it.
const POPUP_REDIRECT_URI = `${window.location.origin}/blank.html`;

export const getMsalConfig = (settings: AppSettings): Configuration => ({
    auth: {
        clientId: settings.clientId,
        authority: `https://login.microsoftonline.com/${settings.tenantId || 'common'}`,
        redirectUri: POPUP_REDIRECT_URI,
        postLogoutRedirectUri: window.location.origin,
        navigateToLoginRequestUrl: false,
    },
    cache: {
        cacheLocation: "sessionStorage",
    },
    system: {
        allowNativeBroker: false,
    }
});

export const loginRequest = {
    scopes: ["User.Read", "Mail.ReadWrite", "Mail.ReadWrite.Shared", "Mail.Send"]
};

// Singleton instance wrapper
let msalInstance: PublicClientApplication | null = null;
let msalInitialized = false;

export const initializeMsal = (settings: AppSettings) => {
    const config = getMsalConfig(settings);
    if (!msalInstance) {
        msalInstance = new PublicClientApplication(config);
        msalInitialized = false;
    } else {
        const currentConfig = msalInstance.getConfiguration();
        if (currentConfig.auth.clientId !== settings.clientId ||
            currentConfig.auth.authority !== config.auth.authority) {
            // Settings changed — clear stale state and recreate
            clearMsalInteractionState();
            msalInstance = new PublicClientApplication(config);
            msalInitialized = false;
        }
    }
    return msalInstance;
};

export const getMsalInstance = () => msalInstance;

/**
 * Clears the sessionStorage keys MSAL uses to track interaction state.
 * Prevents the "interaction_in_progress" error after a popup is closed mid-flow.
 */
export const clearMsalInteractionState = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
            key.includes("interaction.status") ||
            key.includes("request.params") ||
            key.includes("request.origin") ||
            key.includes(".interaction")
        )) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
};

/**
 * Safe popup login — clears interaction state, initializes MSAL once, then logs in.
 * The popup redirects to /blank.html so React Router never intercepts it.
 */
export const safeLoginPopup = async (
    instance: PublicClientApplication,
    scopes: string[]
): Promise<Awaited<ReturnType<typeof instance.loginPopup>>> => {
    clearMsalInteractionState();
    if (!msalInitialized) {
        await instance.initialize();
        msalInitialized = true;
    }
    return instance.loginPopup({
        scopes,
        redirectUri: POPUP_REDIRECT_URI,
    });
};
