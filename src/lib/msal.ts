import { PublicClientApplication } from "@azure/msal-browser";
import type { AppSettings } from "../hooks/useSettings";

export const loginRequest = {
    scopes: ["User.Read", "Mail.ReadWrite", "Mail.ReadWrite.Shared", "Mail.Send", "Directory.Read.All"]
};

// ── Early initialization ──
// Read settings from localStorage synchronously at module load time
// so MSAL can process the redirect response before React Router runs.
function loadSettingsSync(): AppSettings | null {
    try {
        const stored = localStorage.getItem('zimMailShift_settings');
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return null;
}

function createMsalInstance(settings: AppSettings): PublicClientApplication {
    return new PublicClientApplication({
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
    });
}

// Create the instance immediately if settings exist
let msalInstance: PublicClientApplication | null = null;
let msalReadyPromise: Promise<void> | null = null;
const earlySettings = loadSettingsSync();

if (earlySettings?.clientId && earlySettings?.tenantId) {
    msalInstance = createMsalInstance(earlySettings);
    // Initialize and handle redirect IMMEDIATELY — before React Router can interfere
    msalReadyPromise = msalInstance.initialize()
        .then(() => msalInstance!.handleRedirectPromise())
        .then((result) => {
            if (result?.account) {
                msalInstance!.setActiveAccount(result.account);
            } else {
                // No redirect result — check if we have an active account from a previous session
                const accounts = msalInstance!.getAllAccounts();
                if (accounts.length > 0) {
                    msalInstance!.setActiveAccount(accounts[0]);
                }
            }
        })
        .catch(e => console.error("MSAL early init error:", e));
}

// ── Public API ──

/**
 * (Re-)initialize MSAL with new settings. Used when user saves settings for the first time
 * or changes them. Does NOT re-handle redirects since this is called mid-session.
 */
export const initializeMsal = async (settings: AppSettings): Promise<void> => {
    msalInstance = createMsalInstance(settings);
    await msalInstance.initialize();
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
    }
};

/**
 * Wait for the early MSAL initialization to complete.
 * Call this in App.tsx before checking for accounts.
 */
export const waitForMsalReady = (): Promise<void> => {
    return msalReadyPromise ?? Promise.resolve();
};

/**
 * Trigger Microsoft login using redirect (same tab — no popup issues).
 */
export const login = async (): Promise<void> => {
    if (!msalInstance) return;
    return msalInstance.loginRedirect(loginRequest);
};

export const getMsalInstance = () => msalInstance;

export const getAccount = () => {
    return msalInstance?.getActiveAccount() ?? null;
};
