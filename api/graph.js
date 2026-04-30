/**
 * Vercel Serverless Function — Microsoft Graph API proxy.
 *
 * Uses the OAuth2 client_credentials flow (Application permissions) to obtain
 * a Graph API token. This allows the function to access any user's mailbox
 * in the tenant without requiring that user to be logged in.
 *
 * Required body fields:
 *   tenantId, clientId, clientSecret, action, ...params
 *
 * Actions:
 *   - search_users: query
 *   - get_emails:   userEmail, filter (mode, value?)
 *   - move_email:   sourceEmail, messageId, destEmail
 *   - delete_email: userEmail, messageId
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function getAppToken(tenantId, clientId, clientSecret) {
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Falha ao obter token: ${err.error_description || res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function graphRequest(token, path, options = {}) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `Graph API error ${res.status}: ${res.statusText}`
    );
  }

  if (res.status === 204) return null;
  return res.json();
}

function buildDateFilter(filter) {
  if (!filter || filter.mode === 'all') return null;
  switch (filter.mode) {
    case 'before': {
      const iso = new Date(filter.value).toISOString();
      return `receivedDateTime lt ${iso}`;
    }
    case 'year': {
      const y = parseInt(filter.value);
      const start = new Date(y, 0, 1).toISOString();
      const end = new Date(y + 1, 0, 1).toISOString();
      return `receivedDateTime ge ${start} and receivedDateTime lt ${end}`;
    }
    case 'month': {
      const [y, m] = filter.value.split('-').map(Number);
      const start = new Date(y, m - 1, 1).toISOString();
      const end = m === 12 ? new Date(y + 1, 0, 1).toISOString() : new Date(y, m, 1).toISOString();
      return `receivedDateTime ge ${start} and receivedDateTime lt ${end}`;
    }
    default:
      return null;
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tenantId, clientId, clientSecret, action, ...params } = req.body;

  if (!tenantId || !clientId || !clientSecret) {
    return res.status(400).json({ error: 'tenantId, clientId e clientSecret são obrigatórios.' });
  }

  try {
    const token = await getAppToken(tenantId, clientId, clientSecret);

    switch (action) {
      case 'search_users': {
        const { query } = params;
        const encoded = encodeURIComponent(`"displayName:${query}" OR "mail:${query}" OR "userPrincipalName:${query}"`);
        const data = await graphRequest(token,
          `/users?$search=${encoded}&$select=displayName,mail,userPrincipalName&$top=10`,
          { headers: { ConsistencyLevel: 'eventual' } }
        );
        return res.status(200).json(data.value ?? []);
      }

      case 'get_folders': {
        const { userEmail } = params;
        const graphData = await graphRequest(token, `/users/${encodeURIComponent(userEmail)}/mailFolders?$top=250&includeHiddenFolders=true`);
        const folders = graphData.value || [];
        
        // Fetch 1 level of child folders for ALL folders (bypassing potential childFolderCount cache issues)
        for (const f of folders) {
          try {
            const childRes = await graphRequest(token, `/users/${encodeURIComponent(userEmail)}/mailFolders/${f.id}/childFolders?$top=250`);
            f.children = childRes.value || [];
          } catch(e) {
            console.error(`Error fetching child folders for ${f.id} (${f.displayName}):`, e);
            f.children = [];
          }
        }
        return res.status(200).json(folders);
      }

      case 'ensure_folder': {
        const { userEmail, folderName, parentWellKnownName } = params;
        // Search if exists in the specified parent (or root)
        const parentPath = parentWellKnownName ? `/mailFolders/${parentWellKnownName}` : '';
        const searchRes = await graphRequest(token, `/users/${encodeURIComponent(userEmail)}${parentPath}/childFolders?$filter=displayName eq '${folderName}'`);
        
        if (searchRes.value && searchRes.value.length > 0) {
          return res.status(200).json({ id: searchRes.value[0].id });
        }
        
        // Create if not exists
        const createRes = await graphRequest(token, `/users/${encodeURIComponent(userEmail)}${parentPath}/childFolders`, {
          method: 'POST',
          body: { displayName: folderName }
        });
        return res.status(200).json({ id: createRes.id });
      }

      case 'get_emails': {
        const { userEmail, filter, folderId } = params;
        const targetFolder = folderId || 'inbox';
        const odata = buildDateFilter(filter);
        let url = `/users/${encodeURIComponent(userEmail)}/mailFolders/${targetFolder}/messages?$select=id,subject,receivedDateTime,from&$top=100&$orderby=receivedDateTime desc`;
        if (odata) url += `&$filter=${encodeURIComponent(odata)}`;
        const data = await graphRequest(token, url);
        return res.status(200).json(data.value ?? []);
      }

      case 'move_email': {
        const { sourceEmail, messageId, destEmail, destFolderId } = params;
        const targetFolder = destFolderId || 'inbox';
        
        // Get message from source
        const message = await graphRequest(token,
          `/users/${encodeURIComponent(sourceEmail)}/messages/${messageId}`
        );
        
        // Hack to bypass Draft status: set PidTagMessageFlags to MSGFLAG_READ (1)
        if (!message.singleValueExtendedProperties) message.singleValueExtendedProperties = [];
        message.singleValueExtendedProperties.push({
          id: "Integer 0x0E07",
          value: message.isRead ? "1" : "0"
        });

        // Create in destination folder
        const newMsg = await graphRequest(token,
          `/users/${encodeURIComponent(destEmail)}/mailFolders/${targetFolder}/messages`,
          { method: 'POST', body: message }
        );
        // Delete from source
        await graphRequest(token,
          `/users/${encodeURIComponent(sourceEmail)}/messages/${messageId}`,
          { method: 'DELETE' }
        );
        return res.status(200).json({ newId: newMsg.id });
      }

      case 'rollback': {
        const { sourceEmail, destEmail, newMessageId, destFolderId, sourceFolderId } = params;
        const targetDestFolder = destFolderId || 'inbox';
        const targetSourceFolder = sourceFolderId || 'inbox';

        const message = await graphRequest(token,
          `/users/${encodeURIComponent(destEmail)}/messages/${newMessageId}`
        );
        
        // Hack to bypass Draft status
        if (!message.singleValueExtendedProperties) message.singleValueExtendedProperties = [];
        message.singleValueExtendedProperties.push({
          id: "Integer 0x0E07",
          value: message.isRead ? "1" : "0"
        });

        await graphRequest(token,
          `/users/${encodeURIComponent(sourceEmail)}/mailFolders/${targetSourceFolder}/messages`,
          { method: 'POST', body: message }
        );
        await graphRequest(token,
          `/users/${encodeURIComponent(destEmail)}/messages/${newMessageId}`,
          { method: 'DELETE' }
        );
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }
  } catch (err) {
    console.error('[graph-proxy] error:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor.' });
  }
}
