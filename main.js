// ============================================================
// Brain Damas v7.2 — Motor de Interface Principal (Nacionais + Internacionais)
// ============================================================

import { db, auth } from "./firebase-config.js";
import { SoundFX, MusicaFundo } from "./sound.js";
import { IA } from "./ai.js";
import {
    criarTabuleiroInicial,
    tabuleiroParaFirebase,
    firebaseParaTabuleiro,
    contarPecasDaCor,
    jogadorTemAlgumMovimento,
    explorarCapturas,
    todosCaminhosCaptura,
    maxCapturasDaPeca,
    maxCapturasGlobais,
    capturasObrigatorias,
    jogadorTemCapturaObrigatoria,
    calcularMovimentos
} from "./game-engine.js";

import {
    criarTabuleiroInternacional,
    tabuleiroParaFirebaseInt,
    firebaseParaTabuleiroInt,
    contarPecasDaCorInt,
    jogadorTemAlgumMovimentoInt,
    calcularMovimentosInt,
    maxCapturasGlobaisInt,
    capturasObrigatoriasInt,
    jogadorTemCapturaObrigatoriaInt
} from "./game-engine-internacional.js";

// Importação condicional do Firebase RTDB e Auth via CDN
let rtdb = null, fbauth = null;
try {
    rtdb = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");
    fbauth = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
} catch (e) {
    console.warn('[Firebase] Módulos de rede não carregados — modo offline.');
}

const fns = rtdb && fbauth ? {
    ref: rtdb.ref, get: rtdb.get, set: rtdb.set, update: rtdb.update,
    onValue: rtdb.onValue, runTransaction: rtdb.runTransaction, push: rtdb.push,
    remove: rtdb.remove, serverTimestamp: rtdb.serverTimestamp,
    onDisconnect: rtdb.onDisconnect,
    signInAnonymously: fbauth.signInAnonymously,
    onAuthStateChanged: fbauth.onAuthStateChanged
} : {};

const firebaseDisponivel = !!db;

// === ESTADO GLOBAL ===
let jogadorSessao = null;
let apelido = '';
let idSalaAtual = null;
let minhaCor = null;
let tabuleiro = [];
let celulaSelecionada = null;
let movimentosValidos = [];
let turnoAtual = 'white';
let jogoEncerrado = false;
let unsubscribeFirebase = null;
let unsubscribeChat = null;
let salaConfirmada = false;
let versaoLocalSala = 0;

let vencedorDeclarado = null;
let pedidoRevancheDe = null;
let desistenciaProcessada = false;
let modoEspectador = false;
let placarSessao = { vitorias: 0, derrotas: 0 };
let nomeOponente = 'Oponente';
let ultimoChatTs = 0;

let modoTorneio = 0;
let torneioPlacar = { eu: 0, op: 0 };
let torneioRodadaAtual = 1;

let historicoMovimentos = [];
let historicoPartidas = [];
let notacaoAtual = [];

let euPronto = false;
let adversarioPronto = false;
let ambosProntos = false;

let offsetServidor = 0;
let turnoInicioServidor = 0;
let timerIntervalId = null;
let timerSegundosRestantes = 0;
let aviso5sDisparado = false;
let tempoLimiteSegundos = 0;

let modoRelogio = 'none';
let tempoInicialRelogio = 0;
let incrementoRelogio = 0;
let relogioBrancas = 0;
let relogioPretas = 0;
let relogioIntervalId = null;

let lancesDamasSemCaptura = 0;
let lancesFinaisEspeciais = 0;
let posicoesRepetidas = {};
let tipoFinalEspecial = null;
let lancesTotais = 0;

let empatePendenteDe = null;
let empateOferecidoPorMim = false;
let emPausa = false;
let pausaPendenteDe = null;
let pausaSolicitadaPorMim = false;

let senhaSalaAtual = null;

let canvasRecorder = null;
let canvasStream = null;
let recordedChunks = [];
let gravandoCanvas = false;
let gravandoIntervalId = null;

let sfxPack = 'classic';

let modoIA = false;
let modoHotSeat = false;
let modoInternacional = false;
let nivelIA = 3;
let iaPensando = false;
let hotSeatNome1 = 'Jogador 1';
let hotSeatNome2 = 'Jogador 2';
let hotSeatJogadorAtual = 'white';

let ultimaJogadaDestino = null;
let modoA11y = false;

let salaCheckInterval = null;
let heartbeatInterval = null;
let monitorAdversarioInterval = null;
let ultimaRespostaFirebase = 0;
let connectionCheckInterval = null;

// === CONQUISTAS ===
const CONQUISTAS = [
    { id: 'primeira_vitoria', emoji: '🥇', nome: 'Primeira Vitória', desc: 'Ganhe sua primeira partida', check: (s) => s.vitorias >= 1 },
    { id: 'veterano', emoji: '🎖️', nome: 'Veterano', desc: 'Ganhe 5 partidas', check: (s) => s.vitorias >= 5 },
    { id: 'lendario', emoji: '👑', nome: 'Lendário', desc: 'Ganhe 15 partidas', check: (s) => s.vitorias >= 15 },
    { id: 'streak3', emoji: '🔥', nome: '3 Seguidas', desc: '3 vitórias consecutivas', check: (s) => s.maiorStreak >= 3 },
    { id: 'streak5', emoji: '⚡', nome: 'Imparável', desc: '5 vitórias consecutivas', check: (s) => s.maiorStreak >= 5 },
    { id: 'empate', emoji: '🤝', nome: 'Diplomata', desc: 'Faça um empate', check: (s) => s.empates >= 1 },
    { id: 'hotseat', emoji: '👥', nome: 'Hot-Seat', desc: 'Jogue em modo Hot-Seat', check: (s) => s.hotseatJogado >= 1 },
    { id: 'maratonista', emoji: '🎮', nome: 'Maratonista', desc: 'Jogue 10 partidas', check: (s) => (s.vitorias + s.derrotas) >= 10 }
];

function carregarConquistas() {
    try {
        const raw = JSON.parse(localStorage.getItem('brain_damas_conquistas') || '{}');
        return {
            unlocked: raw.unlocked || {},
            stats: raw.stats || { vitorias: 0, derrotas: 0, empates: 0, maiorStreak: 0, streakAtual: 0, hotseatJogado: 0 }
        };
    } catch (_) {
        return { unlocked: {}, stats: { vitorias: 0, derrotas: 0, empates: 0, maiorStreak: 0, streakAtual: 0, hotseatJogado: 0 } };
    }
}
function salvarConquistas(d) { localStorage.setItem('brain_damas_conquistas', JSON.stringify(d)); }
function desbloquearConquistas() {
    const data = carregarConquistas();
    const novas = [];
    CONQUISTAS.forEach(c => {
        if (!data.unlocked[c.id] && c.check(data.stats)) { data.unlocked[c.id] = true; novas.push(c); }
    });
    if (novas.length > 0) {
        salvarConquistas(data);
        novas.forEach((c, i) => {
            setTimeout(() => { toast(`🏅 ${c.emoji} ${c.nome}`, 'success'); SoundFX.achievement(); }, i * 900);
        });
    }
    atualizarGridConquistas();
}
function atualizarGridConquistas() {
    const grid = document.getElementById('ach-grid');
    if (!grid) return;
    const data = carregarConquistas();
    grid.innerHTML = CONQUISTAS.map(c => {
        const unlocked = !!data.unlocked[c.id];
        return `<div class="ach-item ${unlocked ? 'unlocked' : ''}" title="${c.desc}">
            <span>${c.emoji}</span><span class="ach-label">${c.nome}</span>
        </div>`;
    }).join('');
    const desb = Object.keys(data.unlocked).length;
    document.getElementById('ach-resumo').textContent = `${desb} / ${CONQUISTAS.length} desbloqueadas`;
}

