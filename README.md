# ZimMailShift — Migração Inteligente de E-mails (SaaS Background Edition)

Este repositório contém a ferramenta **ZimMailShift**, uma solução robusta para migração de e-mails entre contas do Microsoft 365, focada em resolver problemas críticos de migração (como e-mails entrando como rascunhos) e processamento de grandes volumes em background.

## 🚀 O que há de novo (V2 - Arquitetura de Fundo)
A versão atual evoluiu de um utilitário local para um sistema de processamento distribuído:
- **Background Processing**: As migrações agora rodam no **GitHub Actions** (até 6 horas de execução), permitindo que você feche o navegador enquanto o trabalho acontece.
- **Realtime Monitor**: Integração com **Supabase Realtime**. Mesmo com o PC desligado, o progresso é salvo e você pode assistir aos logs ao vivo de qualquer dispositivo.
- **Bypass de Rascunhos**: Técnica exclusiva de injeção de propriedades MAPI (`PidTagMessageFlags`) para garantir que mensagens migradas entrem no destino como "Lidas/Enviadas" e não como rascunhos.
- **Multi-Tenant**: Gerencie múltiplos clientes/tenants em uma única interface, trocando de ambiente com um clique.

## 🛠️ Pilha Tecnológica
- **Frontend**: React 18, TypeScript, Vite, Framer Motion, Lucide Icons.
- **Banco de Dados & Realtime**: Supabase (PostgreSQL).
- **Background Worker**: GitHub Actions (Node.js).
- **API Gatilho**: Vercel Serverless Functions.
- **Auth**: Azure AD App Registration (Client Credentials Flow).

## 📂 Estrutura do Projeto
- `/src`: Interface do usuário e lógica do frontend.
- `/api`: Endpoints serverless (Vercel) para gatilhos e proxy Graph.
- `/scripts`: O "cérebro" do sistema que roda no GitHub Actions (`migrator.js`).
- `/.github/workflows`: Configuração da automação do worker.

## ⚙️ Configuração Necessária

### 1. No Azure AD
- Crie um App Registration.
- Adicione as permissões de API `Mail.ReadWrite`, `Mail.Send` e `User.Read.All` (Tipo: Application).
- Gere um Client Secret.

### 2. No Supabase
- Execute o SQL contido em `scripts/setup_tables.sql` (ou use o editor SQL para criar `zim_migrations` e `zim_migration_logs`).
- Habilite o Realtime para essas tabelas.

### 3. Variáveis de Ambiente (Vercel & GitHub)
Configure as seguintes variáveis:
- `VITE_SUPABASE_URL` / `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
- `GITHUB_PAT`: Seu Personal Access Token do GitHub com permissão de `repo`.

## 📜 Histórico de Evolução
Este projeto foi desenvolvido para superar as limitações do IMAP Sync e as falhas de importação de PSTs, garantindo integridade de pastas e status de leitura das mensagens.

---
*Desenvolvido com foco em alta performance e experiência do usuário.*
