// sobre.js
// Conteúdo do README embutido como string.
// Quando atualizares o README.md, copia o novo conteúdo para dentro
// das backticks abaixo (mantém o Markdown tal e qual).
// Nota: backticks dentro do texto têm de ser escapadas com \`

export const CONTEUDO_SOBRE = `
# ♟️ Jogo de Damas

**Jogo de Damas Multiplayer** é uma aplicação web que permite partidas de Damas 8×8 em tempo real entre dois jogadores, com convite via WhatsApp, sincronização instantânea com Firebase e interface moderna responsiva.

---

## 🚀 Funcionalidades Principais

- **Partida Multiplayer em Tempo Real**: Dois jogadores em salas privadas, com turnos sincronizados via Firebase Realtime Database.
- **Convite via WhatsApp**: Link mágico com sala pré-configurada — o convidado entra com um clique.
- **Regras completas de Damas**:
  - Movimentos diagonais
  - Captura obrigatória
  - Capturas múltiplas em cadeia
  - Promoção a Dama (\`king\`) ao atingir a última linha
- **Sistema de Turnos Robusto**: Transações atómicas no Firebase impedem race conditions.
- **Detecção de Presença**: \`onDisconnect\` marca automaticamente o jogador como offline.
- **Interface Adaptativa**:
  - Tabuleiro invertido para as peças vermelhas (perspetiva do jogador)
  - Tema escuro/claro com persistência em \`localStorage\`
  - Animações suaves e feedback visual por pulsação nas peças móveis
- **Feedback Sensorial**: Toasts de notificação e modal de fim de jogo.

---

## 📊 Regras Resumidas

| Regra | Descrição |
|---|---|
| **Movimento** | Diagonal, uma casa, apenas para frente (peões) |
| **Captura** | Obrigatória quando disponível |
| **Capturas múltiplas** | Encadeadas — o jogador continua a capturar enquanto possível |
| **Promoção** | Peão que atinge a última linha torna-se Dama |
| **Dama** | Move-se e captura em qualquer diagonal, à distância |
| **Vitória** | Oponente sem peças ou sem movimentos legais |

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 / CSS3 / JavaScript (ES6+ Modules)**: Lógica de jogo, renderização de tabuleiro e gestão de estado.
- **Firebase 10.8.0**:
  - \`Realtime Database\` — salas, tabuleiro, turnos e presença
  - \`runTransaction\` — entrada atómica em salas (evita race conditions)
  - \`onDisconnect\` — marcação automática de offline
- **Web APIs**:
  - \`URLSearchParams\` + \`history.replaceState\` — convites via URL
  - \`localStorage\` — sessão persistente e preferência de tema
- **Google Fonts**: Plus Jakarta Sans + JetBrains Mono

---

## 🎮 Como Jogar

### 1. Criar uma sala
- Abre o jogo, escolhe o teu avatar e nome
- Clica em **"🚀 Criar Sala de Damas"**
- Serás o jogador das **peças brancas** (movem primeiro)

### 2. Convidar o oponente
- Clica em **"💬 Convidar Colega pelo WhatsApp"**
- Envia o link mágico — o convidado entra diretamente na tua sala
- Alternativa: partilha o **código da sala** (ex.: \`DAMAS-K3X9\`)

### 3. Entrar numa sala
- No lobby, cola o código no campo **"🔗 Entrar com Código"**
- Ou abre o link do convite (entrada automática)

### 4. Durante o jogo
- As peças que podes mover **pulsam**
- Clica numa peça → casas válidas ficam **destacadas**
- Casas de **captura** aparecem a **vermelho**
- Após capturar, se houver mais capturas, o jogo **força-te a continuar**

---

## 📂 Estrutura do Código

O projeto é um único ficheiro \`index.html\` com um módulo ES6 embutido, organizado em:

1. **Constantes e Configuração** — URLs, valores válidos de peças
2. **UI Helpers** — modal genérico, toast, tema
3. **Serialização** — conversão tabuleiro ↔ Firebase
4. **Sessão** — recuperação e persistência em \`localStorage\`
5. **Presença** — registo online + \`onDisconnect\`
6. **Convites** — deteção via URL + entrada atómica com \`runTransaction\`
7. **Lobby** — criação de sala, entrada por código
8. **Renderização** — tabuleiro adaptativo (perspetiva do jogador)
9. **Mecânica de Jogo** — \`calcularMovimentos\`, \`executarMovimento\`, capturas múltiplas
10. **Listener Firebase** — sincronização em tempo real protegida contra flutuações

---

## 🌐 URLs e Deploy

- **Demo**: [profpcra-cpu.github.io/jogo-de-damas](https://profpcra-cpu.github.io/jogo-de-damas/)
- **Repositório**: [github.com/profpcra-cpu/jogo-de-damas](https://github.com/profpcra-cpu/jogo-de-damas)

### Executar localmente

\`\`\`bash
git clone https://github.com/profpcra-cpu/jogo-de-damas.git
cd jogo-de-damas
npx serve .
\`\`\`

Abre [http://localhost:3000](http://localhost:3000) no browser.

> ⚠️ O jogo usa \`import\` de ES Modules e Firebase. Não abras via \`file:///\` — usa um servidor HTTP.

---

## 🔥 Configurar Firebase

Edita \`firebase-config.js\` (ou o bloco de configuração) com as tuas credenciais:

\`\`\`javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:xxxxxxxxxxxxxxxx"
};
\`\`\`

### Regras de segurança sugeridas

\`\`\`json
{
  "rules": {
    "salas_damas": {
      "$sala": {
        ".read": true,
        ".write": true,
        "jogadores": {
          "$chave": {
            ".validate": "newData.hasChildren(['nome', 'cor'])"
          }
        }
      }
    }
  }
}
\`\`\`

> Para produção, restringe \`.write\` por presença do jogador.

---

## 📝 Como Executar Localmente

1. Clone o repositório:
   \`\`\`bash
   git clone https://github.com/profpcra-cpu/jogo-de-damas.git
   \`\`\`
2. Sirva localmente:
   \`\`\`bash
   npx serve .
   \`\`\`
3. Abre [http://localhost:3000](http://localhost:3000)

---

## 🗺️ Roadmap

- [x] Multiplayer em tempo real
- [x] Convite via WhatsApp
- [x] Tema escuro/claro
- [x] Capturas múltiplas
- [x] Deteção de presença
- [ ] Modo contra o computador (IA)
- [ ] Histórico de partidas
- [ ] Chat entre jogadores
- [ ] Espectadores
- [ ] Torneios

---

## 📄 Licença

Distribuído sob a licença **MIT**.

---

## 👤 Créditos

**Desenvolvido por [@profpcra-cpu](https://github.com/profpcra-cpu)**

- 🔗 Repositório: [github.com/profpcra-cpu/jogo-de-damas](https://github.com/profpcra-cpu/jogo-de-damas)
`;

export default CONTEUDO_SOBRE;