function vibrar(padrao = 30) {
    if (!('vibrate' in navigator)) return;
    try { navigator.vibrate(padrao); } catch (_) {}
}

function toast(mensagem, tipo = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${tipo}`; el.textContent = mensagem;
    container.appendChild(el);
    if (tipo === 'success' || tipo === 'error') SoundFX.notify();
    setTimeout(() => el.remove(), 3500);
}

function abrirModal({ icon = 'ℹ️', title, message, actions = [] }) {
    document.getElementById('modal-icon').textContent = icon;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    const container = document.getElementById('modal-actions');
    container.innerHTML = '';
    actions.forEach(acao => {
        const btn = document.createElement('button');
        btn.textContent = acao.label;
        if (acao.className) btn.className = acao.className;
        btn.onclick = () => {
            SoundFX.click();
            document.getElementById('modal-overlay').classList.remove('active');
            acao.onClick();
        };
        container.appendChild(btn);
    });
    document.getElementById('modal-overlay').classList.add('active');
    SoundFX.notify();
}

function abrirPromptApelido({ primeiraVez = false, atual = '' } = {}) {
    const title = prompt(primeiraVez ? '👋 Bem-vindo! Como queres ser chamado?' : '✏️ Novo apelido:', atual || 'Jogador');
    if (title === null) return;
    const val = (title || '').trim().slice(0, 20);
    if (!val) return;
    apelido = val;
    localStorage.setItem('brain_damas_apelido', apelido);
    atualizarApelidoUI();
    if (jogadorSessao) jogadorSessao.nome = apelido;
    toast(`✏️ Apelido: ${apelido}`, 'success');
}

function casaParaNotacao(r, c) { return String.fromCharCode(97 + c) + ((modoInternacional ? 10 : 8) - r); }
function adicionarNotacao(cor, de, para, captura, isDama, caminhoCompleto) {
    let texto = '';
    const prefixo = isDama ? 'D' : '';
    if (captura) {
        texto = `${prefixo}${casaParaNotacao(de.r, de.c)}x${casaParaNotacao(para.r, para.c)}`;
        if (caminhoCompleto && caminhoCompleto.length > 1) texto += ` (${caminhoCompleto.length}x)`;
    } else {
        texto = `${prefixo}${casaParaNotacao(de.r, de.c)}-${casaParaNotacao(para.r, para.c)}`;
    }
    notacaoAtual.push({ cor, texto });
    renderizarNotacao();
}
function renderizarNotacao() {
    const panel = document.getElementById('notacao-panel');
    if (!panel) return;
    if (notacaoAtual.length === 0) {
        panel.innerHTML = '<span class="notacao-vazia">A partida ainda não começou…</span>';
        return;
    }
    let html = ''; let num = 1;
    for (let i = 0; i < notacaoAtual.length; i += 2) {
        const brancas = notacaoAtual[i];
        const pretas = notacaoAtual[i + 1];
        html += `<span class="mov-num">${num}.</span> `;
        if (brancas) {
            const cls = brancas.texto.includes('x') ? 'mov-captura' : '';
            html += `<span class="mov-branca ${cls}">${brancas.texto}</span> `;
        }
        if (pretas) {
            const cls = pretas.texto.includes('x') ? 'mov-captura' : '';
            html += `<span class="mov-preta ${cls}">${pretas.texto}</span>`;
        }
        html += '<br>'; num++;
    }
    panel.innerHTML = html;
    panel.scrollTop = panel.scrollHeight;
}
function exportarNotacao() {
    if (notacaoAtual.length === 0) return '';
    let linhas = [];
    for (let i = 0; i < notacaoAtual.length; i += 2) {
        const b = notacaoAtual[i]; const p = notacaoAtual[i + 1];
        linhas.push(`${Math.floor(i / 2) + 1}. ${b ? b.texto : ''} ${p ? p.texto : ''}`.trim());
    }
    return linhas.join('\n');
}

async function calcularOffsetServidor() {
    if (!firebaseDisponivel) { offsetServidor = 0; return; }
    try {
        const snap = await fns.get(fns.ref(db, '.info/serverTimeOffset'));
        offsetServidor = snap.val() || 0;
    } catch (e) { offsetServidor = 0; }
}
function agoraServidor() { return Date.now() + offsetServidor; }

function salvarSessao() { if (idSalaAtual && minhaCor) localStorage.setItem('brain_damas_sessao', JSON.stringify({ sala: idSalaAtual })); }
function limparSessao() {
    localStorage.removeItem('brain_damas_sessao');
    const url = new URL(window.location.href);
    url.searchParams.delete('sala'); url.searchParams.delete('modo');
    window.history.replaceState({}, '', url.pathname);
    pararMonitorConexao(); pararTimer(); pararRelogio();
    pararHeartbeat(); pararMonitorSala(); pararMonitorAdversario();
}
function gerarSenha() { return Math.floor(1000 + Math.random() * 9000).toString(); }

function iniciarMonitorConexao() {
    if (!firebaseDisponivel) return;
    if (connectionCheckInterval) clearInterval(connectionCheckInterval);
    ultimaRespostaFirebase = Date.now();
    connectionCheckInterval = setInterval(() => {
        if (!idSalaAtual) return;
        const diff = Date.now() - ultimaRespostaFirebase;
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;
        if (diff > 5000 && ultimaRespostaFirebase > 0) {
            statusEl.classList.remove('hidden');
            const msgEl = document.getElementById('connection-msg');
            if (msgEl) msgEl.textContent = `Reconectando… (${Math.floor(diff / 1000)}s)`;
        }
    }, 1000);
}
function pararMonitorConexao() {
    if (connectionCheckInterval) { clearInterval(connectionCheckInterval); connectionCheckInterval = null; }
    document.getElementById('connection-status')?.classList.add('hidden');
}
function marcarFirebaseVivo() { ultimaRespostaFirebase = Date.now(); document.getElementById('connection-status')?.classList.add('hidden'); }

function iniciarHeartbeat() {
    pararHeartbeat();
    if (!firebaseDisponivel || !idSalaAtual || !jogadorSessao?.chave) return;
    heartbeatInterval = setInterval(async () => {
        if (!idSalaAtual) { pararHeartbeat(); return; }
        try {
            await fns.update(fns.ref(db, `salas_damas/${idSalaAtual}/jogadores/${jogadorSessao.chave}`), {
                ultimoPing: fns.serverTimestamp ? fns.serverTimestamp() : Date.now()
            });
        } catch (_) {}
    }, 5000);
}
function pararHeartbeat() { if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; } }

function iniciarMonitorAdversario() {
    pararMonitorAdversario();
    if (!firebaseDisponivel || !idSalaAtual) return;
    monitorAdversarioInterval = setInterval(async () => {
        if (!idSalaAtual) { pararMonitorAdversario(); return; }
        try {
            const snap = await fns.get(fns.ref(db, `salas_damas/${idSalaAtual}/jogadores`));
            if (!snap.exists()) return;
            const jogadores = snap.val();
            const uidOponente = Object.keys(jogadores).find(u => u !== jogadorSessao?.chave);
            if (!uidOponente) return;
            const ping = jogadores[uidOponente]?.ultimoPing || 0;
            const agora = agoraServidor();
            const avisoEl = document.getElementById('aviso-desconexao');
            if (ping > 0 && (agora - ping) > 15000) avisoEl?.classList.remove('hidden');
            else avisoEl?.classList.add('hidden');
        } catch (_) {}
    }, 5000);
}
function pararMonitorAdversario() {
    if (monitorAdversarioInterval) { clearInterval(monitorAdversarioInterval); monitorAdversarioInterval = null; }
    document.getElementById('aviso-desconexao')?.classList.add('hidden');
}

const TEMPO_INATIVIDADE_SALA_MS = 30 * 60 * 1000;
function marcarAtividadeSala() {
    if (!firebaseDisponivel || !idSalaAtual) return;
    try {
        fns.update(fns.ref(db, `salas_damas/${idSalaAtual}`), {
            ultimaAtividade: fns.serverTimestamp ? fns.serverTimestamp() : Date.now()
        }).catch(() => {});
    } catch (_) {}
}
function pararMonitorSala() { if (salaCheckInterval) { clearInterval(salaCheckInterval); salaCheckInterval = null; } }
function iniciarMonitorSala() {
    pararMonitorSala();
    if (!firebaseDisponivel || !idSalaAtual) return;
    salaCheckInterval = setInterval(async () => {
        if (!idSalaAtual) { pararMonitorSala(); return; }
        try {
            const snap = await fns.get(fns.ref(db, `salas_damas/${idSalaAtual}/ultimaAtividade`));
            if (snap.exists()) {
                if (agoraServidor() - snap.val() > TEMPO_INATIVIDADE_SALA_MS) {
                    await fns.remove(fns.ref(db, 'salas_damas/' + idSalaAtual));
                }
            }
        } catch (_) {}
    }, 2 * 60 * 1000);
}

function marcarPronto() {
    if (euPronto) return;
    euPronto = true;
    if (!firebaseDisponivel || !idSalaAtual || !jogadorSessao?.chave || modoEspectador || modoIA || modoHotSeat) {
        adversarioPronto = true; ambosProntos = true;
        document.getElementById('div-handshake')?.classList.add('hidden');
        return;
    }
    fns.update(fns.ref(db, `salas_damas/${idSalaAtual}/jogadores/${jogadorSessao.chave}`), { pronto: true }).catch(() => {});
}

function atualizarHandshake(dados, uids) {
    if (modoEspectador || modoIA || modoHotSeat) {
        adversarioPronto = true; euPronto = true; ambosProntos = true;
        document.getElementById('div-handshake')?.classList.add('hidden');
        return;
    }
    const jogadores = dados.jogadores || {};
    const meuUid = jogadorSessao?.chave;
    const uidOponente = uids.find(u => u !== meuUid);
    if (meuUid && jogadores[meuUid]?.pronto) euPronto = true;
    adversarioPronto = !!(uidOponente && jogadores[uidOponente]?.pronto);
    ambosProntos = euPronto && adversarioPronto;
    const bannerWrap = document.getElementById('div-handshake');
    const bannerMsg = document.getElementById('handshake-msg');
    if (bannerWrap && bannerMsg) {
        if (!ambosProntos) {
            bannerWrap.classList.remove('hidden');
            bannerMsg.textContent = !euPronto ? '⏳ A preparar o teu tabuleiro…' : '⏳ A aguardar que o adversário carregue…';
        } else bannerWrap.classList.add('hidden');
    }
}

async function updateSeguro(path, dados) {
    if (!firebaseDisponivel) return { ok: false };
    try { await fns.update(fns.ref(db, path), dados); return { ok: true }; }
    catch (err) { return { ok: false, err }; }
}

function verificarFimDeJogoCompleto() {
    const pecasBrancas = modoInternacional ? contarPecasDaCorInt(tabuleiro, 'white') : contarPecasDaCor(tabuleiro, 'white');
    const pecasPretas = modoInternacional ? contarPecasDaCorInt(tabuleiro, 'red') : contarPecasDaCor(tabuleiro, 'red');
    if (pecasBrancas === 0 && pecasPretas === 0) return { tipo: 'empate', motivo: 'tabuleiro-vazio' };
    if (pecasBrancas === 0) return { tipo: 'vitoria', vencedor: 'red', motivo: 'sem-pecas' };
    if (pecasPretas === 0) return { tipo: 'vitoria', vencedor: 'white', motivo: 'sem-pecas' };
    const temMovs = modoInternacional ? jogadorTemAlgumMovimentoInt(tabuleiro, turnoAtual) : jogadorTemAlgumMovimento(tabuleiro, turnoAtual);
    if (!temMovs) {
        return { tipo: 'vitoria', vencedor: turnoAtual === 'white' ? 'red' : 'white', motivo: 'sem-movimentos' };
    }
    return null;
}

function pararTimer() {
    if (timerIntervalId) { clearInterval(timerIntervalId); timerIntervalId = null; }
    document.getElementById('timer-bar-wrap')?.classList.add('hidden');
    document.getElementById('timer-display')?.classList.add('hidden');
}

function iniciarTimer() {
    pararTimer();
    if (tempoLimiteSegundos <= 0 || jogoEncerrado || modoEspectador || emPausa) return;
    const minhaVez = modoHotSeat ? true : (turnoAtual === minhaCor);
    if (!minhaVez) return;

    if (!desistenciaProcessada) {
        const fim = verificarFimDeJogoCompleto();
        if (fim) {
            jogoEncerrado = true;
            tratarFimDeJogo(fim.tipo === 'empate' ? 'empate' : fim.vencedor, fim.motivo);
            return;
        }
    }

    const barWrap = document.getElementById('timer-bar-wrap');
    const display = document.getElementById('timer-display');
    if (barWrap) barWrap.classList.remove('hidden');
    if (display) display.classList.remove('hidden', 'warn', 'danger');

    aviso5sDisparado = false;
    timerIntervalId = setInterval(() => {
        if (jogoEncerrado || emPausa) { pararTimer(); return; }
        if (!modoHotSeat && turnoAtual !== minhaCor) { pararTimer(); return; }

        const decorrido = agoraServidor() - turnoInicioServidor;
        timerSegundosRestantes = Math.max(0, tempoLimiteSegundos - Math.floor(decorrido / 1000));

        if (timerSegundosRestantes <= 10 && timerSegundosRestantes > 5) SoundFX.tick();
        if (timerSegundosRestantes === 5 && !aviso5sDisparado) {
            aviso5sDisparado = true; SoundFX.alert5s();
            toast('🔔 Faltam 5 segundos!', 'error'); vibrar([200, 100, 200]);
        }
        if (display) {
            display.textContent = `⏱️ ${timerSegundosRestantes}s`;
            display.classList.remove('warn', 'danger');
            if (timerSegundosRestantes <= 10) display.classList.add('danger');
            else if (timerSegundosRestantes <= 20) display.classList.add('warn');
        }
        atualizarBarraTimer();
        if (timerSegundosRestantes <= 0) {
            pararTimer(); SoundFX.timeout(); perderPorTempoV7();
        }
    }, 500);
}

function atualizarBarraTimer() {
    const barFill = document.getElementById('timer-bar-fill');
    if (!barFill) return;
    const pct = Math.max(0, (timerSegundosRestantes / tempoLimiteSegundos) * 100);
    barFill.style.width = pct + '%';
    barFill.classList.remove('warn', 'danger');
    if (timerSegundosRestantes <= 10) barFill.classList.add('danger');
    else if (timerSegundosRestantes <= 20) barFill.classList.add('warn');
}

async function perderPorTempoV7() {
    if (jogoEncerrado || desistenciaProcessada) return;
    if (!modoHotSeat && turnoAtual !== minhaCor) return;
    const corPerdedora = modoHotSeat ? turnoAtual : minhaCor;
    const corAdversaria = corPerdedora === 'white' ? 'red' : 'white';
    jogoEncerrado = true; tratarFimDeJogo(corAdversaria, 'timeout');
}

function formatarTempo(ms) {
    const totalSeg = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(totalSeg / 60)}:${(totalSeg % 60).toString().padStart(2, '0')}`;
}
function iniciarRelogio() {
    pararRelogio();
    if (modoRelogio === 'none' || modoHotSeat || jogoEncerrado || modoEspectador || emPausa || turnoAtual !== minhaCor) return;
    const inicio = Date.now();
    relogioIntervalId = setInterval(() => {
        if (jogoEncerrado || emPausa || turnoAtual !== minhaCor) return;
        const decorrido = Date.now() - inicio;
        atualizarRelogioUI();
        if ((turnoAtual === 'white' ? relogioBrancas - decorrido : relogioPretas - decorrido) <= 0) {
            pararRelogio(); SoundFX.timeout(); toast('⏱️ Relógio esgotado!', 'error'); perderPorTempoV7();
        }
    }, 200);
}
function pararRelogio() { if (relogioIntervalId) { clearInterval(relogioIntervalId); relogioIntervalId = null; } }
function atualizarRelogioUI() {
    const elW = document.getElementById('clock-white'), elR = document.getElementById('clock-red');
    if (!elW || !elR) return;
    document.getElementById('clock-white-txt').textContent = formatarTempo(relogioBrancas);
    document.getElementById('clock-red-txt').textContent = formatarTempo(relogioPretas);
    elW.classList.remove('active', 'danger'); elR.classList.remove('active', 'danger');
    if (turnoAtual === 'white') { elW.classList.add('active'); if (relogioBrancas < 30000) elW.classList.add('danger'); }
    else { elR.classList.add('active'); if (relogioPretas < 30000) elR.classList.add('danger'); }
}
function aplicarIncremento(cor) {
    if (modoRelogio === 'none') return;
    if (cor === 'white') relogioBrancas += incrementoRelogio; else relogioPretas += incrementoRelogio;
}

