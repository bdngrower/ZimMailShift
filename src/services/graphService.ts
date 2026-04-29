import { Client } from "@microsoft/microsoft-graph-client";
import { AuthCodeMSALBrowserAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser";
import { msalInstance, loginRequest } from "../lib/msal";

export class GraphService {
  private client: Client;

  constructor() {
    const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, {
      scopes: loginRequest.scopes,
    });

    this.client = Client.initWithMiddleware({
      authProvider,
    });
  }

  async getEmailsBeforeDate(userEmail: string, date: string) {
    // Format date for OData filter: 2023-01-01T00:00:00Z
    const filterDate = new Date(date).toISOString();
    
    try {
      const response = await this.client
        .api(`/users/${userEmail}/messages`)
        .filter(`receivedDateTime lt ${filterDate}`)
        .select("id,subject,receivedDateTime")
        .top(10) // Small batch for control
        .get();
        
      return response.value;
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
    }
  }

  async moveEmailToSharedMailbox(sourceUser: string, messageId: string, destinationUser: string) {
    try {
      // In Graph API, moving usually happens within the same mailbox.
      // To move to a DIFFERENT mailbox (shared), we might need to:
      // 1. Create the message in the destination
      // 2. Delete it from the source
      // OR use a specific "Move" endpoint if supported for shared mailboxes.
      
      // For now, let's implement a Copy + Delete logic as it's more reliable for cross-mailbox.
      
      const message = await this.client
        .api(`/users/${sourceUser}/messages/${messageId}`)
        .get();

      await this.client
        .api(`/users/${destinationUser}/messages`)
        .post(message);

      await this.client
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
