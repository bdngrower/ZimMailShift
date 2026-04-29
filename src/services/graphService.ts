import { Client } from "@microsoft/microsoft-graph-client";
import { AuthCodeMSALBrowserAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser";
import { getMsalInstance, loginRequest } from "../lib/msal";
import { InteractionType } from "@azure/msal-browser";

export class GraphService {
  private client: Client | null = null;

  private getClient() {
    if (this.client) return this.client;

    const msalInstance = getMsalInstance();
    if (!msalInstance) {
        throw new Error("MSAL not initialized. Please configure settings first.");
    }

    const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    
    if (!account) {
      throw new Error("No active account found. Please sign in to Microsoft.");
    }

    const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, {
      account,
      scopes: loginRequest.scopes,
      interactionType: InteractionType.Popup
    });

    this.client = Client.initWithMiddleware({
      authProvider,
    });

    return this.client;
  }

  async getEmailsBeforeDate(userEmail: string, date: string) {
    const client = this.getClient();
    const filterDate = new Date(date).toISOString();
    
    try {
      const response = await client
        .api(`/users/${userEmail}/messages`)
        .filter(`receivedDateTime lt ${filterDate}`)
        .select("id,subject,receivedDateTime")
        .top(10)
        .get();
        
      return response.value;
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
    }
  }

  async moveEmailToSharedMailbox(sourceUser: string, messageId: string, destinationUser: string) {
    const client = this.getClient();
    try {
      const message = await client
        .api(`/users/${sourceUser}/messages/${messageId}`)
        .get();

      await client
        .api(`/users/${destinationUser}/messages`)
        .post(message);

      await client
        .api(`/users/${sourceUser}/messages/${messageId}`)
        .delete();
        
      return true;
    } catch (error) {
      console.error("Error moving email:", error);
      throw error;
    }
  }
}

export const graphService = new GraphService();