function pedirPausa() {
    if (modoEspectador || jogoEncerrado || emPausa || modoIA || modoHotSeat) return;
    SoundFX.click(); pausaSolicitadaPorMim = true;
    toast('⏸️ Pausa solicitada.', 'info');
}
function togglePausa() { if (emPausa) { emPausa = false; retomarPausaLocal(); } else pedirPausa(); }
function retomarPausaLocal() {
    emPausa = false;
    document.getElementById('board-wrapper-el')?.classList.remove('paused');
    document.getElementById('badge-pausa')?.classList.add('hidden');
    SoundFX.unpause();
    toast('▶️ Retomada!', 'success');
}

function pedirEmpate() {
    if (modoEspectador || jogoEncerrado) return;
    SoundFX.click();
    abrirModal({
        icon: '🤝', title: 'Oferecer Empate?', message: 'Deseja terminar empatado?',
        actions: [
            { label: 'Cancelar', onClick: () => {}, className: 'btn-secundario' },
            { label: '🤝 Empate', onClick: () => { jogoEncerrado = true; tratarFimDeJogo('empate', 'empate'); } }
        ]
    });
}

function carregarHistorico() {
    try { historicoPartidas = JSON.parse(localStorage.getItem('brain_damas_historico') || '[]'); } catch (_) { historicoPartidas = []; }
}
function salvarHistorico() {
    if (historicoPartidas.length > 20) historicoPartidas = historicoPartidas.slice(0, 20);
    try { localStorage.setItem('brain_damas_historico', JSON.stringify(historicoPartidas)); } catch (_) {}
}
function adicionarAoHistorico(resultado, oponente) {
    historicoPartidas.unshift({
        id: 'P-' + Date.now().toString(36).toUpperCase(),
        data: new Date().toISOString(),
        resultado, oponente: oponente || 'Oponente',
        movimentos: historicoMovimentos.slice(), notacao: notacaoAtual.slice()
    });
    salvarHistorico();
}
function renderizarHistorico() {
    const list = document.getElementById('historico-list');
    if (!list) return;
    if (historicoPartidas.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">Nenhuma partida registada.</div>';
        return;
    }
    list.innerHTML = historicoPartidas.map((p, i) => {
        const d = new Date(p.data);
        const dataFmt = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        const cls = p.resultado === 'vitoria' ? 'vitoria' : (p.resultado === 'empate' ? 'empate' : 'derrota');
        return `<div class="historico-item ${cls}">
            <div class="historico-info">
                <strong>${p.resultado === 'vitoria' ? '🏆' : (p.resultado === 'empate' ? '🤝' : '💔')} ${p.resultado}</strong>
                <span class="historico-data">vs ${p.oponente} · ${dataFmt}</span>
            </div>
            <button class="historico-btn btn-secundario" data-idx="${i}">▶️ Replay</button>
        </div>`;
    }).join('');
    list.querySelectorAll('.historico-btn').forEach(btn => {
        btn.addEventListener('click', () => { SoundFX.click(); abrirReplay(historicoPartidas[parseInt(btn.dataset.idx)]); });
    });
}
let replayState = { movimentos: [], idx: 0, timer: null };
function abrirReplay(partida) {
    if (!partida.movimentos || partida.movimentos.length === 0) { toast('Sem movimentos.', 'info'); return; }
    replayState.movimentos = partida.movimentos; replayState.idx = 0;
    document.getElementById('replay-overlay').classList.add('active'); renderizarReplay();
}
function renderizarReplay() {
    const board = document.getElementById('replay-board'); if (!board) return;
    const movs = replayState.movimentos, idx = replayState.idx;
    const t = firebaseParaTabuleiro(movs[idx]?.tabuleiro || criarTabuleiroInicial());
    board.innerHTML = '';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const div = document.createElement('div');
        div.style.background = (r + c) % 2 === 1 ? 'var(--board-dark)' : 'var(--board-light)';
        div.style.display = 'flex'; div.style.alignItems = 'center'; div.style.justifyContent = 'center';
        const peca = t[r]?.[c];
        if (peca) {
            const piece = document.createElement('div');
            piece.className = `piece ${peca.startsWith('white') ? 'white' : 'red'}${peca.includes('king') ? ' king' : ''}`;
            piece.style.width = '80%'; piece.style.height = '80%'; div.appendChild(piece);
        }
        board.appendChild(div);
    }
    document.getElementById('replay-info').textContent = idx === 0 ? `Início · ${movs.length} jogadas` : `Jogada ${idx}/${movs.length}`;
}

