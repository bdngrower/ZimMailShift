export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { migration_id, tenant_id, client_id, client_secret, source_email, dest_email, config } = req.body;

  const GITHUB_PAT = process.env.GITHUB_PAT;
  
  if (!GITHUB_PAT) {
    return res.status(500).json({ error: 'GITHUB_PAT não configurado no Vercel.' });
  }

  try {
    // Dispara o GitHub Action enviando as credenciais no payload (seguro, não fica salvo no banco)
    const ghRes = await fetch('https://api.github.com/repos/bdngrower/ZimMailShift/dispatches', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${GITHUB_PAT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event_type: 'start-migration',
        client_payload: {
          migration_id,
          tenant_id,
          client_id,
          client_secret,
          source_email,
          dest_email,
          config
        }
      })
    });

    if (!ghRes.ok) {
      const err = await ghRes.text();
      console.error('Github Action Error:', err);
      return res.status(500).json({ error: `Erro ao acionar GitHub Actions: ${err}` });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
