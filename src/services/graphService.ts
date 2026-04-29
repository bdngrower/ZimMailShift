import { DateFilter } from '../pages/Dashboard';
import { useSettings } from '../hooks/useSettings';

export class GraphService {
  private getSettings() {
    const raw = localStorage.getItem('zimMailShift_settings');
    if (!raw) throw new Error("Configurações não encontradas. Vá para a aba Configurações.");
    const settings = JSON.parse(raw);
    if (!settings.tenantId || !settings.clientId || !settings.clientSecret) {
      throw new Error("Tenant ID, Client ID ou Client Secret ausentes. Configure primeiro.");
    }
    return settings;
  }

  private async callProxy(action: string, params: any) {
    const settings = this.getSettings();
    const res = await fetch('/api/graph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: settings.tenantId,
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        action,
        ...params
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Erro na requisição para a API Proxy.');
    }
    return data;
  }

  /**
   * Search users in the directory for autocomplete.
   */
  async searchUsers(query: string): Promise<{ displayName: string; mail: string; userPrincipalName: string }[]> {
    if (!query || query.length < 2) return [];
    try {
      return await this.callProxy('search_users', { query });
    } catch (error) {
      console.error("Erro ao buscar usuários via proxy:", error);
      return [];
    }
  }

  /**
   * Fetch emails from a user's mailbox.
   */
  async getEmailsByFilter(userEmail: string, filter: DateFilter) {
    try {
      return await this.callProxy('get_emails', { userEmail, filter });
    } catch (error: any) {
      throw new Error(`Erro ao buscar e-mails: ${error.message}`);
    }
  }

  /**
   * Legacy compat
   */
  async getEmailsBeforeDate(userEmail: string, date: string) {
    return this.getEmailsByFilter(userEmail, { mode: 'before', value: date });
  }

  async moveEmailToSharedMailbox(sourceUser: string, messageId: string, destinationUser: string) {
    try {
      const result = await this.callProxy('move_email', {
        sourceEmail: sourceUser,
        messageId,
        destEmail: destinationUser
      });
      return result.newId;
    } catch (error: any) {
      console.error("Erro ao mover e-mail:", error);
      throw error;
    }
  }

  async rollbackMove(sourceUser: string, destinationUser: string, newIdInDestination: string) {
    try {
      await this.callProxy('rollback', {
        sourceEmail: sourceUser,
        destEmail: destinationUser,
        newMessageId: newIdInDestination
      });
      return true;
    } catch (error: any) {
      console.error("Erro ao reverter e-mail:", error);
      throw error;
    }
  }
}

export const graphService = new GraphService();