function carregarPlacarLocal() {
    try {
        const raw = JSON.parse(localStorage.getItem('brain_damas_placar') || '{}');
        placarSessao = { vitorias: raw.vitorias || 0, derrotas: raw.derrotas || 0 };
    } catch (_) { placarSessao = { vitorias: 0, derrotas: 0 }; }
    atualizarPlacarUI();
}
function salvarPlacarLocal() { localStorage.setItem('brain_damas_placar', JSON.stringify(placarSessao)); }
function atualizarPlacarUI() {
    const v = document.getElementById('placar-vitorias'), d = document.getElementById('placar-derrotas');
    if (v) v.textContent = placarSessao.vitorias; if (d) d.textContent = placarSessao.derrotas;
    const vj = document.getElementById('placar-vitorias-jogo'), vop = document.getElementById('placar-vitorias-op');
    if (vj) vj.textContent = placarSessao.vitorias; if (vop) vop.textContent = placarSessao.derrotas;
}

function carregarAgenda() {
    let agenda = [];
    try { agenda = JSON.parse(localStorage.getItem('brain_damas_agenda') || '[]'); } catch (_) {}
    const list = document.getElementById('agenda-list'); if (!list) return;
    const agora = Date.now();
    agenda = agenda.filter(a => a.timestamp > agora - 600000);
    localStorage.setItem('brain_damas_agenda', JSON.stringify(agenda));
    if (agenda.length === 0) { list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">Nenhum torneio.</div>'; return; }
    agenda.sort((a, b) => a.timestamp - b.timestamp);
    list.innerHTML = agenda.map((a, i) => {
        return `<div class="agenda-item">
            <div class="agenda-info"><span class="agenda-titulo">${a.titulo}</span><span class="agenda-meta">MD${a.melhorDe}</span></div>
            <button class="agenda-btn btn-secundario" data-idx="${i}">▶️ Iniciar</button>
        </div>`;
    }).join('');
}

async function garantirAutenticacao() {
    if (!firebaseDisponivel || !auth) return 'local_' + Math.random().toString(36).slice(2, 12);
    if (auth.currentUser) return auth.currentUser.uid;
    try { const cred = await fns.signInAnonymously(auth); return cred.user.uid; }
    catch (_) { return 'local_' + Math.random().toString(36).slice(2, 12); }
}

// === INICIALIZAÇÃO ===
(async function() {
    carregarPlacarLocal(); carregarConquistas(); atualizarGridConquistas();
    carregarHistorico(); renderizarHistorico(); carregarAgenda();

    apelido = localStorage.getItem('brain_damas_apelido') || '';
    if (localStorage.getItem('brain_damas_a11y') === 'on') aplicarA11y(true);
    const temaSalvo = localStorage.getItem('brain_damas_tema') || 'dark';
    document.documentElement.setAttribute('data-theme', temaSalvo); atualizarSeletorTema();
    sfxPack = localStorage.getItem('brain_damas_sfx') || 'classic';
    SoundFX.setPack(sfxPack); atualizarSeletorSfx();
    const tempoSalvo = localStorage.getItem('brain_damas_tempo');
    if (tempoSalvo !== null) tempoLimiteSegundos = parseInt(tempoSalvo);
    atualizarSeletorTempo();

    await calcularOffsetServidor();
    if (!apelido) setTimeout(() => abrirPromptApelido({ primeiraVez: true }), 500);
    else { atualizarApelidoUI(); await garantirAutenticacao(); }
})();

function atualizarApelidoUI() {
    const nome = apelido || 'Visitante';
    document.getElementById('lobby-nome').textContent = nome;
    document.getElementById('display-nome').textContent = nome;
}

function aplicarA11y(ativo) {
    modoA11y = ativo; document.documentElement.setAttribute('data-a11y', ativo ? 'on' : 'off');
    localStorage.setItem('brain_damas_a11y', ativo ? 'on' : 'off');
}

// === TABS DO LOBBY ===
document.querySelectorAll('#lobby-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        SoundFX.click();
        document.querySelectorAll('#lobby-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        ['jogo', 'historico', 'agenda', 'ranking', 'conquistas', 'config'].forEach(t => {
            document.getElementById('tab-' + t)?.classList.toggle('hidden', t !== tab);
        });
        if (tab === 'conquistas') atualizarGridConquistas();
        if (tab === 'historico') { carregarHistorico(); renderizarHistorico(); }
        if (tab === 'agenda') carregarAgenda();
    });
});

