export type DateFilterMode = 'all' | 'before' | 'year' | 'month';

export interface DateFilter {
  mode: DateFilterMode;
  value?: string;
}

export class GraphService {
  private getSettings() {
    const activeId = localStorage.getItem('zimMailShift_activeProfileId');
    const profilesRaw = localStorage.getItem('zimMailShift_profiles');
    
    if (!activeId || !profilesRaw) {
      // Legacy fallback
      const raw = localStorage.getItem('zimMailShift_settings');
      if (raw) return JSON.parse(raw);
      throw new Error("Configurações não encontradas. Vá para a aba Configurações.");
    }
    
    const profiles = JSON.parse(profilesRaw);
    const settings = profiles.find((p: any) => p.id === activeId);
    if (!settings) throw new Error("Cliente selecionado não encontrado nas configurações.");

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
   * Fetch folders for a user mailbox
   */
  async getFolders(userEmail: string) {
    try {
      return await this.callProxy('get_folders', { userEmail });
    } catch (error: any) {
      console.error("Erro ao buscar pastas:", error);
      return [];
    }
  }

  /**
   * Ensure a folder exists in the destination
   */
  async ensureFolder(userEmail: string, folderName: string, parentWellKnownName?: string) {
    try {
      const res = await this.callProxy('ensure_folder', { userEmail, folderName, parentWellKnownName });
      return res.id;
    } catch (error: any) {
      console.error("Erro ao criar pasta:", error);
      throw error;
    }
  }

  /**
   * Fetch emails from a user's mailbox.
   */
  async getEmailsByFilter(userEmail: string, filter: DateFilter, folderId: string = 'inbox') {
    try {
      return await this.callProxy('get_emails', { userEmail, filter, folderId });
    } catch (error: any) {
      throw new Error(`Erro ao buscar e-mails: ${error.message}`);
    }
  }

  /**
   * Legacy compat
   */
  async getEmailsBeforeDate(userEmail: string, date: string, folderId: string = 'inbox') {
    return this.getEmailsByFilter(userEmail, { mode: 'before', value: date }, folderId);
  }

  async moveEmailToSharedMailbox(sourceUser: string, messageId: string, destinationUser: string, destFolderId: string = 'inbox') {
    try {
      const result = await this.callProxy('move_email', {
        sourceEmail: sourceUser,
        messageId,
        destEmail: destinationUser,
        destFolderId
      });
      return result.newId;
    } catch (error: any) {
      console.error("Erro ao mover e-mail:", error);
      throw error;
    }
  }

  async rollbackMove(sourceUser: string, destinationUser: string, newIdInDestination: string, sourceFolderId: string = 'inbox', destFolderId: string = 'inbox') {
    try {
      await this.callProxy('rollback', {
        sourceEmail: sourceUser,
        destEmail: destinationUser,
        newMessageId: newIdInDestination,
        sourceFolderId,
        destFolderId
      });
      return true;
    } catch (error: any) {
      console.error("Erro ao reverter e-mail:", error);
      throw error;
    }
  }
}

export const graphService = new GraphService();
