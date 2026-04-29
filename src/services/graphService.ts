import { Client } from "@microsoft/microsoft-graph-client";
import { AuthCodeMSALBrowserAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser";
import { getMsalInstance, loginRequest } from "../lib/msal";
import { InteractionType } from "@azure/msal-browser";

export type DateFilterMode = 'before' | 'year' | 'month';

export interface DateFilter {
  mode: DateFilterMode;
  /** For 'before': ISO date string. For 'year': e.g. "2024". For 'month': e.g. "2024-03" */
  value: string;
}

/**
 * Build OData $filter string based on the selected mode.
 */
function buildDateFilter(filter: DateFilter): string {
  switch (filter.mode) {
    case 'before': {
      const iso = new Date(filter.value).toISOString();
      return `receivedDateTime lt ${iso}`;
    }
    case 'year': {
      const start = `${filter.value}-01-01T00:00:00.000Z`;
      const end = `${parseInt(filter.value) + 1}-01-01T00:00:00.000Z`;
      return `receivedDateTime ge ${start} and receivedDateTime lt ${end}`;
    }
    case 'month': {
      // value = "2024-03"
      const [y, m] = filter.value.split('-').map(Number);
      const start = new Date(y, m - 1, 1).toISOString();
      const nextMonth = m === 12 ? new Date(y + 1, 0, 1) : new Date(y, m, 1);
      const end = nextMonth.toISOString();
      return `receivedDateTime ge ${start} and receivedDateTime lt ${end}`;
    }
  }
}

export class GraphService {
  private client: Client | null = null;

  private getClient() {
    // Always recreate so auth stays fresh
    const msalInstance = getMsalInstance();
    if (!msalInstance) throw new Error("MSAL não inicializado. Configure as credenciais primeiro.");

    const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    if (!account) throw new Error("Nenhuma conta Microsoft ativa. Faça o login novamente.");

    const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, {
      account,
      scopes: loginRequest.scopes,
      interactionType: InteractionType.Redirect
    });

    this.client = Client.initWithMiddleware({ authProvider });
    return this.client;
  }

  /**
   * Search users in the organization directory (for autocomplete).
   * Uses the /users endpoint with $filter on mail or displayName.
   */
  async searchUsers(query: string): Promise<{ displayName: string; mail: string; userPrincipalName: string }[]> {
    if (!query || query.length < 2) return [];
    const client = this.getClient();
    try {
      const response = await client
        .api('/users')
        .filter(`startswith(displayName,'${query}') or startswith(mail,'${query}') or startswith(userPrincipalName,'${query}')`)
        .select('displayName,mail,userPrincipalName')
        .top(10)
        .get();
      return response.value;
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      return [];
    }
  }

  /**
   * Fetch emails from a user's mailbox with the given date filter.
   * Uses /mailFolders/inbox/messages to avoid "folder not found" errors.
   */
  async getEmailsByFilter(userEmail: string, filter: DateFilter, maxResults = 50) {
    const client = this.getClient();
    const oDataFilter = buildDateFilter(filter);

    try {
      const response = await client
        .api(`/users/${userEmail}/mailFolders/AllItems/messages`)
        .filter(oDataFilter)
        .select("id,subject,receivedDateTime,from")
        .top(maxResults)
        .orderby("receivedDateTime desc")
        .get();

      return response.value;
    } catch (error: any) {
      // Fallback: try without mailFolders
      if (error?.statusCode === 404) {
        try {
          const response = await client
            .api(`/users/${userEmail}/messages`)
            .filter(oDataFilter)
            .select("id,subject,receivedDateTime,from")
            .top(maxResults)
            .orderby("receivedDateTime desc")
            .get();
          return response.value;
        } catch (fallbackError) {
          console.error("Erro ao buscar e-mails (fallback):", fallbackError);
          throw fallbackError;
        }
      }
      console.error("Erro ao buscar e-mails:", error);
      throw error;
    }
  }

  /**
   * Legacy method — kept for backward compat.
   */
  async getEmailsBeforeDate(userEmail: string, date: string) {
    return this.getEmailsByFilter(userEmail, { mode: 'before', value: date });
  }

  async moveEmailToSharedMailbox(sourceUser: string, messageId: string, destinationUser: string) {
    const client = this.getClient();
    try {
      const message = await client
        .api(`/users/${sourceUser}/messages/${messageId}`)
        .get();

      const newMessage = await client
        .api(`/users/${destinationUser}/messages`)
        .post(message);

      await client
        .api(`/users/${sourceUser}/messages/${messageId}`)
        .delete();

      return newMessage.id;
    } catch (error) {
      console.error("Erro ao mover e-mail:", error);
      throw error;
    }
  }

  async rollbackMove(sourceUser: string, destinationUser: string, newIdInDestination: string) {
    const client = this.getClient();
    try {
      const message = await client
        .api(`/users/${destinationUser}/messages/${newIdInDestination}`)
        .get();

      await client
        .api(`/users/${sourceUser}/messages`)
        .post(message);

      await client
        .api(`/users/${destinationUser}/messages/${newIdInDestination}`)
        .delete();

      return true;
    } catch (error) {
      console.error("Erro ao reverter e-mail:", error);
      throw error;
    }
  }
}

export const graphService = new GraphService();