document.getElementById('menu-btn-hotseat').addEventListener('click', () => {
    SoundFX.click(); document.getElementById('menu-inicial').classList.add('hidden'); document.getElementById('painel-hotseat').classList.remove('hidden');
});
document.getElementById('menu-btn-ia').addEventListener('click', () => {
    SoundFX.click(); document.getElementById('menu-inicial').classList.add('hidden'); document.getElementById('painel-ia').classList.remove('hidden');
});
document.getElementById('menu-btn-internacional').addEventListener('click', () => {
    SoundFX.click();
    iniciarPartidaInternacional();
});
document.getElementById('menu-btn-online').addEventListener('click', () => {
    SoundFX.click();
    if (!firebaseDisponivel) { toast('Firebase indisponível.', 'warn'); return; }
    document.getElementById('menu-inicial').classList.add('hidden'); document.getElementById('painel-online').classList.remove('hidden');
});
document.getElementById('btn-voltar-menu-1').addEventListener('click', () => { SoundFX.click(); document.getElementById('painel-ia').classList.add('hidden'); document.getElementById('menu-inicial').classList.remove('hidden'); });
document.getElementById('btn-voltar-menu-2').addEventListener('click', () => { SoundFX.click(); document.getElementById('painel-hotseat').classList.add('hidden'); document.getElementById('menu-inicial').classList.remove('hidden'); });
document.getElementById('btn-voltar-menu-3').addEventListener('click', () => { SoundFX.click(); document.getElementById('painel-online').classList.add('hidden'); document.getElementById('menu-inicial').classList.remove('hidden'); });

function atualizarSeletorTempo() {
    document.querySelectorAll('#tempo-selector .tempo-opt').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.tempo) === tempoLimiteSegundos);
    });
}
document.querySelectorAll('#tempo-selector .tempo-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        tempoLimiteSegundos = parseInt(btn.dataset.tempo);
        localStorage.setItem('brain_damas_tempo', String(tempoLimiteSegundos));
        atualizarSeletorTempo(); SoundFX.click();
    });
});
document.querySelectorAll('#ia-selector .tipo-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        SoundFX.click();
        document.querySelectorAll('#ia-selector .tipo-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active'); nivelIASelecionado = parseInt(btn.dataset.nivel);
    });
});
let nivelIASelecionado = 3;
document.getElementById('btn-jogar-ia').addEventListener('click', () => jogarContraIA(nivelIASelecionado));
document.getElementById('btn-iniciar-hotseat').addEventListener('click', () => {
    iniciarHotSeat(document.getElementById('hotseat-nome-1').value.trim() || 'Jogador 1', document.getElementById('hotseat-nome-2').value.trim() || 'Jogador 2');
});

