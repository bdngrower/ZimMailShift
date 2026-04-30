import { createClient } from '@supabase/supabase-js';

// Setup Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Parse Payload
const payload = JSON.parse(process.env.MIGRATION_PAYLOAD || '{}');
const {
  migration_id,
  tenant_id,
  client_id,
  client_secret,
  source_email,
  dest_email,
  config
} = payload;

// Graph API Helper
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function getAppToken() {
  const url = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id,
    client_secret,
    scope: 'https://graph.microsoft.com/.default',
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error('Falha ao obter token');
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
    throw new Error(err?.error?.message || `Graph API error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Logger
async function log(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  await supabase.from('zim_migration_logs').insert([{
    migration_id,
    message,
    type
  }]);
}

// Pagination Email Fetcher
async function getAllEmails(token, userEmail, folderId, filterMode, filterDate, filterYear, filterMonth, filterMonthYear) {
  let odata = null;
  if (filterMode === 'before') {
    odata = `receivedDateTime lt ${new Date(filterDate).toISOString()}`;
  } else if (filterMode === 'year') {
    const y = parseInt(filterYear);
    odata = `receivedDateTime ge ${new Date(y, 0, 1).toISOString()} and receivedDateTime lt ${new Date(y + 1, 0, 1).toISOString()}`;
  } else if (filterMode === 'month') {
    const [y, m] = filterMonth.split('-').map(Number);
    const end = m === 12 ? new Date(y + 1, 0, 1) : new Date(y, m, 1);
    odata = `receivedDateTime ge ${new Date(y, m - 1, 1).toISOString()} and receivedDateTime lt ${end.toISOString()}`;
  }

  let url = `/users/${encodeURIComponent(userEmail)}/mailFolders/${folderId}/messages?$select=id,subject,receivedDateTime,from&$top=100&$orderby=receivedDateTime desc`;
  if (odata) url += `&$filter=${encodeURIComponent(odata)}`;

  let allEmails = [];
  while (url) {
    const res = await graphRequest(token, url);
    if (res.value && res.value.length > 0) {
      allEmails = allEmails.concat(res.value);
    }
    url = res['@odata.nextLink'] ? res['@odata.nextLink'].replace(GRAPH_BASE, '') : null;
  }
  return allEmails;
}

// Ensure Folder
async function ensureFolder(token, userEmail, folderName, parentWellKnownName) {
  const parentPath = parentWellKnownName ? `/mailFolders/${parentWellKnownName}` : '';
  const searchRes = await graphRequest(token, `/users/${encodeURIComponent(userEmail)}${parentPath}/childFolders?$filter=displayName eq '${folderName}'`);
  if (searchRes.value && searchRes.value.length > 0) return searchRes.value[0].id;
  
  const createRes = await graphRequest(token, `/users/${encodeURIComponent(userEmail)}${parentPath}/childFolders`, {
    method: 'POST', body: { displayName: folderName }
  });
  return createRes.id;
}

// Main Runner
async function run() {
  await log(`Iniciando Worker Background. ID da Migração: ${migration_id}`);
  try {
    await supabase.from('zim_migrations').update({ status: 'running' }).eq('id', migration_id);
    const token = await getAppToken();
    
    let allEmails = [];
    const hasSentItemsSelected = config.selectedFolders.some(f => f.wellKnownName === 'sentitems');

    for (const folder of config.selectedFolders) {
      await log(`Analisando origem '${folder.displayName}'...`);
      await supabase.from('zim_migrations').update({ current_folder: folder.displayName }).eq('id', migration_id);
      
      let targetDestFolderId = 'inbox';
      if (folder.wellKnownName) {
        targetDestFolderId = folder.wellKnownName;
      } else {
        try {
          targetDestFolderId = await ensureFolder(token, dest_email, folder.displayName, folder.parentWellKnownName);
        } catch (err) {
          await log(`Falha ao criar pasta destino "${folder.displayName}". Usando Inbox.`, 'warning');
        }
      }

      const folderEmails = await getAllEmails(token, source_email, folder.id, config.filterMode, config.filterDate, config.filterYear, config.filterMonth, config.filterMonthYear);
      allEmails = allEmails.concat(folderEmails.map(e => ({ ...e, _srcFolderId: folder.id, _destFolderId: targetDestFolderId })));
    }

    if (config.includeSentItems && !hasSentItemsSelected) {
      await log(`Buscando Itens Enviados adicionais...`);
      const sentEmails = await getAllEmails(token, source_email, 'sentitems', config.filterMode, config.filterDate, config.filterYear, config.filterMonth, config.filterMonthYear);
      allEmails = allEmails.concat(sentEmails.map(e => ({ ...e, _srcFolderId: 'sentitems', _destFolderId: 'sentitems' })));
    }

    const total = allEmails.length;
    await supabase.from('zim_migrations').update({ total_emails: total }).eq('id', migration_id);
    await log(`Varredura concluída. ${total} e-mails encontrados prontos para migração.`, 'success');

    let moved = 0;
    // Process emails in chunks of 3 for speed (Concurrency)
    for (let i = 0; i < allEmails.length; i += 3) {
      const chunk = allEmails.slice(i, i + 3);
      await Promise.all(chunk.map(async (email) => {
        try {
          // Read full message
          const msg = await graphRequest(token, `/users/${encodeURIComponent(source_email)}/messages/${email.id}`);
          if (!msg.singleValueExtendedProperties) msg.singleValueExtendedProperties = [];
          msg.singleValueExtendedProperties.push({
            id: "Integer 0x0E07",
            value: msg.isRead ? "1" : "0"
          });
          
          // Post to dest
          await graphRequest(token, `/users/${encodeURIComponent(dest_email)}/mailFolders/${email._destFolderId}/messages`, {
            method: 'POST', body: msg
          });
          // Delete from source
          await graphRequest(token, `/users/${encodeURIComponent(source_email)}/messages/${email.id}`, {
            method: 'DELETE'
          });
        } catch (e) {
          await log(`Erro ao mover "${email.subject}": ${e.message}`, 'error');
        }
      }));
      moved += chunk.length;
      const progress = Math.round((moved / total) * 100);
      await supabase.from('zim_migrations').update({ emails_moved: moved, progress_percent: progress }).eq('id', migration_id);
    }

    await log(`Migração Finalizada com Sucesso!`, 'success');
    await supabase.from('zim_migrations').update({ status: 'completed' }).eq('id', migration_id);
  } catch (error) {
    await log(`ERRO FATAL NO WORKER: ${error.message}`, 'error');
    await supabase.from('zim_migrations').update({ status: 'error' }).eq('id', migration_id);
  }
}

run();
