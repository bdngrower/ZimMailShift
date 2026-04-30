import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Filter, Clock, CheckCircle2, AlertCircle, Loader2, Key, Search, Undo2, Calendar, User } from 'lucide-react';
import { graphService } from '../services/graphService';
import type { DateFilterMode } from '../services/graphService';
import { useSettings } from '../hooks/useSettings';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// No longer requires msalAccount as a prop
// Autocomplete hook for email search
function useEmailSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ displayName: string; mail: string; userPrincipalName: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await graphService.searchUsers(query);
        setResults(r);
      } catch { setResults([]); }
      setSearching(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return { query, setQuery, results, searching, setResults };
}

// Generate year options (current year back to 2015)
function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let y = currentYear; y >= 2015; y--) years.push(String(y));
  return years;
}

// Generate month options
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle'|'running'|'completed'|'error'|'rolling_back'|'previewed'>('idle');
  const [logs, setLogs] = useState<{ time: string; message: string; type: 'info'|'success'|'error' }[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [movedEmails, setMovedEmails] = useState<{ subject: string; newId: string, sourceFolderId: string, destFolderId: string }[]>([]);
  // Folders
  const [folders, setFolders] = useState<any[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<any[]>([{ id: 'inbox', displayName: 'Caixa de Entrada', wellKnownName: 'inbox' }]);
  const [includeSentItems, setIncludeSentItems] = useState(false);

  // Config
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [filterMode, setFilterMode] = useState<DateFilterMode>('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear() - 1));
  const [filterMonth, setFilterMonth] = useState('01');
  const [filterMonthYear, setFilterMonthYear] = useState(String(new Date().getFullYear()));

  // Auto-fetch folders when source is a valid email
  useEffect(() => {
    if (!source || !source.includes('@')) {
      setFolders([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingFolders(true);
      try {
        const f = await graphService.getFolders(source);
        if (!f || f.length === 0) {
          addLog(`Aviso: Nenhuma pasta retornada da Graph API para ${source}.`, 'error');
        } else {
          addLog(`Pastas carregadas com sucesso (${f.length} pastas raízes).`, 'success');
        }
        setFolders(f || []);
      } catch (err: any) {
        addLog(`Erro ao buscar pastas: ${err.message}`, 'error');
        setFolders([]);
      }
      setLoadingFolders(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [source]);

  // Autocomplete
  const sourceSearch = useEmailSearch();
  const destSearch = useEmailSearch();
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const { activeProfile, loading: settingsLoading } = useSettings();

  const addLog = (message: string, type: 'info'|'success'|'error' = 'info') => {
    setLogs(p => [{ time: new Date().toLocaleTimeString(), message, type }, ...p]);
  };

  const getDateFilter = () => {
    switch (filterMode) {
      case 'all':    return { mode: 'all' as const };
      case 'before': return { mode: 'before' as const, value: filterDate };
      case 'year':   return { mode: 'year' as const, value: filterYear };
      case 'month':  return { mode: 'month' as const, value: `${filterMonthYear}-${filterMonth.padStart(2, '0')}` };
    }
  };

  const getFilterLabel = () => {
    switch (filterMode) {
      case 'all':    return 'todos os e-mails';
      case 'before': return `anteriores a ${filterDate}`;
      case 'year':   return `do ano ${filterYear}`;
      case 'month':  return `de ${MONTHS[parseInt(filterMonth) - 1]} ${filterMonthYear}`;
    }
  };

  const canPreview = !!source && (
    filterMode === 'all' ? true :
    filterMode === 'before' ? !!filterDate : true
  );

  const handlePreview = async () => {
    if (!source) {
      addLog('Por favor, defina a Caixa de Origem.', 'error');
      return;
    }
    if (selectedFolders.length === 0 && !includeSentItems) {
      addLog('Selecione pelo menos uma pasta para pré-visualizar.', 'error');
      return;
    }
    setPreviewing(true); setLogs([]); setPreviewCount(null);
    const df = getDateFilter();
    addLog(`Buscando e-mails em ${source} (Pastas selecionadas: ${selectedFolders.map(f => f.displayName).join(', ')}) ${getFilterLabel()}...`);
    try {
      let count = 0;
      for (const folder of selectedFolders) {
        const emails = await graphService.getEmailsByFilter(source, df, folder.id);
        count += emails?.length ?? 0;
      }
      
      const hasSentItemsSelected = selectedFolders.some(f => f.wellKnownName === 'sentitems');
      if (includeSentItems && !hasSentItemsSelected) {
        try {
          const sentEmails = await graphService.getEmailsByFilter(source, df, 'sentitems');
          count += sentEmails?.length ?? 0;
        } catch(e) {}
      }

      setPreviewCount(count); setStatus('previewed');
      count === 0
        ? addLog('Nenhum e-mail encontrado com esses critérios.', 'info')
        : addLog(`Encontrados ${count} e-mails prontos para movimentação.`, 'success');
    } catch (e: any) {
      addLog(`Erro: ${e.message || 'Falha ao buscar e-mails.'}`, 'error');
      setStatus('error');
    } finally { setPreviewing(false); }
  };

  const handleStart = async () => {
    if (!source) { addLog('Defina a Caixa de Origem.', 'error'); return; }
    if (!destination) { addLog('Por favor, preencha a Caixa Compartilhada de Destino antes de iniciar!', 'error'); return; }
    if (selectedFolders.length === 0 && !includeSentItems) { addLog('Selecione pelo menos uma pasta para migrar.', 'error'); return; }
    if (!activeProfile) { addLog('Selecione um cliente nas configurações.', 'error'); return; }

    setLoading(true); setStatus('running'); setProgress(0); setLogs([]); setMovedEmails([]);
    addLog(`Enviando ordem de migração para o Servidor Background...`);

    try {
      const configObj = {
        selectedFolders,
        includeSentItems,
        filterMode,
        filterDate,
        filterYear,
        filterMonth,
        filterMonthYear
      };

      // Create Migration Record
      const { data: migration, error } = await supabase
        .from('zim_migrations')
        .insert([{
          client_name: activeProfile.name,
          source_email: source,
          dest_email: destination,
          status: 'queued',
          progress_percent: 0,
          current_folder: ''
        }])
        .select()
        .single();

      if (error) throw error;
      const migrationId = migration.id;

      addLog(`Registro criado (ID: ${migrationId}). Acionando GitHub Actions...`);

      // Trigger the backend
      const { tenantId, clientId, clientSecret } = activeProfile;
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          migration_id: migrationId,
          tenant_id: tenantId,
          client_id: clientId,
          client_secret: clientSecret,
          source_email: source,
          dest_email: destination,
          config: configObj
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao acionar a API de Trigger');
      }

      addLog('Migração iniciada com sucesso em Background! Você pode fechar o navegador.', 'success');

      // Subscribe to Realtime for this migration
      supabase.channel(`logs-${migrationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'zim_migration_logs', filter: `migration_id=eq.${migrationId}` }, payload => {
          const log = payload.new as any;
          setLogs(prev => [...prev, { time: new Date(log.created_at).toLocaleTimeString(), message: log.message, type: log.type }]);
        })
        .subscribe();

      supabase.channel(`mig-${migrationId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zim_migrations', filter: `id=eq.${migrationId}` }, payload => {
          const mig = payload.new as any;
          if (mig.progress_percent !== undefined) setProgress(mig.progress_percent);
          if (mig.status === 'completed' || mig.status === 'error') {
            setStatus(mig.status);
            setLoading(false);
          }
        })
        .subscribe();

    } catch (e: any) {
      setStatus('error'); addLog(`Erro ao acionar background: ${e.message}`, 'error');
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!movedEmails.length) return;
    setRollingBack(true); setStatus('rolling_back'); setProgress(0);
    addLog(`Revertendo ${movedEmails.length} e-mails...`);
    let count = 0;
    for (const email of movedEmails) {
      try {
        addLog(`Restaurando: "${email.subject}"...`);
        await graphService.rollbackMove(source, destination, email.newId, email.sourceFolderId, email.destFolderId);
        count++; setProgress(Math.round((count / movedEmails.length) * 100));
        addLog(`Restaurado: ${email.subject}`, 'success');
      } catch (err: any) { addLog(`Falha: ${email.subject} — ${err.message || ''}`, 'error'); }
    }
    setMovedEmails([]); setStatus('idle');
    addLog(`Reversão concluída. ${count} e-mails restaurados.`, 'success');
    setRollingBack(false);
  };

  const handleSourceSelect = async (u: any) => {
    const email = u.mail || u.userPrincipalName;
    setSource(email);
    setShowSourceDropdown(false);
    sourceSearch.setResults([]);
    setSelectedFolders([{ id: 'inbox', displayName: 'Caixa de Entrada', wellKnownName: 'inbox' }]);
  };

  if (settingsLoading) return null;

  if (!activeProfile?.clientId || !activeProfile?.tenantId || !activeProfile?.clientSecret) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Key size={28} /></div>
        <h2 className="empty-title">Configuração Necessária</h2>
        <p className="empty-sub">Configure o Tenant ID e Client ID antes de iniciar as operações.</p>
        <Link to="/admin/settings" className="btn-primary-solo">Ir para Configurações</Link>
      </div>
    );
  }

  const busy = loading || previewing || rollingBack;
  const canExecute = canPreview && !!destination;

  return (
    <div className="dashboard-grid">
      {/* LEFT */}
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Config */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><Filter size={17} /> Configuração da Migração</div>
            {activeProfile && (
              <span style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '0.2rem 0.6rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <User size={12} /> Cliente: {activeProfile.name}
              </span>
            )}
          </div>

          {/* Source email with autocomplete */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Caixa de Origem</label>
            <input
              type="text"
              value={source}
              onChange={e => { setSource(e.target.value); sourceSearch.setQuery(e.target.value); setShowSourceDropdown(true); }}
              onFocus={() => setShowSourceDropdown(true)}
              onBlur={() => setTimeout(() => setShowSourceDropdown(false), 200)}
              placeholder="Comece a digitar o nome ou e-mail..."
              className="form-input"
            />
            {showSourceDropdown && sourceSearch.results.length > 0 && (
              <div className="autocomplete-dropdown">
                {sourceSearch.results.map((u, i) => (
                  <button key={i} className="autocomplete-item" onMouseDown={() => handleSourceSelect(u)}>
                    <User size={14} />
                    <div>
                      <div style={{ fontWeight: 500, color: 'white', fontSize: '0.82rem' }}>{u.displayName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#475569' }}>{u.mail || u.userPrincipalName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {sourceSearch.searching && <div style={{ position: 'absolute', right: 12, top: 38, color: '#475569' }}><Loader2 size={14} className="animate-spin" /></div>}
          </div>

          {/* Folder Selection */}
          {source && (
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Pastas a serem migradas (Segure Ctrl ou Command para selecionar várias)</label>
              {loadingFolders ? (
                <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Loader2 size={14} className="animate-spin" /> Carregando pastas...
                </div>
              ) : (
                <select
                  multiple
                  size={Math.min(folders.reduce((acc, f) => acc + 1 + (f.children?.length || 0), 1), 8)}
                  className="form-input"
                  value={selectedFolders.map(f => f.id)}
                  onChange={e => {
                    const ids = Array.from(e.target.selectedOptions, option => option.value);
                    const selected: any[] = [];
                    for (const id of ids) {
                      let f = folders.find(x => x.id === id);
                      if (!f) {
                        for (const parent of folders) {
                          const child = parent.children?.find((c: any) => c.id === id);
                          if (child) {
                            f = { ...child, parentWellKnownName: parent.wellKnownName || 'inbox' };
                            break;
                          }
                        }
                      }
                      if (!f && id === 'inbox') f = { id: 'inbox', displayName: 'Caixa de Entrada', wellKnownName: 'inbox' };
                      if (f) selected.push(f);
                    }
                    setSelectedFolders(selected);
                  }}
                  style={{ minHeight: '120px' }}
                >
                  <option value="inbox">Caixa de Entrada (Inbox) — Padrão</option>
                  {folders.map(f => (
                    <React.Fragment key={f.id}>
                      {f.wellKnownName !== 'inbox' && <option value={f.id}>{f.displayName}</option>}
                      {f.children?.map((c: any) => (
                        <option key={c.id} value={c.id}>&nbsp;&nbsp;&nbsp;↳ {c.displayName}</option>
                      ))}
                    </React.Fragment>
                  ))}
                </select>
              )}
            </div>
          )}

          {source && !selectedFolders.some(f => f.wellKnownName === 'sentitems') && (
            <div className="form-group" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <input 
                  type="checkbox" 
                  checked={includeSentItems}
                  onChange={e => setIncludeSentItems(e.target.checked)}
                  style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#4f46e5' }}
                />
                Também mover e-mails da caixa de Itens Enviados
              </label>
            </div>
          )}

          {/* Destination email with autocomplete */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Caixa Compartilhada de Destino</label>
            <input
              type="text"
              value={destination}
              onChange={e => { setDestination(e.target.value); destSearch.setQuery(e.target.value); setShowDestDropdown(true); }}
              onFocus={() => setShowDestDropdown(true)}
              onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)}
              placeholder="Comece a digitar o nome ou e-mail..."
              className="form-input"
            />
            {showDestDropdown && destSearch.results.length > 0 && (
              <div className="autocomplete-dropdown">
                {destSearch.results.map((u, i) => (
                  <button key={i} className="autocomplete-item" onMouseDown={() => { setDestination(u.mail || u.userPrincipalName); setShowDestDropdown(false); destSearch.setResults([]); }}>
                    <User size={14} />
                    <div>
                      <div style={{ fontWeight: 500, color: 'white', fontSize: '0.82rem' }}>{u.displayName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#475569' }}>{u.mail || u.userPrincipalName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {destSearch.searching && <div style={{ position: 'absolute', right: 12, top: 38, color: '#475569' }}><Loader2 size={14} className="animate-spin" /></div>}
          </div>

          {/* Date Filter Mode */}
          <div className="form-group">
            <label className="form-label"><Calendar size={14} style={{ marginRight: 4, verticalAlign: -2 }} /> Tipo de Filtro por Data</label>
            <div className="filter-mode-tabs">
              <button className={`filter-tab${filterMode === 'all' ? ' active' : ''}`} onClick={() => setFilterMode('all')}>Todos</button>
              <button className={`filter-tab${filterMode === 'before' ? ' active' : ''}`} onClick={() => setFilterMode('before')}>Anteriores a</button>
              <button className={`filter-tab${filterMode === 'year' ? ' active' : ''}`} onClick={() => setFilterMode('year')}>Por Ano</button>
              <button className={`filter-tab${filterMode === 'month' ? ' active' : ''}`} onClick={() => setFilterMode('month')}>Por Mês</button>
            </div>
          </div>

          {/* Filter value inputs */}
          {filterMode === 'before' && (
            <div className="form-group">
              <label className="form-label">Mover e-mails recebidos antes de</label>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="form-input" />
            </div>
          )}

          {filterMode === 'year' && (
            <div className="form-group">
              <label className="form-label">Todos os e-mails do ano</label>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="form-input">
                {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {filterMode === 'month' && (
            <div className="form-group">
              <label className="form-label">Todos os e-mails do mês</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="form-input" style={{ flex: 2 }}>
                  {MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                </select>
                <select value={filterMonthYear} onChange={e => setFilterMonthYear(e.target.value)} className="form-input" style={{ flex: 1 }}>
                  {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="btn-row">
            <button onClick={handlePreview} disabled={busy || !canPreview} className="btn-secondary">
              {previewing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Pré-visualizar
            </button>
            <button onClick={handleStart} disabled={busy || !canExecute} className="btn-submit">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Executar
            </button>
          </div>

          {status === 'completed' && movedEmails.length > 0 && (
            <button onClick={handleRollback} disabled={busy} className="btn-danger">
              {rollingBack ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />} Desfazer Movimentação (Rollback)
            </button>
          )}

          {previewCount !== null && status === 'previewed' && (
            <div className="preview-callout">
              <strong>Resultado:</strong> {previewCount} e-mail{previewCount !== 1 ? 's' : ''} encontrado{previewCount !== 1 ? 's' : ''} {getFilterLabel()}.{' '}
              {previewCount > 0 ? 'Pronto para executar.' : 'Nenhum e-mail será movido.'}
            </div>
          )}
        </div>
      </motion.div>

      {/* RIGHT */}
      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div className="card-header" style={{ marginBottom: 0 }}><Clock size={17} /> Status em Tempo Real</div>
            <span className={`status-badge status-${status}`}>{
              status === 'idle' ? 'Aguardando' :
              status === 'running' ? 'Em execução' :
              status === 'completed' ? 'Concluído' :
              status === 'error' ? 'Erro' :
              status === 'rolling_back' ? 'Revertendo' : 'Pré-visualizado'
            }</span>
          </div>
          <div className="progress-wrap">
            <motion.div className="progress-bar" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
          </div>
          <div className="progress-meta">
            <span>{progress}% concluído</span>
            {busy && <span>Processando...</span>}
          </div>
          <div className="log-viewer">
            <div className="log-header">
              <span>Logs da Operação</span>
              <div className="log-counts">
                <span className="log-count-success">✓ {logs.filter(l => l.type === 'success').length}</span>
                <span className="log-count-error">✗ {logs.filter(l => l.type === 'error').length}</span>
              </div>
            </div>
            <div className="log-body">
              {logs.length === 0
                ? <div className="log-empty">Sem atividade. Configure e inicie uma migração.</div>
                : logs.map((log, i) => (
                    <div key={i} className={`log-entry ${log.type}`}>
                      {log.type === 'success' && <CheckCircle2 size={11} />}
                      {log.type === 'error' && <AlertCircle size={11} />}
                      <span className="log-time">[{log.time}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