function iniciarHotSeat(n1, n2) {
    SoundFX.click();
    modoHotSeat = true; modoIA = false; modoInternacional = false; modoEspectador = false; modoTorneio = 0;
    hotSeatNome1 = n1; hotSeatNome2 = n2; hotSeatJogadorAtual = 'white';
    idSalaAtual = 'HS-' + Date.now().toString(36).toUpperCase(); minhaCor = 'white';
    tabuleiro = criarTabuleiroInicial(); turnoAtual = 'white'; turnoInicioServidor = Date.now();
    jogoEncerrado = false; desistenciaProcessada = false; lancesTotais = 0;
    celulaSelecionada = null; movimentosValidos = []; emPausa = false; notacaoAtual = [];
    historicoMovimentos = [{ tabuleiro: tabuleiroParaFirebase(tabuleiro), turno: 'white', cor: 'white', de: '—', para: '—' }];
    salaConfirmada = true; entrarInterfaceJogo(); toast(`👥 ${n1} vs ${n2}`, 'success');
}

function iniciarPartidaInternacional() {
    modoInternacional = true; modoHotSeat = true; modoIA = false; modoEspectador = false; modoTorneio = 0;
    idSalaAtual = 'INT-' + Date.now().toString(36).toUpperCase(); minhaCor = 'white';
    tabuleiro = criarTabuleiroInternacional(); turnoAtual = 'white'; turnoInicioServidor = Date.now();
    jogoEncerrado = false; desistenciaProcessada = false; lancesTotais = 0;
    celulaSelecionada = null; movimentosValidos = []; emPausa = false; notacaoAtual = [];
    historicoMovimentos = [{ tabuleiro: tabuleiroParaFirebaseInt(tabuleiro), turno: 'white', cor: 'white', de: '—', para: '—' }];
    salaConfirmada = true; entrarInterfaceJogoInternacional(); toast('🌍 Damas Internacionais (100 Casas) iniciadas!', 'success');
}

function entrarInterfaceJogo() {
    modoInternacional = false;
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('display-sala-tag').textContent = modoIA ? `🤖 ${IA.NIVEIS[nivelIA].nome}` : (modoHotSeat ? '👥 Hot-Seat' : `Sala: ${idSalaAtual}`);
    document.getElementById('badge-espectador').classList.toggle('hidden', !modoEspectador);
    document.getElementById('badge-ia').classList.toggle('hidden', !modoIA);
    document.getElementById('badge-hotseat').classList.toggle('hidden', !modoHotSeat);

    document.getElementById('checkers-board').classList.remove('internacional');
    document.getElementById('labels-top').classList.remove('internacional');
    document.getElementById('labels-bottom').classList.remove('internacional');
    document.getElementById('labels-left').classList.remove('internacional');
    document.getElementById('labels-right').classList.remove('internacional');

    renderizarTabuleiro(); renderizarNotacao();
    setTimeout(() => { iniciarTimer(); iniciarRelogio(); }, 600);
    iniciarMonitorConexao(); atualizarRelogioUI();
}

function entrarInterfaceJogoInternacional() {
    modoInternacional = true;
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('display-sala-tag').textContent = '🌍 Damas Internacionais (10x10)';
    document.getElementById('badge-espectador').classList.add('hidden');
    document.getElementById('badge-ia').classList.add('hidden');
    document.getElementById('badge-hotseat').classList.remove('hidden');

    document.getElementById('checkers-board').classList.add('internacional');
    document.getElementById('labels-top').classList.add('internacional');
    document.getElementById('labels-bottom').classList.add('internacional');
    document.getElementById('labels-left').classList.add('internacional');
    document.getElementById('labels-right').classList.add('internacional');

    renderizarTabuleiroInternacional(); renderizarNotacao();
    setTimeout(() => { iniciarTimer(); iniciarRelogio(); }, 600);
    iniciarMonitorConexao(); atualizarRelogioUI();
}

function renderizarReguas(tamanho = 8) {
    const invertido = (minhaCor === 'red');
    const colunas = tamanho === 10 ? ['a','b','c','d','e','f','g','h','i','j'] : ['a','b','c','d','e','f','g','h'];
    const linhas = tamanho === 10 ? ['10','9','8','7','6','5','4','3','2','1'] : ['8','7','6','5','4','3','2','1'];
    const topo = invertido ? linhas.slice().reverse() : linhas.slice();
    const base = invertido ? linhas.slice() : linhas.slice().reverse();
    const esquerda = invertido ? colunas.slice().reverse() : colunas.slice();
    const direita = invertido ? colunas.slice() : colunas.slice().reverse();
    const build = (arr) => arr.map((v, i) => `<div class="coord${i === 0 || i === arr.length - 1 ? ' edge' : ''}">${v}</div>`).join('');
    document.getElementById('labels-top').innerHTML = build(topo);
    document.getElementById('labels-bottom').innerHTML = build(base);
    document.getElementById('labels-left').innerHTML = build(esquerda);
    document.getElementById('labels-right').innerHTML = build(direita);
}

function renderizarTabuleiro() {
    const grid = document.getElementById('checkers-board'); if (!grid) return;
    grid.innerHTML = '';
    const invertido = (minhaCor === 'red'), corDaVez = turnoAtual;
    const capsObrig = (!jogoEncerrado && !modoEspectador && !emPausa && !iaPensando) ? capturasObrigatorias(tabuleiro, corDaVez) : [];
    const pecasObrigadas = new Set(capsObrig.map(o => `${o.r},${o.c}`));
    const temObrigatoria = pecasObrigadas.size > 0;

    for (let vr = 0; vr < 8; vr++) {
        for (let vc = 0; vc < 8; vc++) {
            const r = invertido ? (7 - vr) : vr, c = invertido ? (7 - vc) : vc;
            const square = document.createElement('div');
            const isDark = (r + c) % 2 === 1;
            square.className = `square ${isDark ? 'dark' : 'light'}`;
            if (celulaSelecionada?.r === r && celulaSelecionada?.c === c) square.classList.add('selected');
            const mov = movimentosValidos.find(m => m.r === r && m.c === c);
            if (mov) square.classList.add(mov.captura ? 'capture-target' : 'highlight');
            if (temObrigatoria && pecasObrigadas.has(`${r},${c}`) && !celulaSelecionada) square.classList.add('capture-mandatory');
            if (ultimaJogadaDestino && ultimaJogadaDestino.r === r && ultimaJogadaDestino.c === c) square.classList.add('ultimo-lance');
            const peca = tabuleiro[r]?.[c];
            if (peca) {
                const wrapper = document.createElement('div'); wrapper.className = 'piece-wrapper';
                const pieceEl = document.createElement('div');
                pieceEl.className = `piece ${peca.startsWith('white') ? 'white' : 'red'}${peca.includes('king') ? ' king' : ''}`;
                wrapper.appendChild(pieceEl); square.appendChild(wrapper);
            }
            if (isDark && !modoEspectador && !emPausa && !iaPensando) {
                square.addEventListener('click', () => clicarCasa(r, c));
            }
            grid.appendChild(square);
        }
    }
    renderizarReguas(8);
}

