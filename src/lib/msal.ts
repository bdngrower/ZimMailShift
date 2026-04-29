import { PublicClientApplication, type Configuration, InteractionRequiredAuthError } from "@azure/msal-browser";
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
 * Necessary when the popup was closed mid-flow or the instance was recreated,
 * otherwise MSAL throws "interaction_in_progress".
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
 * Safe popup login — clears interaction state, initializes MSAL, then logs in.
 */
export const safeLoginPopup = async (
    instance: PublicClientApplication,
    scopes: string[]
): Promise<ReturnType<typeof instance.loginPopup>> => {
    clearMsalInteractionState();
    if (!msalInitialized) {
        await instance.initialize();
        msalInitialized = true;
    }
    return instance.loginPopup({ scopes });
};

// Re-export so callers don't need to import directly
export { InteractionRequiredAuthError };
