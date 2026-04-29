import { Client } from "@microsoft/microsoft-graph-client";
import { AuthCodeMSALBrowserAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser";
import { getMsalInstance, loginRequest } from "../lib/msal";
import { InteractionType } from "@azure/msal-browser";

export type DateFilterMode = 'all' | 'before' | 'year' | 'month';

export interface DateFilter {
  mode: DateFilterMode;
  /** For 'before': ISO date string. For 'year': e.g. "2024". For 'month': e.g. "2024-03". Ignored for 'all'. */
  value?: string;
}

/**
 * Build OData $filter string based on the selected mode.
 * Returns null for 'all' (no filter — returns all messages).
 */
function buildDateFilter(filter: DateFilter): string | null {
  switch (filter.mode) {
    case 'all':
      return null;
    case 'before': {
      const iso = new Date(filter.value!).toISOString();
      return `receivedDateTime lt ${iso}`;
    }
    case 'year': {
      const y = parseInt(filter.value!);
      const start = new Date(y, 0, 1).toISOString();
      const end = new Date(y + 1, 0, 1).toISOString();
      return `receivedDateTime ge ${start} and receivedDateTime lt ${end}`;
    }
    case 'month': {
      const [y, m] = filter.value!.split('-').map(Number);
      const start = new Date(y, m - 1, 1).toISOString();
      const end = m === 12 ? new Date(y + 1, 0, 1).toISOString() : new Date(y, m, 1).toISOString();
      return `receivedDateTime ge ${start} and receivedDateTime lt ${end}`;
    }
  }
}

export class GraphService {
  private getClient() {
    const msalInstance = getMsalInstance();
    if (!msalInstance) throw new Error("MSAL não inicializado. Configure as credenciais primeiro.");

    const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    if (!account) throw new Error("Nenhuma conta Microsoft ativa. Faça o login novamente.");

    const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, {
      account,
      scopes: loginRequest.scopes,
      interactionType: InteractionType.Redirect
    });

    return Client.initWithMiddleware({ authProvider });
  }

  /**
   * Resolve a user email/name to their Graph user ID.
   * Using the object ID avoids issues with UPN vs email mismatches.
   */
  private async resolveUserId(client: Client, emailOrUpn: string): Promise<string> {
    try {
      const user = await client
        .api(`/users/${encodeURIComponent(emailOrUpn)}`)
        .select('id,mail,userPrincipalName')
        .get();
      return user.id;
    } catch {
      // If resolution fails, fall back to using the email directly
      return emailOrUpn;
    }
  }

  /**
   * Search users in the directory for autocomplete.
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
   * Fetch emails from a user's mailbox.
   * Uses /users/{id}/messages (all folders) — NO mailFolders path.
   * Requires the admin to have Full Access to the mailbox OR application permissions.
   */
  async getEmailsByFilter(userEmail: string, filter: DateFilter, maxResults = 100) {
    const client = this.getClient();
    const oDataFilter = buildDateFilter(filter);

    // Resolve to object ID for more reliable access
    const userId = await this.resolveUserId(client, userEmail);

    let request = client
      .api(`/users/${userId}/messages`)
      .select("id,subject,receivedDateTime,from")
      .top(maxResults)
      .orderby("receivedDateTime desc");

    if (oDataFilter) {
      request = request.filter(oDataFilter);
    }

    try {
      const response = await request.get();
      return response.value as Array<{ id: string; subject: string; receivedDateTime: string; from: any }>;
    } catch (error: any) {
      const statusCode = error?.statusCode || error?.code;
      
      if (statusCode === 404) {
        throw new Error(
          `Usuário "${userEmail}" não encontrado ou sem permissão de acesso. ` +
          `Verifique se o e-mail está correto e se o administrador tem permissão "Full Access" na caixa de destino, ` +
          `ou se as permissões do App Registration incluem Mail.ReadWrite com consentimento do administrador.`
        );
      }
      if (statusCode === 403) {
        throw new Error(
          `Acesso negado à caixa "${userEmail}". ` +
          `O App Registration precisa de "Mail.ReadWrite" com consentimento do administrador, ` +
          `e o usuário logado precisa ter permissão "Full Access" nessa caixa no Exchange.`
        );
      }
      throw error;
    }
  }

  /**
   * Legacy compat
   */
  async getEmailsBeforeDate(userEmail: string, date: string) {
    return this.getEmailsByFilter(userEmail, { mode: 'before', value: date });
  }

  async moveEmailToSharedMailbox(sourceUser: string, messageId: string, destinationUser: string) {
    const client = this.getClient();
    const sourceId = await this.resolveUserId(client, sourceUser);
    const destId = await this.resolveUserId(client, destinationUser);

    try {
      // Get the full message
      const message = await client.api(`/users/${sourceId}/messages/${messageId}`).get();

      // Create in destination
      const newMessage = await client.api(`/users/${destId}/messages`).post(message);

      // Delete from source
      await client.api(`/users/${sourceId}/messages/${messageId}`).delete();

      return newMessage.id;
    } catch (error) {
      console.error("Erro ao mover e-mail:", error);
      throw error;
    }
  }

  async rollbackMove(sourceUser: string, destinationUser: string, newIdInDestination: string) {
    const client = this.getClient();
    const sourceId = await this.resolveUserId(client, sourceUser);
    const destId = await this.resolveUserId(client, destinationUser);

    try {
      const message = await client.api(`/users/${destId}/messages/${newIdInDestination}`).get();
      await client.api(`/users/${sourceId}/messages`).post(message);
      await client.api(`/users/${destId}/messages/${newIdInDestination}`).delete();
      return true;
    } catch (error) {
      console.error("Erro ao reverter e-mail:", error);
      throw error;
    }
  }
}

export const graphService = new GraphService();