function renderizarTabuleiroInternacional() {
    const grid = document.getElementById('checkers-board'); if (!grid) return;
    grid.innerHTML = '';
    const invertido = (minhaCor === 'red'), corDaVez = turnoAtual;
    const capsObrig = (!jogoEncerrado && !modoEspectador && !emPausa) ? capturasObrigatoriasInt(tabuleiro, corDaVez) : [];
    const pecasObrigadas = new Set(capsObrig.map(o => `${o.r},${o.c}`));
    const temObrigatoria = pecasObrigadas.size > 0;

    for (let vr = 0; vr < 10; vr++) {
        for (let vc = 0; vc < 10; vc++) {
            const r = invertido ? (9 - vr) : vr, c = invertido ? (9 - vc) : vc;
            const square = document.createElement('div');
            const isDark = (r + c) % 2 === 1;
            square.className = `square ${isDark ? 'dark' : 'light'}`;
            if (celulaSelecionada?.r === r && celulaSelecionada?.c === c) square.classList.add('selected');
            const mov = movimentosValidos.find(m => m.r === r && m.c === c);
            if (mov) square.classList.add(mov.captura ? 'capture-target' : 'highlight');
            if (temObrigatoria && pecasObrigadas.has(`${r},${c}`) && !celulaSelecionada) square.classList.add('capture-mandatory');
            if (ultimaJogadaDestino && ultimaJogadaDestino.r === r && ultimaJogadaDestino.c === c) square.classList.add('ultimo-lance');
            const peca = tabuleiro[r]?.[c];
            if (peca) {
                const wrapper = document.createElement('div'); wrapper.className = 'piece-wrapper';
                const pieceEl = document.createElement('div');
                pieceEl.className = `piece ${peca.startsWith('white') ? 'white' : 'red'}${peca.includes('king') ? ' king' : ''}`;
                wrapper.appendChild(pieceEl); square.appendChild(wrapper);
            }
            if (isDark && !modoEspectador && !emPausa) {
                square.addEventListener('click', () => clicarCasaInternacional(r, c));
            }
            grid.appendChild(square);
        }
    }
    renderizarReguas(10);
}

function clicarCasa(r, c) {
    if (modoEspectador || emPausa || iaPensando || jogoEncerrado) return;
    const peca = tabuleiro[r][c];
    if (peca && peca.startsWith(turnoAtual)) {
        const temObrigatoria = jogadorTemCapturaObrigatoria(tabuleiro, turnoAtual);
        const movs = calcularMovimentos(tabuleiro, r, c, turnoAtual);
        if (temObrigatoria && movs.filter(m => m.captura).length === 0) {
            toast('⚡ Obrigado a capturar!', 'error'); SoundFX.error(); return;
        }
        SoundFX.select(); celulaSelecionada = { r, c }; movimentosValidos = temObrigatoria ? movs.filter(m => m.captura) : movs;
        renderizarTabuleiro(); return;
    }
    if (celulaSelecionada && movimentosValidos.some(m => m.r === r && m.c === c)) {
        executarMovimento(celulaSelecionada.r, celulaSelecionada.c, r, c);
    }
}

function clicarCasaInternacional(r, c) {
    if (modoEspectador || emPausa || jogoEncerrado) return;
    const peca = tabuleiro[r][c];
    if (peca && peca.startsWith(turnoAtual)) {
        const temObrigatoria = jogadorTemCapturaObrigatoriaInt(tabuleiro, turnoAtual);
        const movs = calcularMovimentosInt(tabuleiro, r, c, turnoAtual);
        if (temObrigatoria && movs.filter(m => m.captura).length === 0) {
            toast('⚡ Obrigado a capturar!', 'error'); SoundFX.error(); return;
        }
        SoundFX.select(); celulaSelecionada = { r, c }; movimentosValidos = temObrigatoria ? movs.filter(m => m.captura) : movs;
        renderizarTabuleiroInternacional(); return;
    }
    if (celulaSelecionada && movimentosValidos.some(m => m.r === r && m.c === c)) {
        executarMovimentoInternacional(celulaSelecionada.r, celulaSelecionada.c, r, c);
    }
}

async function executarMovimento(deR, deC, paraR, paraC) {
    const mov = movimentosValidos.find(m => m.r === paraR && m.c === paraC);
    if (!mov) return;
    const pecaMovida = tabuleiro[deR][deC], corPeca = pecaMovida.startsWith('white') ? 'white' : 'red';
    let promoveu = false;

    if (mov.caminhoCompleto && mov.caminhoCompleto.length > 0) {
        let pos = { r: deR, c: deC };
        for (const passo of mov.caminhoCompleto) {
            const pAqui = tabuleiro[pos.r][pos.c];
            tabuleiro[passo.r][passo.c] = pAqui; tabuleiro[pos.r][pos.c] = null; tabuleiro[passo.capturada.r][passo.capturada.c] = null;
            pos = { r: passo.r, c: passo.c };
            if (!pAqui.includes('king') && pAqui === 'white' && pos.r === 0) { tabuleiro[pos.r][pos.c] = 'white-king'; promoveu = true; }
            if (!pAqui.includes('king') && pAqui === 'red' && pos.r === 7) { tabuleiro[pos.r][pos.c] = 'red-king'; promoveu = true; }
        }
        SoundFX.capture(); if (promoveu) SoundFX.king();
    } else {
        tabuleiro[paraR][paraC] = pecaMovida; tabuleiro[deR][deC] = null;
        if (pecaMovida === 'white' && paraR === 0) { tabuleiro[paraR][paraC] = 'white-king'; promoveu = true; }
        if (pecaMovida === 'red' && paraR === 7) { tabuleiro[paraR][paraC] = 'red-king'; promoveu = true; }
        SoundFX.move(); if (promoveu) SoundFX.king();
    }

    ultimaJogadaDestino = { r: paraR, c: paraC };
    adicionarNotacao(corPeca, { r: deR, c: deC }, { r: paraR, c: paraC }, !!mov.captura, pecaMovida.includes('king') || promoveu, mov.caminhoCompleto);
    celulaSelecionada = null; movimentosValidos = []; renderizarTabuleiro();

    if (contarPecasDaCor(tabuleiro, corPeca === 'white' ? 'red' : 'white') === 0) {
        jogoEncerrado = true; tratarFimDeJogo(corPeca, 'sem-pecas'); return;
    }

    turnoAtual = turnoAtual === 'white' ? 'red' : 'white'; turnoInicioServidor = Date.now();
    if (modoHotSeat) { hotSeatJogadorAtual = turnoAtual; minhaCor = turnoAtual; }

    if (modoIA && turnoAtual !== minhaCor) setTimeout(() => fazerJogadaIA(), 350);
}

