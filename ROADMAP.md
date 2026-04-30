# 🗺️ Roadmap ZimMailShift

Este documento descreve as funcionalidades implementadas e o futuro planejado para a ferramenta.

## ✅ Fase 1: Estabilidade e Funcionalidade (Concluído)
- [x] **Bypass de Rascunhos**: Correção do status de "Draft" na migração.
- [x] **Multi-Pasta**: Seleção de múltiplas pastas simultâneas.
- [x] **Mapeamento de Subpastas**: Criação automática de pastas inexistentes no destino.
- [x] **Multi-Tenant**: Gerenciamento de múltiplos perfis de clientes no localStorage.
- [x] **Validação de Destino**: Impedimento de erros por falta de definição de caixa compartilhada.

## 🚀 Fase 2: Escala e Robustez (Atual - Background Edition)
- [x] **Migração em Background**: Integração com GitHub Actions para migrações longas (6h+).
- [x] **Persistence & Realtime**: Logs e progresso salvos no Supabase com atualização ao vivo via WebSockets.
- [x] **Paginação Graph API**: Remoção do limite de 100 e-mails (agora processa milhares por vez).
- [x] **Nova UI de Seleção**: Substituição do Ctrl+Click por Checkboxes modernas e intuitivas.
- [x] **Logs com Data/Hora**: Melhor rastreabilidade das operações históricas.

## 🛠️ Fase 3: Recursos Avançados (Próximos Passos)
- [ ] **Sincronização Delta (Incremental)**: Opção de migrar apenas e-mails novos desde a última migração.
- [ ] **Dashboard de Histórico**: Tela para visualizar e filtrar todas as migrações passadas de um cliente.
- [ ] **Exportação de Relatórios**: Gerar PDF/CSV detalhado do que foi migrado para entregar ao cliente final.
- [ ] **Agendamento**: Programar migrações para horários de menor tráfego (ex: madrugada).
- [ ] **Migração em Lote (Bulk)**: Selecionar múltiplos usuários de origem para uma única caixa de destino de uma vez.

---
*Última atualização: 29 de Abril de 2026*
