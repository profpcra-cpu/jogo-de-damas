// sobre.js
// Conteúdo do README embutido como string.
// Quando atualizares o README.md, copia o novo conteúdo para dentro
// das backticks abaixo (mantém o Markdown tal e qual).
// Nota: backticks dentro do texto têm de ser escapadas com \`

export const CONTEUDO_SOBRE = `
# ♟️ Jogo de Damas — Génese e Estado Atual do Projeto

**Um jogo de Damas 8×8 multiplayer em tempo real** — construído incrementalmente, versão a versão, como um caderno aberto de decisões técnicas, experimentações e correções. Este documento serve de **memória do projeto**: o que foi feito, porquê, e para onde pode ir a seguir.

---

## 📖 Índice

1. [Génese do Projeto](#-génese-do-projeto)
2. [Linha do Tempo das Versões](#-linha-do-tempo-das-versões)
3. [Arquitetura Atual](#-arquitetura-atual)
4. [Funcionalidades por Área](#-funcionalidades-por-área)
5. [Regras de Jogo Implementadas](#-regras-de-jogo-implementadas)
6. [Decisões Técnicas Notáveis](#-decisões-técnicas-notáveis)
7. [Bugs Encontrados e Corrigidos](#-bugs-encontrados-e-corrigidos)
8. [Limitações Conhecidas](#-limitações-conhecidas)
9. [Roadmap — Próximas Melhorias](#-roadmap--próximas-melhorias)
10. [Stack Técnica](#-stack-técnica)
11. [Como Jogar](#-como-jogar)
12. [Como Contribuir](#-como-contribuir)

---

## 🌱 Génese do Projeto

O **Jogo de Damas** começou como um **projeto educacional** — o objetivo era demonstrar, num único ficheiro HTML, como construir uma aplicação multiplayer em tempo real sem backend próprio, usando apenas:

- **Firebase Realtime Database** como camada de sincronização
- **ES Modules** nativos do browser (sem build step)
- **Web Audio API** para sons gerados proceduralmente (sem ficheiros .mp3)
- **Canvas API** para gravação de vídeo local (sem \`getDisplayMedia\`)
- **CSS puro** com variáveis para temas múltiplos

A **filosofia** foi sempre:

> **Zero dependências de build. Um único ficheiro \`index.html\` que se abre num servidor HTTP simples e funciona. Cada funcionalidade nova deve ser aditiva, nunca reescrever o que já funciona.**

Ao longo das iterações, o projeto cresceu de um simples tabuleiro sincronizado para uma aplicação com **torneios, IA, chat, ranking global, gravação de vídeo, tutoriais e acessibilidade**.

---

## 📅 Linha do Tempo das Versões

### **v0.1 — O Núcleo (Protótipo Inicial)**
> *"Dois jogadores, um tabuleiro, um link."*

- Tabuleiro 8×8 clássico
- Lógica básica de movimentos diagonais e capturas
- Convite via WhatsApp com link mágico (\`?sala=XXX\`)
- Sincronização via Firebase RTDB com \`runTransaction\` (evita race conditions)
- Deteção de presença com \`onDisconnect\`
- Tema escuro/claro com persistência em \`localStorage\`

**Limitações conhecidas:** sem timer, sem pausa, sem capturas em cadeia, sem tratamento de saídas.

---

### **v0.2 — Polimento Visual e Regras**
> *"O jogo tem de parecer bom e jogar melhor."*

- ✅ Marcação do tabuleiro com coordenadas \`a–h\` / \`1–8\`
- ✅ Perspetiva invertida para as peças vermelhas
- ✅ Tela cheia (desktop + mobile + fallback iOS)
- ✅ Sistema de som via **Web Audio API** (procedural, sem ficheiros)
- ✅ Modo espectador via \`?sala=XXX&modo=assistir\`
- ✅ Chat rápido com 10 emojis pré-definidos
- ✅ Placar de vitórias por sessão (\`localStorage\`)

---

### **v0.3 — Regras Oficiais e Fluxo Pós-Jogo**
> *"Um jogo de damas a sério precisa de regras a sério."*

- ✅ **Captura obrigatória** (regra oficial)
- ✅ **Capturas múltiplas em cadeia** (a peça continua a capturar)
- ✅ Botão **🏳️ Desistir** com confirmação e vitória automática do adversário
- ✅ Botão **🔄 Jogar Novamente** com aceite/recusa do adversário
- ✅ Deteção de fim de jogo por falta de movimentos
- ✅ **Saída = derrota** com aviso prévio (proteção contra abandono)

---

### **v0.4 — Personalização e Imersão**
> *"Cada jogador joga como quer."*

- ✅ **5 temas visuais**: Escuro, Claro, Neon, Madeira, Minimal
- ✅ **3 pacotes de som**: Clássico, Arcade, Suave
- ✅ **8 conquistas** desbloqueáveis (primeira vitória, streaks, torneios, IA, capturador, etc.)
- ✅ **Ranking global** via Firebase (top 10 por vitórias)
- ✅ **Modo tutorial guiado** com 7 passos interativos
- ✅ **IA em 3 níveis** (Fácil, Médio, Difícil) — jogo local, sem Firebase
- ✅ **Animações de captura** (peça "voadora" com explosão colorida)
- ✅ **Histórico de partidas** com replay passo a passo
- ✅ **Torneios MD3/MD5** com placar da série
- ✅ **Salas públicas** listadas para entrada aleatória

---

### **v0.5 — Sincronização Avançada**
> *"Quando duas pessoas jogam, tudo tem de estar em sincronia."*

- ✅ **Gravação de vídeo por canvas** (grava apenas o tabuleiro, sem \`getDisplayMedia\`)
- ✅ **Salas privadas com senha** (4 dígitos, modal de prompt)
- ✅ **Chat de texto livre** (até 120 caracteres)
- ✅ **Calendário de torneios agendados** com tempo personalizado
- ✅ **Estatísticas do jogador** (taxa de vitória, streaks, aberturas favoritas)

---

### **v0.6 — Tempo, Pausa e Robustez** *(Versão Atual)*
> *"Um jogo completo precisa de tempo, pausa e resiliência."*

- ✅ **Timer de 40s por jogada** (configurável: 20s/40s/60s/120s/∞)
- ✅ **Aviso sonoro reforçado aos 5s** com flash visual
- ✅ **Pausa mútua** (qualquer jogador pede, outro aceita/recusa)
- ✅ **Tempo médio por jogada** nas estatísticas
- ✅ **Torneio com tempo personalizado** por agendamento
- ✅ **9 bugs críticos corrigidos** (ver secção dedicada)

---

## 🏗️ Arquitetura Atual

O projeto é um **único ficheiro \`index.html\`** + \`sobre.js\` (este ficheiro) + \`firebase-config.js\`. Sem bundler, sem transpilador, sem node_modules.

\`\`\`
jogo-de-damas/
├── index.html          # Aplicação completa (HTML + CSS + JS num só)
├── firebase-config.js  # Credenciais Firebase (não versionado em prod)
├── sobre.js            # Este ficheiro — documentação viva
└── README.md           # Espelho do sobre.js (para GitHub)
\`\`\`

### **Camadas da aplicação (dentro do \`<script type="module">\`)**

| # | Camada | Responsabilidade |
|---|---|---|
| 1 | **Estado Global** | Variáveis mutáveis: tabuleiro, turno, sessão, modo |
| 2 | **Conquistas** | Sistema de medalhas desbloqueáveis com \`localStorage\` |
| 3 | **SoundFX** | Geração procedural de sons (Web Audio API) |
| 4 | **MusicaFundo** | Música ambiente em loop com acordes gerados |
| 5 | **Timer** | Controlo do tempo por jogada com avisos progressivos |
| 6 | **Pausa** | Sistema de pausa mútua (multiplayer) e local (IA/tutorial) |
| 7 | **Placar** | Estatísticas da sessão |
| 8 | **Estatísticas** | Aberturas favoritas, tempo médio, taxas |
| 9 | **Histórico** | Partidas anteriores com replay |
| 10 | **Replay** | Reprodução passo a passo dos movimentos |
| 11 | **Ranking** | Leaderboard global via Firebase |
| 12 | **Salas Públicas** | Listagem de salas abertas |
| 13 | **Agenda** | Calendário local de torneios agendados |
| 14 | **Autenticação** | Firebase Auth (anónimo) |
| 15 | **Entrada via Link** | Deteção de \`?sala=\` + senha |
| 16 | **Criação de Sala** | Privada / Pública / Com Senha / Torneio |
| 17 | **IA** | Motor de jogo contra computador (3 níveis) |
| 18 | **Tutorial** | Passos guiados com highlight |
| 19 | **Renderização** | Tabuleiro adaptativo à perspetiva |
| 20 | **Interação** | Cliques, seleção, movimentos |
| 21 | **Fim de Jogo** | Declaração de vencedor por vários motivos |
| 22 | **Revanche** | Pedido/aceite de nova partida |
| 23 | **Escuta Firebase** | Sincronização em tempo real (jogo) |
| 24 | **Chat** | Emojis + texto livre |
| 25 | **Gravação** | Canvas → WebM |
| 26 | **Tela Cheia** | Fullscreen API + fallback iOS |
| 27 | **Som/Música** | Toggles e persistência |
| 28 | **Temas** | 5 paletas visuais |
| 29 | **Listeners finais** | Botões de sair, desistir, pausa, WhatsApp |

---

## 🎯 Funcionalidades por Área

### 🎮 Modos de Jogo
| Modo | Descrição | Firebase? |
|---|---|---|
| **Privada** | Sala com código, convite manual | ✅ |
| **Pública** | Listada em "🌍 Públicas" | ✅ |
| **Com Senha** | Senha de 4 dígitos gerada automaticamente | ✅ |
| **Torneio MD3/MD5** | Série de partidas com placar | ✅ |
| **Agendado** | Torneio com data/hora + tempo personalizado | ✅ |
| **Espectador** | Assiste sem jogar (\`?modo=assistir\`) | ✅ |
| **vs IA (Fácil/Médio/Difícil)** | Jogo local | ❌ |
| **Tutorial Guiado** | 7 passos interativos | ❌ |

### ⏱️ Sistema de Tempo
- **Configurável**: 20s / 40s / 60s / 120s / ∞
- **Barra de progresso visual** com 3 cores (verde → amarelo → vermelho)
- **Aviso sonoro reforçado** aos 5 segundos (gain 0.20–0.24)
- **Flash vermelho** no tabuleiro aos 5s
- **Corre pelo humano apenas** — contra IA, a IA não consome tempo
- **Timeout** = derrota por tempo (motivo \`'timeout'\`)

### ⏸️ Pausa Mútua
- Qualquer jogador pede pausa → adversário aceita/recusa
- Timer **congela** durante pausa
- Overlay visual **"⏸️ PAUSADO"** com blur
- Badge **"⏸️ EM PAUSA"** no cabeçalho
- **Qualquer lado pode retomar** (flag única no Firebase)

### 🏅 Conquistas (10 ativas)
| Medalha | Critério |
|---|---|
| 🥇 Primeira Vitória | 1 vitória |
| 🎖️ Veterano | 5 vitórias |
| 👑 Lendário | 15 vitórias |
| 🔥 3 Seguidas | Streak de 3 |
| ⚡ Imparável | Streak de 5 |
| 🏆 Campeão | Vencer um torneio |
| 🤖 Venceu a IA | Bater a IA no nível médio |
| 🎯 Capturador | 20 capturas |
| ⚡ Relâmpago | Vencer por timeout do adversário |
| 🧘 Paciente | Sobreviver a uma pausa |

### 🎨 Temas Visuais
- 🌙 **Escuro** — padrão, cores sóbrias com gradientes indigo/violeta
- ☀️ **Claro** — fundo suave, alto contraste
- 💜 **Neon** — fundo preto, peças com glow, tabuleiro violeta
- 🪵 **Madeira** — paleta castanha, estilo tabuleiro tradicional
- ◾ **Minimal** — monocromático, sem sombras nem efeitos

### 🔊 Pacotes de Som
- 🎻 **Clássico** — tons senoidais suaves
- 🕹️ **Arcade** — square waves retro
- 🌊 **Suave** — triangle/sine com envelope longo

### 🌐 Multiplayer Firebase
- **Salas**: \`/salas_damas/<codigo>\`
- **Jogadores**: \`/jogadores/<uid>\` com \`{ nome, cor, online, vitorias }\`
- **Tabuleiro**: matriz 8×8 serializada
- **Turno**: \`'white'\` ou \`'red'\`
- **Status**: \`'jogando'\` ou \`'encerrado'\`
- **Chat**: \`/chat/<pushKey>\` com \`{ emoji, texto, de, nome, ts }\`
- **Pausa**: \`pausaPedido\` (pendente) + \`pausaAtiva\` (aceite)
- **Revanche**: \`pedidoRevanche\` + \`reiniciadaEm\`
- **Ranking**: \`/ranking_damas/<uid>\` com \`runTransaction\`

### 💾 Persistência Local (\`localStorage\`)
| Chave | Conteúdo |
|---|---|
| \`brain_damas_sessao\` | Sala atual (para reconexão) |
| \`brain_damas_tema\` | Tema visual ativo |
| \`brain_damas_sfx\` | Pacote de sons ativo |
| \`brain_damas_som\` | Som ligado/desligado |
| \`brain_damas_musica\` | Música ligada/desligada |
| \`brain_damas_tempo\` | Tempo por jogada |
| \`brain_damas_placar\` | Vitórias/derrotas da sessão |
| \`brain_damas_conquistas\` | Medalhas + stats |
| \`brain_damas_stats\` | Aberturas favoritas |
| \`brain_damas_historico\` | Últimas 20 partidas |
| \`brain_damas_agenda\` | Torneios agendados |
| \`brain_damas_prefs\` | Nome + avatar |

---

## ♟️ Regras de Jogo Implementadas

### Movimento
- **Peões**: diagonal, uma casa, apenas para frente
  - Brancas movem para cima (linha decrescente)
  - Vermelhas movem para baixo (linha crescente)
- **Damas**: diagonal, qualquer distância, sem saltar peças (exceto para capturar)

### Captura
- **Obrigatória** quando existe: se houver captura disponível, o jogador **é bloqueado** de fazer movimentos simples
- **Peões capturam** apenas para frente
- **Damas capturam** em qualquer diagonal, à distância
- **Captura múltipla em cadeia**: se após capturar a mesma peça puder capturar novamente, o jogo **força a continuação** (não passa turno)

### Promoção
- Peão que atinge a última linha torna-se **Dama (\`king\`)**
- Som especial + toast de notificação

### Fim de Jogo
- **Sem peças**: adversário vence automaticamente
- **Sem movimentos**: adversário vence automaticamente
- **Desistência**: adversário vence
- **Timeout**: adversário vence
- **Saída da sala**: adversário vence (via \`onDisconnect\`)

---

## 💡 Decisões Técnicas Notáveis

### 1. **Um único ficheiro HTML**
**Porquê:** portabilidade máxima. Não precisa de build, npm, webpack. Qualquer pessoa abre num servidor HTTP e funciona. Facilita deploy em GitHub Pages.

**Trade-off:** o ficheiro é enorme (~4000 linhas). Futuramente pode valer a pena modularizar em ES modules separados.

### 2. **Firebase RTDB em vez de Firestore**
**Porquê:** latência muito menor para sincronização de estado em tempo real. \`onValue\` é instantâneo. Firestore tem quotas mais restritas para leitura em tempo real.

### 3. **Som procedural (Web Audio API)**
**Porquê:** zero ficheiros .mp3/.ogg a carregar. Todos os sons são gerados com osciladores + envelopes. Reduz tamanho do projeto e evita problemas de CORS/cache.

**Trade-off:** menos rico que samples reais, mas suficiente para feedback de jogo.

### 4. **Gravação por \`canvas.captureStream()\` em vez de \`getDisplayMedia()\`**
**Porquê:** grava **apenas o tabuleiro**, não a tela toda. Não pede permissões de ecrã. Funciona em background.

**Trade-off:** não captura interações fora do tabuleiro (chat, botões).

### 5. **Torneio como \`melhorDe: N\` na mesma sala**
**Porquê:** evita criar N salas. O placar da série é mantido em \`torneioPlacar\` local e o \`melhorDe\` no Firebase. Ao final de cada partida, verifica-se se alguém atingiu \`ceil(N/2)\` vitórias.

### 6. **Tempo médio por jogada com sanidade**
**Porquê:** bugs iniciais geravam tempos absurdos (ex.: 300s numa jogada de 8s). Agora o registo valida contra \`tempoLimite + 5s\` de margem.

### 7. **Pausa com 2 flags (pedido + ativa)**
**Porquê:** permite fluxo claro de "pedido → aceite/recusa → estado". Qualquer lado pode desfazer (\`pausaAtiva: null\`) e ambos retomam.

### 8. **IA local, sem Firebase**
**Porquê:** evita quota e latência. A IA joga imediatamente no mesmo dispositivo. Permite treinar offline.

### 9. **Captura múltipla com \`capturaMultipla\` no Firebase**
**Porquê:** o adversário precisa saber que a peça está a mover-se em cadeia (mostrar highlight). Campo opcional, limpo ao terminar.

### 10. **Aberturas agrupadas pelas 3 primeiras jogadas**
**Porquê:** padrão suficientemente distinto para identificar estilos (ex.: "e3-d4, d4-c5, c3-b4" = abertura clássica). Mais simples que análise de posição.

---

## 🐛 Bugs Encontrados e Corrigidos

### Bug #1 — Timer não reiniciava após jogada (multiplayer)
**Sintoma:** ao jogar e a vez voltar para o mesmo jogador (captura múltipla), o timer **parava** permanentemente.

**Causa:** \`iniciarTimer()\` só era chamado no \`escutarFirebase\` quando o turno mudava. Numa captura múltipla, o turno não muda.

**Correção:** \`iniciarTimer()\` também é chamado dentro de \`executarMovimento()\` quando a captura múltipla termina e ainda é a vez do jogador.

---

### Bug #2 — Timer disparava para o adversário
**Sintoma:** ao passar o turno, o timer **começava a correr** para o jogador que já não jogava.

**Causa:** a condição \`turnoAnterior !== turnoAtual && turnoAtual === minhaCor\` estava correta, mas o \`setInterval\` dentro de \`iniciarTimer\` não revalidava o turno a cada tick.

**Correção:** \`if (turnoAtual !== minhaCor) { pararTimer(); return; }\` dentro do próprio \`setInterval\`.

---

### Bug #3 — Pausa "presa" em multiplayer
**Sintoma:** após uma pausa ser retomada, o estado ficava inconsistente. Um jogador via o overlay, outro não.

**Causa:** a condição para retomar remotamente exigia \`!pausaSolicitadaPorMim\`, o que nunca era verdadeiro no jogador que pediu a pausa.

**Correção:** retomar sempre que \`!pausaAtivaRemota && emPausa\`, independentemente de quem pediu.

---

### Bug #4 — Botão pausa não mudava de função
**Sintoma:** ao retomar uma pausa, o botão continuava a dizer "⏸️ Pausa" e ao clicar pedia pausa de novo.

**Causa:** a lógica de toggle estava duplicada no listener em vez de unificada.

**Correção:** função \`togglePausa()\` única que consulta o estado \`emPausa\`.

---

### Bug #5 — \`pausaSolicitadaPorMim\` nunca resetava
**Sintoma:** após a primeira pausa, todas as pausas futuras ficavam bloqueadas.

**Causa:** a flag era definida como \`true\` em \`pedirPausa()\` mas nunca reposta.

**Correção:** reset em \`retomarPausaLocal()\`.

---

### Bug #6 — Tempo médio com valores absurdos
**Sintoma:** estatística de "Tempo Médio/Jogada" mostrava 200s+, mesmo em partidas rápidas.

**Causa:** \`tempoInicioJogada\` nem sempre era zerado quando o turno mudava (por timeout, por saída, por desistência).

**Correção:** \`registrarTempoJogada()\` valida a duração contra \`tempoLimite + 5s\` antes de registar. Descarta valores fora da faixa.

---

### Bug #7 — Tempos contaminavam entre partidas
**Sintoma:** ao iniciar nova partida (IA/tutorial), as estatísticas do tempo médio continuavam a considerar jogadas da partida anterior.

**Causa:** \`temposJogadas\` não era resetado em \`iniciarPartidaIA()\`, \`iniciarTutorial()\` e \`resetarParaNovaPartida()\`.

**Correção:** \`temposJogadas = [];\` nesses três pontos.

---

### Bug #8 — Timer duplicado em IA
**Sintoma:** ao jogar contra IA, dois \`setInterval\` eram criados — o timer decrementava duas vezes por segundo.

**Causa:** \`iniciarPartidaIA()\` chamava \`iniciarTimer()\` e \`entrarInterfaceJogo()\` também agendava \`iniciarTimer()\` num \`setTimeout\`.

**Correção:** removida a chamada explícita em \`iniciarPartidaIA()\`. Apenas \`entrarInterfaceJogo()\` agenda o timer.

---

### Bug #9 — Captura múltipla piscava para o adversário
**Sintoma:** durante uma captura em cadeia, o tabuleiro do adversário "piscava" — via o tabuleiro intermédio como se fosse uma jogada completa.

**Causa:** o adversário não sabia que a captura múltipla estava em curso. Só o jogador que a executava tinha \`capturaMultiplaAtiva\`.

**Correção:** campo \`capturaMultipla: { r, c, cor }\` no Firebase. O adversário destaca a peça em curso sem tentar jogar.

---

## ⚠️ Limitações Conhecidas

| # | Limitação | Impacto | Solução futura |
|---|---|---|---|
| 1 | Ficheiro único de ~4000 linhas | Difícil de manter | Modularizar em ES modules |
| 2 | Sem testes automatizados | Regressões silenciosas | Adicionar Vitest/Jest |
| 3 | Autenticação anónima (sem conta) | Perde histórico se limpar cache | Firebase Auth com Google |
| 4 | Sem sistema de matchmaking | Depende de partilha de link | Fila aleatória de jogadores |
| 5 | IA com heurística simples | Não é competitiva | Implementar minimax com poda alpha-beta |
| 6 | Sem reconexão automática | Se o WiFi cair, perde-se | Persistir estado + retry |
| 7 | Ranking global sem anti-cheat | Vitórias podem ser infladas | Validação server-side |
| 8 | Chat sem moderação | Linguagem abusiva possível | Filtro + report |
| 9 | Sem suporte a mais de 2 jogadores | Damas é 1v1 por design | Manter assim |
| 10 | Acessibilidade incompleta | Sem ARIA em todos os botões | Auditoria WCAG |

---

## 🚀 Roadmap — Próximas Melhorias

### 🔥 Curto Prazo (Alto Impacto)
- [ ] **Modularização** — dividir \`index.html\` em \`game.js\`, \`ui.js\`, \`firebase.js\`, \`ai.js\`
- [ ] **Testes unitários** com Vitest para \`calcularMovimentos\`, \`verificarFimDeJogo\`
- [ ] **Reconexão automática** — se cair, retomar partida com estado guardado
- [ ] **PWA** — service worker + manifest para jogar offline
- [ ] **Autenticação Google** — persistir conta e histórico entre dispositivos

### 🎯 Médio Prazo (Diferencial)
- [ ] **IA minimax com poda alpha-beta** — níveis de dificuldade mais desafiantes
- [ ] **Sistema de ELO** — divisões Bronze/Prata/Ouro/Diamante/Platina
- [ ] **Matchmaking aleatório** — fila global de jogadores
- [ ] **Torneios eliminatórios** — bracket de 4/8/16 jogadores
- [ ] **Replay partilhável** — link para assistir a uma partida específica
- [ ] **Modo análise** — pós-jogo, ver "melhores jogadas perdidas"
- [ ] **Missões diárias** — "Faça 5 capturas em cadeia hoje"
- [ ] **Recompensas por login** — bónus de streak

### 🌟 Longo Prazo (Ambição)
- [ ] **Editor de posições** — criar puzzles personalizados
- [ ] **Modo cooperativo** — 2v2 em tabuleiro 10×10
- [ ] **Idiomas** — EN, ES, FR, DE
- [ ] **Backend próprio** — WebSocket em vez de Firebase (menos vendor lock-in)
- [ ] **Compilação para mobile** — Capacitor para Android/iOS
- [ ] **API pública** — permitir bots jogarem via REST/WS

### 🎨 Experiência
- [ ] **Modo escuro automático** (prefers-color-scheme)
- [ ] **Vibração háptica** em mobile (capturas, promoção)
- [ ] **Sons ambientes** por tema (neon = synthwave, madeira = acústico)
- [ ] **Avatares personalizados** (upload de imagem)
- [ ] **Emojis animados** no chat

### 🐛 Técnico
- [ ] **Auditoria de acessibilidade** (WCAG AA)
- [ ] **Testes E2E** com Playwright (partida completa)
- [ ] **CI/CD** — GitHub Actions para deploy automático
- [ ] **Rate limiting** no chat
- [ ] **Modo de manutenção** (bloquear novos jogos, permitir terminar)

---

## 🛠️ Stack Técnica

### Frontend
- **HTML5** — estrutura semântica
- **CSS3** — variáveis CSS, grid, flexbox, animações, backdrop-filter
- **JavaScript ES6+** — módulos nativos, async/await, template literals
- **Web APIs**:
  - \`URLSearchParams\` + \`history.replaceState\` — convites
  - \`localStorage\` — persistência
  - \`Web Audio API\` — sons procedurais
  - \`Canvas API\` + \`MediaRecorder\` — gravação
  - \`Fullscreen API\` — tela cheia
  - \`requestAnimationFrame\` — animações suaves

### Backend (Firebase 10.8.0)
- **Realtime Database** — sincronização em tempo real
- **Anonymous Auth** — sessão sem registo
- **\`runTransaction\`** — operações atómicas
- **\`onDisconnect\`** — presença automática
- **\`onValue\`** — listeners em tempo real

### Ferramentas de Desenvolvimento
- **Navegador moderno** (Chrome/Edge/Firefox/Safari)
- **Servidor HTTP local** (\`npx serve\`, \`python -m http.server\`)
- **Firebase Console** — configurar regras e ver dados

### Tipografia
- **Plus Jakarta Sans** — UI
- **JetBrains Mono** — coordenadas e números

---

## 🎮 Como Jogar

### Criar uma partida
1. Abre o jogo, escolhe nome e avatar
2. Escolhe o **tempo por jogada** (20/40/60/120/∞)
3. Clica em **🚀 Criar Sala Privada**
4. És as **⚪ Brancas** (jogas primeiro)

### Convidar oponente
- **💬 Convidar Colega pelo WhatsApp** — envia link mágico
- Ou partilha o **código da sala** (ex.: \`DAMAS-K3X9\`)
- Se a sala tiver senha, ela vai no convite automaticamente

### Durante o jogo
- Peças que podes mover estão **destacadas em âmbar** se houver captura obrigatória
- Clica numa peça → casas válidas ficam **verdes** ou **vermelhas** (captura)
- **Timer** no topo mostra o tempo restante
- **⏸️ Pausa** — pede pausa ao adversário
- **🏳️ Desistir** — declara derrota
- **🎥 Gravar** — grava apenas o tabuleiro em vídeo
- **💬 Chat** — emojis e texto livre

### Fim de jogo
- **🔄 Jogar Novamente** — pede revanche
- **🚪 Sair** — sai para o lobby

---

## 🤝 Como Contribuir

### Reportar bugs
Abre uma **issue** em [github.com/profpcra-cpu/jogo-de-damas/issues](https://github.com/profpcra-cpu/jogo-de-damas/issues) com:
- Descrição do problema
- Passos para reproduzir
- Comportamento esperado vs. observado
- Navegador e sistema operativo

### Sugerir funcionalidades
Usa a secção **💡 Ideas** das Discussions, ou abre issue com etiqueta \`enhancement\`.

### Submeter código
1. Fork do repositório
2. Branch descritiva (\`feat/torneios-eliminatorios\`, \`fix/timer-multiplayer\`)
3. **Um commit por mudança lógica**
4. Mensagem de commit no imperativo ("adiciona X", "corrige Y")
5. Abre Pull Request descrevendo **o porquê** da mudança

### Padrões de código
- **Nomes em português** (consistência com o código existente)
- **Funções puras sempre que possível**
- **Sem dependências novas** sem discussão prévia
- **Comentários em português** explicam o *porquê*, não o *o quê*

---

## 📄 Licença

Distribuído sob a licença **MIT** — usa, modifica e partilha livremente.

---

## 👤 Créditos

**Desenvolvido por [@profpcra-cpu](https://github.com/profpcra-cpu)**

- 🔗 **Repositório**: [github.com/profpcra-cpu/jogo-de-damas](https://github.com/profpcra-cpu/jogo-de-damas)
- 🌐 **Demo**: [profpcra-cpu.github.io/jogo-de-damas](https://profpcra-cpu.github.io/jogo-de-damas/)

**Agradecimentos:**
- Firebase pela infraestrutura em tempo real gratuita
- Comunidade open source pelas ideias de Web Audio API e Canvas API
- Jogadores que testaram as versões iniciais e reportaram bugs

---

> *"Um jogo é uma soma de pequenas decisões. Cada bug corrigido, cada regra implementada, cada tema adicionado — tudo isto conta a história de como duas pessoas se podem encontrar num tabuleiro, mesmo em lados opostos do mundo."*
`;

export default CONTEUDO_SOBRE;