async function executarMovimentoInternacional(deR, deC, paraR, paraC) {
    const mov = movimentosValidos.find(m => m.r === paraR && m.c === paraC);
    if (!mov) return;
    const pecaMovida = tabuleiro[deR][deC], corPeca = pecaMovida.startsWith('white') ? 'white' : 'red';
    let promoveu = false;

    if (mov.caminhoCompleto && mov.caminhoCompleto.length > 0) {
        let pos = { r: deR, c: deC };
        for (const passo of mov.caminhoCompleto) {
            const pAqui = tabuleiro[pos.r][pos.c];
            tabuleiro[passo.r][passo.c] = pAqui; tabuleiro[pos.r][pos.c] = null; tabuleiro[passo.capturada.r][passo.capturada.c] = null;
            pos = { r: passo.r, c: passo.c };
            if (!pAqui.includes('king') && pAqui === 'white' && pos.r === 0) { tabuleiro[pos.r][pos.c] = 'white-king'; promoveu = true; }
            if (!pAqui.includes('king') && pAqui === 'red' && pos.r === 9) { tabuleiro[pos.r][pos.c] = 'red-king'; promoveu = true; }
        }
        SoundFX.capture(); if (promoveu) SoundFX.king();
    } else {
        tabuleiro[paraR][paraC] = pecaMovida; tabuleiro[deR][deC] = null;
        if (pecaMovida === 'white' && paraR === 0) { tabuleiro[paraR][paraC] = 'white-king'; promoveu = true; }
        if (pecaMovida === 'red' && paraR === 9) { tabuleiro[paraR][paraC] = 'red-king'; promoveu = true; }
        SoundFX.move(); if (promoveu) SoundFX.king();
    }

    ultimaJogadaDestino = { r: paraR, c: paraC };
    adicionarNotacao(corPeca, { r: deR, c: deC }, { r: paraR, c: paraC }, !!mov.captura, pecaMovida.includes('king') || promoveu, mov.caminhoCompleto);
    celulaSelecionada = null; movimentosValidos = []; renderizarTabuleiroInternacional();

    if (contarPecasDaCorInt(tabuleiro, corPeca === 'white' ? 'red' : 'white') === 0) {
        jogoEncerrado = true; tratarFimDeJogo(corPeca, 'sem-pecas'); return;
    }

    turnoAtual = turnoAtual === 'white' ? 'red' : 'white'; turnoInicioServidor = Date.now();
    hotSeatJogadorAtual = turnoAtual; minhaCor = turnoAtual;
}

function tratarFimDeJogo(vencedor, motivo) {
    if (desistenciaProcessada) return;
    desistenciaProcessada = true; pararTimer(); pararRelogio();
    const euVenci = vencedor === hotSeatJogadorAtual || vencedor === minhaCor;
    if (vencedor === 'empate') { SoundFX.empate(); toast('🤝 Empate!', 'info'); adicionarAoHistorico('empate', nomeOponente); }
    else if (euVenci) { SoundFX.win(); registrarVitoria(); toast('🏆 Você venceu!', 'success'); adicionarAoHistorico('vitoria', nomeOponente); }
    else { SoundFX.lose(); registrarDerrota(); toast('😢 Você perdeu.', 'error'); adicionarAoHistorico('derrota', nomeOponente); }

    setTimeout(() => {
        abrirModal({
            icon: vencedor === 'empate' ? '🤝' : (euVenci ? '🏆' : '💔'),
            title: vencedor === 'empate' ? 'Empate!' : (euVenci ? 'Vitória!' : 'Derrota'),
            message: 'Fim da partida. Deseja jogar novamente?',
            actions: [
                { label: 'Jogar Novamente', onClick: () => location.reload() },
                { label: 'Início', onClick: irParaInicio, className: 'btn-secundario' }
            ]
        });
    }, 600);
}
function registrarVitoria() { placarSessao.vitorias++; salvarPlacarLocal(); atualizarPlacarUI(); }
function registrarDerrota() { placarSessao.derrotas++; salvarPlacarLocal(); atualizarPlacarUI(); }

async function fazerJogadaIA() {
    if (!modoIA || jogoEncerrado || iaPensando || turnoAtual === minhaCor) return;
    iaPensando = true; renderizarTabuleiro();
    await new Promise(r => setTimeout(r, 400));
    const mov = IA.escolherMovimento(tabuleiro, 'red', nivelIA);
    if (!mov) { iaPensando = false; jogoEncerrado = true; tratarFimDeJogo('white', 'sem-movimentos'); return; }
    const pecaMovida = tabuleiro[mov.de.r][mov.de.c];
    let promoveu = false;
    if (mov.caminho && mov.caminho.length > 0) {
        let pos = { r: mov.de.r, c: mov.de.c };
        for (const passo of mov.caminho) {
            const pAqui = tabuleiro[pos.r][pos.c];
            tabuleiro[passo.r][passo.c] = pAqui; tabuleiro[pos.r][pos.c] = null; tabuleiro[passo.capturada.r][passo.capturada.c] = null;
            pos = { r: passo.r, c: passo.c };
            if (!pAqui.includes('king') && pAqui === 'red' && pos.r === 7) { tabuleiro[pos.r][pos.c] = 'red-king'; promoveu = true; }
        }
        SoundFX.capture();
    } else {
        tabuleiro[mov.para.r][mov.para.c] = pecaMovida; tabuleiro[mov.de.r][mov.de.c] = null;
        if (pecaMovida === 'red' && mov.para.r === 7) { tabuleiro[mov.para.r][mov.para.c] = 'red-king'; promoveu = true; }
        SoundFX.move();
    }
    ultimaJogadaDestino = { r: mov.para.r, c: mov.para.c };
    turnoAtual = 'white'; turnoInicioServidor = Date.now(); iaPensando = false; renderizarTabuleiro();
    if (contarPecasDaCor(tabuleiro, 'white') === 0) { jogoEncerrado = true; tratarFimDeJogo('red', 'sem-pecas'); return; }
    iniciarTimer(); iniciarRelogio();
}

function jogarContraIA(nivel) {
    SoundFX.click(); modoIA = true; modoHotSeat = false; modoInternacional = false; nivelIA = nivel;
    idSalaAtual = 'IA-' + Date.now().toString(36).toUpperCase(); minhaCor = 'white';
    tabuleiro = criarTabuleiroInicial(); turnoAtual = 'white'; jogoEncerrado = false;
    entrarInterfaceJogo(); toast(`🤖 ${IA.NIVEIS[nivel].nome}`, 'success');
}

function irParaInicio() {
    SoundFX.click(); limparSessao();
    setTimeout(() => { window.location.href = window.location.pathname; }, 100);
}

// Ouvintes de botões gerais
document.getElementById('btn-sair').addEventListener('click', irParaInicio);
document.getElementById('btn-desistir').addEventListener('click', () => tratarFimDeJogo(minhaCor === 'white' ? 'red' : 'white', 'desistencia'));
document.getElementById('btn-pausa').addEventListener('click', togglePausa);
document.getElementById('btn-empate').addEventListener('click', pedirEmpate);
document.getElementById('btn-som').addEventListener('click', () => {
    const ativo = SoundFX.toggle(); document.getElementById('btn-som').textContent = ativo ? '🔊' : '🔇';
});
document.getElementById('btn-musica').addEventListener('click', () => {
    const tocando = MusicaFundo.toggle(); document.getElementById('btn-musica').textContent = tocando ? '🎵' : '🔇';
});
document.getElementById('btn-a11y').addEventListener('click', () => aplicarA11y(!modoA11y));
document.getElementById('btn-alterar-apelido').addEventListener('click', () => abrirPromptApelido({ atual: apelido }));

document.querySelectorAll('#theme-selector .theme-opt').forEach(btn => {
    btn.addEventListener('click', () => {
        document.documentElement.setAttribute('data-theme', btn.dataset.theme);
        localStorage.setItem('brain_damas_tema', btn.dataset.theme);
        atualizarSeletorTema();
    });
});
function atualizarSeletorTema() {
    const atual = document.documentElement.getAttribute('data-theme') || 'dark';
    document.querySelectorAll('#theme-selector .theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === atual));
}
function atualizarSeletorSfx() {
    document.querySelectorAll('#sfx-selector .theme-opt').forEach(b => b.classList.toggle('active', b.dataset.sfx === sfxPack));
}
