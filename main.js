// ============================================================
// main.js — Brain Damas v7.6 (Interface Principal)
// ============================================================

import { db, auth } from "./firebase-config.js";
import { SoundFX, MusicaFundo } from "./sound.js";
import {
    criarTabuleiroInicial,
    tabuleiroParaFirebase,
    firebaseParaTabuleiro,
    contarPecasDaCor,
    calcularMovimentos,
    capturasObrigatorias,
    executarMovimentoNoJogo,
    verificarFimDeJogoCompleto,
    IA
} from "./game-engine.js";
import {
    criarTabuleiroInternacional,
    tabuleiroParaFirebaseInt,
    firebaseParaTabuleiroInt,
    contarPecasDaCorInt,
    calcularMovimentosInt,
    capturasObrigatoriasInt,
    jogadorTemCapturaObrigatoriaInt,
    executarMovimentoNoJogoInt,
    verificarFimDeJogoCompletoInt
} from "./game-engine-internacional.js";

// ---------- FIREBASE ----------
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

// ============================================================
// ESTADO GLOBAL
// ============================================================
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
let desistenciaProcessada = false;
let modoEspectador = false;
let placarSessao = { vitorias: 0, derrotas: 0 };
let nomeOponente = 'Oponente';
let ultimoChatTs = 0;

let modoTorneio = 0;
let torneioPlacar = { eu: 0, op: 0 };

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
let lancesTotais = 0;

let empatePendenteDe = null;
let emPausa = false;
let pausaPendenteDe = null;
let senhaSalaAtual = null;

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
let connectionCheckInterval = null;
let ultimaRespostaFirebase = 0;
let pedidoRevancheDe = null;
let sfxPack = 'classic';

const TEMPO_INATIVIDADE_SALA_MS = 30 * 60 * 1000;

// ============================================================
// CONQUISTAS
// ============================================================
const CONQUISTAS = [
    { id: 'primeira_vitoria', emoji: '🥇', nome: 'Primeira Vitória', desc: 'Ganhe sua primeira partida', check: (s) => s.vitorias >= 1 },
    { id: 'veterano', emoji: '🎖️', nome: 'Veterano', desc: 'Ganhe 5 partidas', check: (s) => s.vitorias >= 5 },
    { id: 'lendario', emoji: '👑', nome: 'Lendário', desc: 'Ganhe 15 partidas', check: (s) => s.vitorias >= 15 },
    { id: 'hotseat', emoji: '👥', nome: 'Hot-Seat', desc: 'Jogue em modo Hot-Seat', check: (s) => s.hotseatJogado >= 1 }
];

function carregarConquistas() {
    try {
        const raw = JSON.parse(localStorage.getItem('brain_damas_conquistas') || '{}');
        return { unlocked: raw.unlocked || {}, stats: raw.stats || { vitorias: 0, derrotas: 0, hotseatJogado: 0 } };
    } catch (_) {
        return { unlocked: {}, stats: { vitorias: 0, derrotas: 0, hotseatJogado: 0 } };
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
        novas.forEach((c, i) => setTimeout(() => toast(`🏅 ${c.emoji} ${c.nome}`, 'success'), i * 900));
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
    const resumo = document.getElementById('ach-resumo');
    if (resumo) resumo.textContent = `${Object.keys(data.unlocked).length} / ${CONQUISTAS.length} desbloqueadas`;
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function vibrar(padrao = 30) {
    if (!('vibrate' in navigator)) return;
    try { navigator.vibrate(padrao); } catch (_) {}
}

function toast(mensagem, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.textContent = mensagem;
    container.appendChild(el);
    if (tipo === 'success' || tipo === 'error') SoundFX.notify?.();
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
            SoundFX.click?.();
            document.getElementById('modal-overlay').classList.remove('active');
            acao.onClick();
        };
        container.appendChild(btn);
    });
    document.getElementById('modal-overlay').classList.add('active');
    SoundFX.notify?.();
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

function atualizarApelidoUI() {
    const nome = apelido || 'Visitante';
    const n1 = document.getElementById('lobby-nome');
    const n2 = document.getElementById('display-nome');
    if (n1) n1.textContent = nome;
    if (n2) n2.textContent = nome;
}

async function calcularOffsetServidor() {
    if (!firebaseDisponivel) { offsetServidor = 0; return; }
    try {
        const snap = await fns.get(fns.ref(db, '.info/serverTimeOffset'));
        offsetServidor = snap.val() || 0;
    } catch (_) { offsetServidor = 0; }
}
function agoraServidor() { return Date.now() + offsetServidor; }
function gerarSenha() { return Math.floor(1000 + Math.random() * 9000).toString(); }

// ============================================================
// NOTAÇÃO
// ============================================================
function casaParaNotacao(r, c) {
    return String.fromCharCode(97 + c) + ((modoInternacional ? 10 : 8) - r);
}
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
        const b = notacaoAtual[i], p = notacaoAtual[i + 1];
        html += `<span class="mov-num">${num}.</span> `;
        if (b) html += `<span class="mov-branca ${b.texto.includes('x') ? 'mov-captura' : ''}">${b.texto}</span> `;
        if (p) html += `<span class="mov-preta ${p.texto.includes('x') ? 'mov-captura' : ''}">${p.texto}</span>`;
        html += '<br>'; num++;
    }
    panel.innerHTML = html;
    panel.scrollTop = panel.scrollHeight;
}
function exportarNotacao() {
    if (notacaoAtual.length === 0) return '';
    const linhas = [];
    for (let i = 0; i < notacaoAtual.length; i += 2) {
        const b = notacaoAtual[i], p = notacaoAtual[i + 1];
        linhas.push(`${Math.floor(i / 2) + 1}. ${b ? b.texto : ''} ${p ? p.texto : ''}`.trim());
    }
    return linhas.join('\n');
}

// ============================================================
// PLACAR / HISTÓRICO
// ============================================================
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
    if (v) v.textContent = placarSessao.vitorias;
    if (d) d.textContent = placarSessao.derrotas;
    const vj = document.getElementById('placar-vitorias-jogo'), vop = document.getElementById('placar-vitorias-op');
    if (vj) vj.textContent = placarSessao.vitorias;
    if (vop) vop.textContent = placarSessao.derrotas;
}

function carregarHistorico() {
    try { historicoPartidas = JSON.parse(localStorage.getItem('brain_damas_historico') || '[]'); }
    catch (_) { historicoPartidas = []; }
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
        movimentos: historicoMovimentos.slice(),
        notacao: notacaoAtual.slice()
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
        const fmt = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        const cls = p.resultado === 'vitoria' ? 'vitoria' : (p.resultado === 'empate' ? 'empate' : 'derrota');
        const emoji = p.resultado === 'vitoria' ? '🏆' : (p.resultado === 'empate' ? '🤝' : '💔');
        const label = p.resultado === 'vitoria' ? 'Vitória' : (p.resultado === 'empate' ? 'Empate' : 'Derrota');
        return `<div class="historico-item ${cls}">
            <div class="historico-info"><strong>${emoji} ${label}</strong>
            <span class="historico-data">vs ${p.oponente} · ${fmt}</span></div>
        </div>`;
    }).join('');
}

// ============================================================
// AUTH
// ============================================================
async function garantirAutenticacao() {
    if (!firebaseDisponivel || !auth) return 'local_' + Math.random().toString(36).slice(2, 12);
    if (auth.currentUser) return auth.currentUser.uid;
    try { const cred = await fns.signInAnonymously(auth); return cred.user.uid; }
    catch (_) { return 'local_' + Math.random().toString(36).slice(2, 12); }
}

// ============================================================
// RESET DE ESTADO
// ============================================================
function resetarEstadoPartida() {
    celulaSelecionada = null;
    movimentosValidos = [];
    jogoEncerrado = false;
    desistenciaProcessada = false;
    notacaoAtual = [];
    historicoMovimentos = [];
    ultimaJogadaDestino = null;
    lancesDamasSemCaptura = 0;
    lancesFinaisEspeciais = 0;
    posicoesRepetidas = {};
    lancesTotais = 0;
    emPausa = false;
    pausaPendenteDe = null;
    empatePendenteDe = null;
    iaPensando = false;
    pedidoRevancheDe = null;
    euPronto = false; adversarioPronto = false; ambosProntos = false;
    pararTimer();
    pararRelogio();
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
(async function() {
    carregarPlacarLocal();
    carregarConquistas();
    atualizarGridConquistas();
    carregarHistorico();
    renderizarHistorico();

    apelido = localStorage.getItem('brain_damas_apelido') || '';
    if (localStorage.getItem('brain_damas_a11y') === 'on') aplicarA11y(true);
    const temaSalvo = localStorage.getItem('brain_damas_tema') || 'dark';
    document.documentElement.setAttribute('data-theme', temaSalvo);
    atualizarSeletorTema();
    sfxPack = localStorage.getItem('brain_damas_sfx') || 'classic';
    SoundFX.setPack?.(sfxPack);
    atualizarSeletorSfx();
    const tempoSalvo = localStorage.getItem('brain_damas_tempo');
    if (tempoSalvo !== null) tempoLimiteSegundos = parseInt(tempoSalvo);
    atualizarSeletorTempo();

    await calcularOffsetServidor();

    if (!apelido) setTimeout(() => abrirPromptApelido({ primeiraVez: true }), 500);
    else atualizarApelidoUI();

    await inicializarSessao();
    configurarOuvintesEventos();
})();

async function inicializarSessao() {
    const entrouPeloLink = await processarEntradaViaLink();
    if (entrouPeloLink) return;
    const uid = await garantirAutenticacao();
    jogadorSessao = { chave: uid, nome: apelido || 'Visitante' };
    document.getElementById('lobby-nome').textContent = apelido || 'Visitante';
    document.getElementById('display-nome').textContent = apelido || 'Visitante';
}

// ============================================================
// ENTRADA VIA LINK
// ============================================================
async function processarEntradaViaLink() {
    const params = new URLSearchParams(window.location.search);
    const codigoSala = params.get('sala');
    const modo = params.get('modo');
    if (!codigoSala) return false;
    if (!firebaseDisponivel) {
        abrirModal({ icon: '📡', title: 'Modo Online Indisponível', message: 'Firebase não configurado.',
            actions: [{ label: 'OK', onClick: () => {} }] });
        return false;
    }
    const querEspectador = (modo === 'assistir');
    modoEspectador = querEspectador;
    toast(querEspectador ? '👁️ A entrar…' : '⏳ A entrar…', 'info');
    const uid = await garantirAutenticacao();
    jogadorSessao = { chave: uid, nome: apelido || 'Visitante' };
    let dados = null;
    for (let i = 1; i <= 15; i++) {
        try {
            const snap = await fns.get(fns.ref(db, 'salas_damas/' + codigoSala));
            if (snap.exists()) { dados = snap.val(); break; }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 400));
    }
    if (!dados) {
        abrirModal({ icon: '🚫', title: 'Sala não encontrada', message: 'O link expirou ou a sala foi encerrada.',
            actions: [{ label: 'Voltar', onClick: () => { limparSessao(); window.location.href = window.location.pathname; } }] });
        return true;
    }
    if (dados.tempoLimite !== undefined) tempoLimiteSegundos = dados.tempoLimite;
    if (dados.melhorDe) modoTorneio = dados.melhorDe;
    if (dados.versao) versaoLocalSala = dados.versao;
    if (dados.senha && !querEspectador) {
        const jogadores = dados.jogadores || {};
        if (!jogadores[uid]) {
            const s = prompt('🔒 Sala protegida. Digite a senha:');
            if (s === dados.senha) continuarEntradaSala(uid, apelido || 'Visitante', codigoSala, dados, querEspectador);
            else { toast('Senha incorreta.', 'error'); setTimeout(() => { limparSessao(); window.location.href = window.location.pathname; }, 1000); }
            return true;
        }
    }
    continuarEntradaSala(uid, apelido || 'Visitante', codigoSala, dados, querEspectador);
    return true;
}

async function continuarEntradaSala(uid, nomeUser, codigoSala, dados, querEspectador) {
    const jogadores = dados.jogadores || {};
    if (jogadores[uid] && !querEspectador) {
        idSalaAtual = codigoSala;
        minhaCor = jogadores[uid].cor;
        tabuleiro = firebaseParaTabuleiro(dados.tabuleiro);
        turnoAtual = dados.turno || 'white';
        turnoInicioServidor = dados.turnoInicio || Date.now();
        versaoLocalSala = dados.versao || 0;
        jogoEncerrado = dados.status === 'encerrado';
        salaConfirmada = true;
        entrarInterfaceJogo();
        escutarFirebase();
        escutarChat();
        iniciarHeartbeat();
        iniciarMonitorSala();
        iniciarMonitorAdversario();
        toast('✅ Reconectado!', 'success');
        return;
    }
    if (querEspectador) {
        idSalaAtual = codigoSala;
        minhaCor = null;
        modoEspectador = true;
        tabuleiro = firebaseParaTabuleiro(dados.tabuleiro);
        turnoAtual = dados.turno || 'white';
        turnoInicioServidor = dados.turnoInicio || Date.now();
        jogoEncerrado = dados.status === 'encerrado';
        salaConfirmada = true;
        entrarInterfaceJogo();
        escutarFirebase();
        toast('👁️ Assistindo.', 'info');
        return;
    }
    if (Object.keys(jogadores).length >= 2) {
        abrirModal({ icon: '👥', title: 'Sala Cheia', message: 'Deseja assistir?',
            actions: [
                { label: '👁️ Assistir', onClick: () => { const url = new URL(window.location.href); url.searchParams.set('modo', 'assistir'); window.location.href = url.toString(); } },
                { label: 'Voltar', onClick: () => { limparSessao(); window.location.href = window.location.pathname; } }
            ] });
        return;
    }
    const coresExistentes = Object.values(jogadores).map(j => j.cor);
    const corEscolhida = coresExistentes.includes('white') ? 'red' : 'white';
    try {
        await fns.set(fns.ref(db, `salas_damas/${codigoSala}/jogadores/${uid}`), {
            nome: nomeUser, cor: corEscolhida, online: true, pronto: false, ultimoPing: Date.now()
        });
        idSalaAtual = codigoSala;
        minhaCor = corEscolhida;
        tabuleiro = firebaseParaTabuleiro(dados.tabuleiro);
        turnoAtual = dados.turno || 'white';
        turnoInicioServidor = dados.turnoInicio || Date.now();
        versaoLocalSala = dados.versao || 0;
        jogoEncerrado = false;
        salaConfirmada = true;
        entrarInterfaceJogo();
        escutarFirebase();
        escutarChat();
        iniciarHeartbeat();
        iniciarMonitorSala();
        iniciarMonitorAdversario();
        toast(`🎉 Entrou como ${minhaCor === 'white' ? '⚪ Brancas' : '🔴 Vermelhas'}!`, 'success');
    } catch (_) { toast('Erro ao entrar.', 'error'); }
}

// ============================================================
// CONFIGURAÇÃO DE EVENTOS
// ============================================================
function configurarOuvintesEventos() {
    document.querySelectorAll('#lobby-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            SoundFX.click?.();
            document.querySelectorAll('#lobby-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            ['jogo', 'historico', 'agenda', 'ranking', 'conquistas', 'config'].forEach(t => {
                document.getElementById('tab-' + t)?.classList.toggle('hidden', t !== tab);
            });
            if (tab === 'conquistas') atualizarGridConquistas();
            if (tab === 'historico') { carregarHistorico(); renderizarHistorico(); }
        });
    });

    document.getElementById('menu-btn-hotseat')?.addEventListener('click', () => {
        SoundFX.click?.();
        document.getElementById('menu-inicial').classList.add('hidden');
        document.getElementById('painel-hotseat').classList.remove('hidden');
    });
    document.getElementById('menu-btn-ia')?.addEventListener('click', () => {
        SoundFX.click?.();
        document.getElementById('menu-inicial').classList.add('hidden');
        document.getElementById('painel-ia').classList.remove('hidden');
    });
    document.getElementById('menu-btn-internacional')?.addEventListener('click', () => {
        SoundFX.click?.();
        iniciarPartidaInternacional();
    });
    document.getElementById('menu-btn-online')?.addEventListener('click', () => {
        SoundFX.click?.();
        if (!firebaseDisponivel) { toast('Firebase indisponível.', 'warn'); return; }
        document.getElementById('menu-inicial').classList.add('hidden');
        document.getElementById('painel-online').classList.remove('hidden');
    });

    document.getElementById('btn-voltar-menu-1')?.addEventListener('click', () => { SoundFX.click?.(); document.getElementById('painel-ia').classList.add('hidden'); document.getElementById('menu-inicial').classList.remove('hidden'); });
    document.getElementById('btn-voltar-menu-2')?.addEventListener('click', () => { SoundFX.click?.(); document.getElementById('painel-hotseat').classList.add('hidden'); document.getElementById('menu-inicial').classList.remove('hidden'); });
    document.getElementById('btn-voltar-menu-3')?.addEventListener('click', () => { SoundFX.click?.(); document.getElementById('painel-online').classList.add('hidden'); document.getElementById('menu-inicial').classList.remove('hidden'); });

    document.querySelectorAll('#ia-selector .tipo-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            SoundFX.click?.();
            document.querySelectorAll('#ia-selector .tipo-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            nivelIA = parseInt(btn.dataset.nivel);
        });
    });
    document.getElementById('btn-jogar-ia')?.addEventListener('click', () => jogarContraIA(nivelIA));

    document.getElementById('btn-iniciar-hotseat')?.addEventListener('click', () => {
        const n1 = (document.getElementById('hotseat-nome-1')?.value || '').trim() || 'Jogador 1';
        const n2 = (document.getElementById('hotseat-nome-2')?.value || '').trim() || 'Jogador 2';
        iniciarHotSeat(n1, n2);
    });

    document.querySelectorAll('#tempo-selector .tempo-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            tempoLimiteSegundos = parseInt(btn.dataset.tempo) || 0;
            localStorage.setItem('brain_damas_tempo', String(tempoLimiteSegundos));
            atualizarSeletorTempo();
            SoundFX.click?.();
        });
    });
    document.querySelectorAll('#clock-selector .clock-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            SoundFX.click?.();
            document.querySelectorAll('#clock-selector .clock-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const val = btn.dataset.clock;
            if (val === 'none') { modoRelogio = 'none'; }
            else {
                const [tipo, base, inc] = val.split('-');
                modoRelogio = tipo;
                tempoInicialRelogio = parseInt(base) * 1000;
                incrementoRelogio = parseInt(inc) * 1000;
            }
        });
    });

    document.getElementById('btn-criar-sala')?.addEventListener('click', () => criarSala({}));
    document.getElementById('btn-criar-sala-senha')?.addEventListener('click', () => criarSala({ comSenha: true }));
    document.getElementById('btn-criar-torneio3')?.addEventListener('click', () => criarSala({ melhorDe: 3 }));
    document.getElementById('btn-criar-torneio5')?.addEventListener('click', () => criarSala({ melhorDe: 5 }));
    document.getElementById('btn-entrar-sala')?.addEventListener('click', () => {
        const codigo = (document.getElementById('input-codigo-sala')?.value || '').trim().toUpperCase();
        if (!codigo) { toast('Digite o código.', 'warn'); return; }
        SoundFX.click?.();
        window.location.href = `${window.location.pathname}?sala=${codigo}`;
    });
    document.getElementById('btn-assistir-sala')?.addEventListener('click', () => {
        const codigo = (document.getElementById('input-codigo-sala')?.value || '').trim().toUpperCase();
        if (!codigo) { toast('Digite o código.', 'warn'); return; }
        SoundFX.click?.();
        window.location.href = `${window.location.pathname}?sala=${codigo}&modo=assistir`;
    });

    document.getElementById('btn-sair')?.addEventListener('click', () => {
        SoundFX.click?.();
        if (modoEspectador) {
            abrirModal({ icon: '👁️', title: 'Parar de assistir?', message: 'Voltar ao menu principal.',
                actions: [{ label: 'Continuar', onClick: () => {}, className: 'btn-secundario' }, { label: 'Sair', onClick: irParaInicio }] });
            return;
        }
        if (!jogoEncerrado && (modoIA || modoHotSeat || idSalaAtual)) {
            abrirModal({ icon: '⚠️', title: 'Sair da partida?', message: 'Vai perder o progresso.',
                actions: [{ label: 'Continuar', onClick: () => {}, className: 'btn-secundario' }, { label: 'Sair', onClick: irParaInicio }] });
            return;
        }
        irParaInicio();
    });

    document.getElementById('btn-desistir')?.addEventListener('click', confirmarDesistencia);
    document.getElementById('btn-pausa')?.addEventListener('click', togglePausa);
    document.getElementById('btn-empate')?.addEventListener('click', pedirEmpate);
    document.getElementById('btn-aceitar-empate')?.addEventListener('click', aceitarEmpate);
    document.getElementById('btn-recusar-empate')?.addEventListener('click', recusarEmpate);
    document.getElementById('btn-aceitar-pausa')?.addEventListener('click', aceitarPausa);
    document.getElementById('btn-recusar-pausa')?.addEventListener('click', recusarPausa);
    document.getElementById('btn-jogar-novamente')?.addEventListener('click', enviarPedidoRevanche);
    document.getElementById('btn-sair-pos-jogo')?.addEventListener('click', irParaInicio);
    document.getElementById('btn-aceitar-revanche')?.addEventListener('click', aceitarRevanche);
    document.getElementById('btn-recusar-revanche')?.addEventListener('click', recusarRevanche);

    document.getElementById('btn-som')?.addEventListener('click', () => {
        const ativo = SoundFX.toggle();
        document.getElementById('btn-som').textContent = ativo ? '🔊' : '🔇';
        localStorage.setItem('brain_damas_som', ativo ? 'on' : 'off');
    });
    document.getElementById('btn-musica')?.addEventListener('click', () => {
        const tocando = MusicaFundo.toggle();
        document.getElementById('btn-musica').textContent = tocando ? '🎵' : '🔇';
        localStorage.setItem('brain_damas_musica', tocando ? 'on' : 'off');
    });
    document.getElementById('btn-a11y')?.addEventListener('click', () => aplicarA11y(!modoA11y));
    document.getElementById('btn-alterar-apelido')?.addEventListener('click', () => abrirPromptApelido({ atual: apelido }));

    document.querySelectorAll('#theme-selector .theme-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            document.documentElement.setAttribute('data-theme', btn.dataset.theme);
            localStorage.setItem('brain_damas_tema', btn.dataset.theme);
            atualizarSeletorTema();
        });
    });
    document.querySelectorAll('#sfx-selector .theme-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            sfxPack = btn.dataset.sfx;
            SoundFX.setPack?.(sfxPack);
            localStorage.setItem('brain_damas_sfx', sfxPack);
            atualizarSeletorSfx();
        });
    });

    document.getElementById('btn-copiar-notacao')?.addEventListener('click', async () => {
        const txt = exportarNotacao();
        if (!txt) { toast('Sem lances.', 'warn'); return; }
        try { await navigator.clipboard.writeText(txt); toast('📋 Copiada!', 'success'); }
        catch (_) {}
    });

    document.getElementById('btn-fullscreen')?.addEventListener('click', alternarTelaCheia);
    document.getElementById('btn-fullscreen-game')?.addEventListener('click', alternarTelaCheia);
    document.getElementById('fs-exit')?.addEventListener('click', () => { SoundFX.click?.(); sairTelaCheia(); });

    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (modoEspectador || modoIA || modoHotSeat) return;
            enviarEmoji(btn.dataset.emoji || '👍');
        });
    });
    document.getElementById('chat-send')?.addEventListener('click', () => {
        const input = document.getElementById('chat-input');
        if (modoEspectador || modoIA || modoHotSeat) return;
        enviarTexto(input.value);
        input.value = '';
    });
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (modoEspectador || modoIA || modoHotSeat) return;
            enviarTexto(e.target.value);
            e.target.value = '';
        }
    });

    document.getElementById('btn-limpar-historico')?.addEventListener('click', () => {
        abrirModal({ icon: '🗑️', title: 'Limpar histórico?', message: 'Apaga todas as partidas gravadas.',
            actions: [
                { label: 'Cancelar', onClick: () => {}, className: 'btn-secundario' },
                { label: 'Limpar', onClick: () => {
                    historicoPartidas = [];
                    localStorage.removeItem('brain_damas_historico');
                    renderizarHistorico();
                    toast('Histórico limpo.', 'success');
                } }
            ] });
    });

    document.getElementById('replay-close')?.addEventListener('click', () => {
        document.getElementById('replay-overlay').classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('modal-overlay').classList.remove('active');
            document.getElementById('replay-overlay').classList.remove('active');
            celulaSelecionada = null;
            movimentosValidos = [];
            renderizarTabuleiroAtual();
        }
    });

    window.addEventListener('beforeunload', () => {
        try {
            if (firebaseDisponivel && idSalaAtual && jogadorSessao?.chave && !modoEspectador && !modoIA && !modoHotSeat) {
                fns.update(fns.ref(db, `salas_damas/${idSalaAtual}/jogadores/${jogadorSessao.chave}`), { online: false });
            }
        } catch (_) {}
        pararTimer();
        pararRelogio();
        pararHeartbeat();
        pararMonitorSala();
        pararMonitorAdversario();
        pararMonitorConexao();
    });
}

function atualizarSeletorTema() {
    const atual = document.documentElement.getAttribute('data-theme') || 'dark';
    document.querySelectorAll('#theme-selector .theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === atual));
}
function atualizarSeletorSfx() {
    document.querySelectorAll('#sfx-selector .theme-opt').forEach(b => b.classList.toggle('active', b.dataset.sfx === sfxPack));
}
function atualizarSeletorTempo() {
    document.querySelectorAll('#tempo-selector .tempo-opt').forEach(btn => {
        const t = parseInt(btn.dataset.tempo);
        btn.classList.toggle('active', t === tempoLimiteSegundos);
    });
}

function aplicarA11y(ativo) {
    modoA11y = ativo;
    document.documentElement.setAttribute('data-a11y', ativo ? 'on' : 'off');
    localStorage.setItem('brain_damas_a11y', ativo ? 'on' : 'off');
}

// ============================================================
// INICIAR PARTIDAS
// ============================================================
function iniciarHotSeat(n1, n2) {
    SoundFX.click?.();
    resetarEstadoPartida();
    modoHotSeat = true;
    modoIA = false;
    modoInternacional = false;
    modoEspectador = false;
    modoTorneio = 0;
    idSalaAtual = 'HS-' + Date.now().toString(36).toUpperCase();
    minhaCor = 'white';
    hotSeatNome1 = n1;
    hotSeatNome2 = n2;
    hotSeatJogadorAtual = 'white';
    tabuleiro = criarTabuleiroInicial();
    turnoAtual = 'white';
    turnoInicioServidor = Date.now();
    if (modoRelogio !== 'none') { relogioBrancas = tempoInicialRelogio; relogioPretas = tempoInicialRelogio; }
    historicoMovimentos = [{ tabuleiro: tabuleiroParaFirebase(tabuleiro), turno: 'white', cor: 'white', de: '—', para: '—' }];
    const cc = carregarConquistas();
    cc.stats.hotseatJogado = (cc.stats.hotseatJogado || 0) + 1;
    salvarConquistas(cc);
    desbloquearConquistas();
    entrarInterfaceJogo();
    toast(`👥 ${n1} vs ${n2}`, 'success');
}

function iniciarPartidaInternacional() {
    SoundFX.click?.();
    resetarEstadoPartida();
    modoInternacional = true;
    modoHotSeat = true;
    modoIA = false;
    modoEspectador = false;
    idSalaAtual = 'INT-' + Date.now().toString(36).toUpperCase();
    minhaCor = 'white';
    hotSeatNome1 = 'Jogador 1';
    hotSeatNome2 = 'Jogador 2';
    hotSeatJogadorAtual = 'white';
    tabuleiro = criarTabuleiroInternacional();
    turnoAtual = 'white';
    turnoInicioServidor = Date.now();
    historicoMovimentos = [{ tabuleiro: tabuleiroParaFirebaseInt(tabuleiro), turno: 'white', cor: 'white', de: '—', para: '—' }];
    entrarInterfaceJogo();
    toast('🌍 Damas Internacionais (100 casas)!', 'success');
}

function jogarContraIA(nivel) {
    SoundFX.click?.();
    resetarEstadoPartida();
    modoIA = true;
    modoHotSeat = false;
    modoInternacional = false;
    modoEspectador = false;
    modoTorneio = 0;
    nivelIA = nivel;
    idSalaAtual = 'IA-' + Date.now().toString(36).toUpperCase();
    minhaCor = 'white';
    nomeOponente = IA.NIVEIS[nivel].nome;
    tabuleiro = criarTabuleiroInicial();
    turnoAtual = 'white';
    turnoInicioServidor = Date.now();
    if (modoRelogio !== 'none') { relogioBrancas = tempoInicialRelogio; relogioPretas = tempoInicialRelogio; }
    historicoMovimentos = [{ tabuleiro: tabuleiroParaFirebase(tabuleiro), turno: 'white', cor: 'white', de: '—', para: '—' }];
    entrarInterfaceJogo();
    toast(`🤖 ${IA.NIVEIS[nivel].nome}`, 'success');
}

// ============================================================
// CRIAR SALA
// ============================================================
async function criarSala({ comSenha = false, melhorDe = 0 } = {}) {
    if (!firebaseDisponivel) { toast('Firebase indisponível.', 'error'); return; }
    SoundFX.click?.();
    try {
        resetarEstadoPartida();
        idSalaAtual = 'DAMAS-' + Date.now().toString(36).toUpperCase();
        minhaCor = 'white';
        modoEspectador = false;
        modoIA = false;
        modoHotSeat = false;
        modoInternacional = false;
        modoTorneio = melhorDe;
        torneioPlacar = { eu: 0, op: 0 };
        tabuleiro = criarTabuleiroInicial();
        turnoAtual = 'white';
        turnoInicioServidor = Date.now();
        versaoLocalSala = 1;
        historicoMovimentos = [{ tabuleiro: tabuleiroParaFirebase(tabuleiro), turno: 'white', cor: 'white', de: '—', para: '—' }];
        if (modoRelogio !== 'none') { relogioBrancas = tempoInicialRelogio; relogioPretas = tempoInicialRelogio; }

        const dados = {
            status: 'jogando', turno: 'white',
            tabuleiro: tabuleiroParaFirebase(tabuleiro),
            turnoInicio: fns.serverTimestamp ? fns.serverTimestamp() : Date.now(),
            turnoNumero: 1, versao: 1,
            criadaEm: fns.serverTimestamp ? fns.serverTimestamp() : Date.now(),
            ultimaAtividade: fns.serverTimestamp ? fns.serverTimestamp() : Date.now(),
            tempoLimite: tempoLimiteSegundos,
            melhorDe: melhorDe || null,
            jogadores: {
                [jogadorSessao.chave]: {
                    nome: apelido, cor: 'white', online: true, pronto: false, ultimoPing: Date.now()
                }
            }
        };
        if (comSenha) { senhaSalaAtual = gerarSenha(); dados.senha = senhaSalaAtual; }
        else senhaSalaAtual = null;

        await fns.set(fns.ref(db, 'salas_damas/' + idSalaAtual), dados);
        salaConfirmada = true;
        entrarInterfaceJogo();
        document.getElementById('div-whatsapp')?.classList.remove('hidden');
        escutarFirebase();
        escutarChat();
        iniciarHeartbeat();
        iniciarMonitorSala();
        iniciarMonitorAdversario();
        if (comSenha) toast(`🔒 Sala criada! Senha: ${senhaSalaAtual}`, 'success');
        else if (melhorDe > 0) toast(`🏆 MD${melhorDe} criado!`, 'success');
        else toast('Sala criada! Expira em 30 min.', 'success');
    } catch (e) { toast('Erro ao criar sala.', 'error'); }
}

// ============================================================
// ENTRAR INTERFACE
// ============================================================
function entrarInterfaceJogo() {
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('display-sala-tag').textContent = modoIA
        ? `🤖 ${IA.NIVEIS[nivelIA].nome}`
        : (modoHotSeat ? (modoInternacional ? '🌍 Internacional' : '👥 Hot-Seat') : `Sala: ${idSalaAtual}`);

    const badge = document.getElementById('badge-espectador');
    const badgeIA = document.getElementById('badge-ia');
    const badgeHS = document.getElementById('badge-hotseat');
    const desistirBtn = document.getElementById('btn-desistir');
    const pausaBtn = document.getElementById('btn-pausa');
    const empateBtn = document.getElementById('btn-empate');
    const recBtn = document.getElementById('btn-rec');
    const chatBar = document.getElementById('chat-bar');
    const torneioBar = document.getElementById('torneio-bar');
    const clockDisplay = document.getElementById('clock-display');

    if (modoTorneio > 0 && !modoEspectador && !modoIA && !modoHotSeat) {
        torneioBar?.classList.remove('hidden');
        document.getElementById('torneio-melhor-de').textContent = modoTorneio;
        document.getElementById('torneio-eu').textContent = torneioPlacar.eu;
        document.getElementById('torneio-op').textContent = torneioPlacar.op;
    } else torneioBar?.classList.add('hidden');

    if (modoRelogio !== 'none' && !modoEspectador) clockDisplay?.classList.remove('hidden');
    else clockDisplay?.classList.add('hidden');

    badge?.classList.add('hidden');
    badgeIA?.classList.add('hidden');
    badgeHS?.classList.add('hidden');

    if (modoEspectador) {
        badge?.classList.remove('hidden');
        desistirBtn?.classList.add('hidden');
        pausaBtn?.classList.add('hidden');
        recBtn?.classList.add('hidden');
        empateBtn?.classList.add('hidden');
        const w = document.getElementById('info-minha-cor-wrap');
        if (w) w.style.display = 'none';
        document.getElementById('display-avatar').textContent = '👁️';
        document.getElementById('display-nome').textContent = 'Espectador';
        if (chatBar) { chatBar.style.opacity = '0.5'; chatBar.style.pointerEvents = 'none'; }
    } else if (modoIA) {
        badgeIA?.classList.remove('hidden');
        const w = document.getElementById('info-minha-cor-wrap');
        if (w) w.style.display = '';
        document.getElementById('info-minha-cor').textContent = '⚪ Brancas';
        document.getElementById('display-avatar').textContent = '😀';
        document.getElementById('display-nome').textContent = apelido;
        document.getElementById('oponente-status').className = 'status-dot online';
        document.getElementById('placar-nome-op').textContent = IA.NIVEIS[nivelIA].nome;
        pausaBtn?.classList.add('hidden');
        empateBtn?.classList.remove('hidden');
        recBtn?.classList.remove('hidden');
        if (desistirBtn) desistirBtn.textContent = '🏳️ Sair';
        if (chatBar) { chatBar.style.opacity = '0.4'; chatBar.style.pointerEvents = 'none'; }
        document.getElementById('div-whatsapp')?.classList.add('hidden');
    } else if (modoHotSeat) {
        badgeHS?.classList.remove('hidden');
        const w = document.getElementById('info-minha-cor-wrap');
        if (w) w.style.display = '';
        atualizarCorHotSeat();
        document.getElementById('display-avatar').textContent = '👥';
        document.getElementById('display-nome').textContent = 'Hot-Seat';
        document.getElementById('oponente-status').className = 'status-dot online';
        pausaBtn?.classList.add('hidden');
        empateBtn?.classList.remove('hidden');
        recBtn?.classList.remove('hidden');
        if (desistirBtn) desistirBtn.textContent = '🏳️ Sair';
        if (chatBar) { chatBar.style.opacity = '0.4'; chatBar.style.pointerEvents = 'none'; }
        document.getElementById('div-whatsapp')?.classList.add('hidden');
    } else {
        const w = document.getElementById('info-minha-cor-wrap');
        if (w) w.style.display = '';
        document.getElementById('info-minha-cor').textContent = minhaCor === 'white' ? '⚪ Brancas' : '🔴 Vermelhas';
        if (desistirBtn) desistirBtn.textContent = '🏳️ Desistir';
        pausaBtn?.classList.remove('hidden');
        empateBtn?.classList.remove('hidden');
        recBtn?.classList.remove('hidden');
        if (chatBar) { chatBar.style.opacity = ''; chatBar.style.pointerEvents = ''; }
    }

    document.getElementById('checkers-board')?.classList.toggle('internacional', modoInternacional);
    document.getElementById('labels-top')?.classList.toggle('internacional', modoInternacional);
    document.getElementById('labels-bottom')?.classList.toggle('internacional', modoInternacional);
    document.getElementById('labels-left')?.classList.toggle('internacional', modoInternacional);
    document.getElementById('labels-right')?.classList.toggle('internacional', modoInternacional);

    renderizarTabuleiroAtual();
    renderizarNotacao();
    atualizarRelogioUI();
    if (!modoEspectador && idSalaAtual && !modoIA && !modoHotSeat) setTimeout(() => marcarPronto(), 400);
    if (modoIA && turnoAtual === 'white') setTimeout(() => { iniciarTimer(); iniciarRelogio(); }, 600);
    if (modoHotSeat) setTimeout(() => { iniciarTimer(); iniciarRelogio(); }, 600);
    iniciarMonitorConexao();
}

function atualizarCorHotSeat() {
    document.getElementById('info-minha-cor').textContent = hotSeatJogadorAtual === 'white'
        ? `⚪ ${hotSeatNome1}` : `🔴 ${hotSeatNome2}`;
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================
function renderizarTabuleiroAtual() {
    if (modoInternacional) renderizarTabuleiroInternacional();
    else renderizarTabuleiro();
}

function renderizarReguas(tamanho = 8) {
    const invertido = (minhaCor === 'red');
    const colunas = tamanho === 10
        ? ['a','b','c','d','e','f','g','h','i','j']
        : ['a','b','c','d','e','f','g','h'];
    const linhas = tamanho === 10
        ? ['10','9','8','7','6','5','4','3','2','1']
        : ['8','7','6','5','4','3','2','1'];
    const topo = invertido ? linhas.slice().reverse() : linhas.slice();
    const base = invertido ? linhas.slice() : linhas.slice().reverse();
    const esq = invertido ? colunas.slice().reverse() : colunas.slice();
    const dir = invertido ? colunas.slice() : colunas.slice().reverse();
    const build = (arr) => arr.map((v, i) => `<div class="coord${(i === 0 || i === arr.length - 1) ? ' edge' : ''}">${v}</div>`).join('');
    const lt = document.getElementById('labels-top');
    const lb = document.getElementById('labels-bottom');
    const ll = document.getElementById('labels-left');
    const lr = document.getElementById('labels-right');
    if (lt) lt.innerHTML = build(topo);
    if (lb) lb.innerHTML = build(base);
    if (ll) ll.innerHTML = build(esq);
    if (lr) lr.innerHTML = build(dir);
}

function renderizarTabuleiro() {
    const grid = document.getElementById('checkers-board');
    if (!grid) return;
    grid.innerHTML = '';
    const invertido = (minhaCor === 'red');
    const corDaVez = turnoAtual;
    const capsObrig = (!jogoEncerrado && !modoEspectador && !emPausa && !iaPensando &&
        (modoHotSeat || turnoAtual === minhaCor))
        ? capturasObrigatorias(tabuleiro, corDaVez) : [];
    const pecasObrigadas = new Set(capsObrig.map(o => `${o.r},${o.c}`));
    const temObrigatoria = pecasObrigadas.size > 0;

    for (let vr = 0; vr < 8; vr++) {
        for (let vc = 0; vc < 8; vc++) {
            const r = invertido ? (7 - vr) : vr;
            const c = invertido ? (7 - vc) : vc;
            const square = document.createElement('div');
            const isDark = (r + c) % 2 === 1;
            square.className = `square ${isDark ? 'dark' : 'light'}`;
            square.dataset.r = r;
            square.dataset.c = c;
            if (celulaSelecionada?.r === r && celulaSelecionada?.c === c) square.classList.add('selected');
            const mov = movimentosValidos.find(m => m.r === r && m.c === c);
            if (mov) square.classList.add(mov.captura ? 'capture-target' : 'highlight');
            if (temObrigatoria && pecasObrigadas.has(`${r},${c}`) && !celulaSelecionada) square.classList.add('capture-mandatory');
            if (ultimaJogadaDestino?.r === r && ultimaJogadaDestino?.c === c) square.classList.add('ultimo-lance');
            const peca = tabuleiro[r]?.[c];
            if (peca) {
                const wrapper = document.createElement('div');
                wrapper.className = 'piece-wrapper';
                const pieceEl = document.createElement('div');
                const corClasse = peca.startsWith('white') ? 'white' : 'red';
                const isDama = peca.includes('king') ? ' king' : '';
                pieceEl.className = `piece ${corClasse}${isDama}`;
                wrapper.appendChild(pieceEl);
                square.appendChild(wrapper);
            }
            if (isDark && !modoEspectador && !emPausa && !iaPensando &&
                (modoHotSeat || turnoAtual === minhaCor)) {
                square.addEventListener('click', () => clicarCasa(r, c));
            }
            grid.appendChild(square);
        }
    }
    renderizarReguas(8);
    atualizarBadges();
}

function renderizarTabuleiroInternacional() {
    const grid = document.getElementById('checkers-board');
    if (!grid) return;
    grid.innerHTML = '';
    const invertido = (minhaCor === 'red');
    const corDaVez = turnoAtual;
    const capsObrig = (!jogoEncerrado && !modoEspectador && !emPausa && !iaPensando &&
        (modoHotSeat || turnoAtual === minhaCor))
        ? capturasObrigatoriasInt(tabuleiro, corDaVez) : [];
    const pecasObrigadas = new Set(capsObrig.map(o => `${o.r},${o.c}`));
    const temObrigatoria = pecasObrigadas.size > 0;

    for (let vr = 0; vr < 10; vr++) {
        for (let vc = 0; vc < 10; vc++) {
            const r = invertido ? (9 - vr) : vr;
            const c = invertido ? (9 - vc) : vc;
            const square = document.createElement('div');
            const isDark = (r + c) % 2 === 1;
            square.className = `square ${isDark ? 'dark' : 'light'}`;
            square.dataset.r = r;
            square.dataset.c = c;
            if (celulaSelecionada?.r === r && celulaSelecionada?.c === c) square.classList.add('selected');
            const mov = movimentosValidos.find(m => m.r === r && m.c === c);
            if (mov) square.classList.add(mov.captura ? 'capture-target' : 'highlight');
            if (temObrigatoria && pecasObrigadas.has(`${r},${c}`) && !celulaSelecionada) square.classList.add('capture-mandatory');
            if (ultimaJogadaDestino?.r === r && ultimaJogadaDestino?.c === c) square.classList.add('ultimo-lance');
            const peca = tabuleiro[r]?.[c];
            if (peca) {
                const wrapper = document.createElement('div');
                wrapper.className = 'piece-wrapper';
                const pieceEl = document.createElement('div');
                const corClasse = peca.startsWith('white') ? 'white' : 'red';
                const isDama = peca.includes('king') ? ' king' : '';
                pieceEl.className = `piece ${corClasse}${isDama}`;
                wrapper.appendChild(pieceEl);
                square.appendChild(wrapper);
            }
            if (isDark && !modoEspectador && !emPausa && !iaPensando &&
                (modoHotSeat || turnoAtual === minhaCor)) {
                square.addEventListener('click', () => clicarCasaInternacional(r, c));
            }
            grid.appendChild(square);
        }
    }
    renderizarReguas(10);
    atualizarBadges();
}

function atualizarBadges() {
    const badgeObrig = document.getElementById('badge-obrigatoria');
    if (badgeObrig) {
        const minhaVez = modoHotSeat || turnoAtual === minhaCor;
        const corDaVez = turnoAtual;
        const temObrig = (!jogoEncerrado && !modoEspectador && minhaVez && !emPausa)
            ? (modoInternacional ? capturasObrigatoriasInt(tabuleiro, corDaVez) : capturasObrigatorias(tabuleiro, corDaVez)).length > 0
            : false;
        badgeObrig.classList.toggle('hidden', !temObrig);
    }
    document.getElementById('badge-pausa')?.classList.toggle('hidden', !emPausa);
    const turnoEl = document.getElementById('turno-status');
    if (turnoEl) {
        if (jogoEncerrado) turnoEl.textContent = '🏁 Fim';
        else if (emPausa) turnoEl.textContent = '⏸️ Em pausa';
        else if (iaPensando) turnoEl.textContent = '🤖 IA pensando…';
        else if (modoEspectador) turnoEl.textContent = turnoAtual === 'white' ? '⚪ Brancas jogam' : '🔴 Vermelhas jogam';
        else if (modoHotSeat) turnoEl.textContent = turnoAtual === 'white' ? `⚪ ${hotSeatNome1}` : `🔴 ${hotSeatNome2}`;
        else turnoEl.textContent = (turnoAtual === minhaCor ? 'Sua vez!' : 'Vez do oponente...');
    }
    document.getElementById('div-pos-jogo')?.classList.toggle('hidden', !jogoEncerrado);
}

// ============================================================
// INTERAÇÃO
// ============================================================
function clicarCasa(r, c) {
    if (modoEspectador || emPausa || iaPensando || jogoEncerrado) return;
    const minhaVez = modoHotSeat || turnoAtual === minhaCor;
    if (!minhaVez) return;
    const peca = tabuleiro[r][c];
    if (peca && peca.startsWith(turnoAtual)) {
        SoundFX.select?.();
        vibrar(20);
        celulaSelecionada = { r, c };
        movimentosValidos = calcularMovimentos(tabuleiro, r, c, turnoAtual);
        if (movimentosValidos.length === 0) {
            toast('⚡ Obrigado a capturar!', 'error');
            SoundFX.error?.();
            vibrar(80);
        }
        renderizarTabuleiro();
        return;
    }
    if (celulaSelecionada && movimentosValidos.some(m => m.r === r && m.c === c)) {
        executarMovimento(celulaSelecionada.r, celulaSelecionada.c, r, c);
        return;
    }
    SoundFX.click?.();
    celulaSelecionada = null;
    movimentosValidos = [];
    renderizarTabuleiro();
}

function clicarCasaInternacional(r, c) {
    if (modoEspectador || emPausa || iaPensando || jogoEncerrado) return;
    const minhaVez = modoHotSeat || turnoAtual === minhaCor;
    if (!minhaVez) return;
    const peca = tabuleiro[r][c];
    if (peca && peca.startsWith(turnoAtual)) {
        SoundFX.select?.();
        vibrar(20);
        celulaSelecionada = { r, c };
        movimentosValidos = calcularMovimentosInt(tabuleiro, r, c, turnoAtual);
        if (movimentosValidos.length === 0) {
            toast('⚡ Obrigado a capturar!', 'error');
            SoundFX.error?.();
            vibrar(80);
        }
        renderizarTabuleiroInternacional();
        return;
    }
    if (celulaSelecionada && movimentosValidos.some(m => m.r === r && m.c === c)) {
        executarMovimentoInternacional(celulaSelecionada.r, celulaSelecionada.c, r, c);
        return;
    }
    SoundFX.click?.();
    celulaSelecionada = null;
    movimentosValidos = [];
    renderizarTabuleiroInternacional();
}

// ============================================================
// EXECUTAR MOVIMENTO (brasileiro)
// ============================================================
async function executarMovimento(deR, deC, paraR, paraC) {
    const mov = movimentosValidos.find(m => m.r === paraR && m.c === paraC);
    if (!mov) return;

    const pecaOriginal = tabuleiro[deR][deC];
    if (!pecaOriginal) return;
    const corPeca = pecaOriginal.startsWith('white') ? 'white' : 'red';
    const isDamaOriginal = pecaOriginal.includes('king');

    const movimentoMotor = {
        de: { r: deR, c: deC },
        para: { r: paraR, c: paraC },
        caminho: mov.caminhoCompleto || null
    };
    const novoTab = executarMovimentoNoJogo(tabuleiro, movimentoMotor);
    const pecaFinal = novoTab[paraR][paraC];
    const promoveu = !isDamaOriginal && pecaFinal && pecaFinal.includes('king');

    tabuleiro = novoTab;
    ultimaJogadaDestino = { r: paraR, c: paraC };

    if (mov.captura) { SoundFX.capture?.(); vibrar(60); }
    else { SoundFX.move?.(); vibrar(20); }
    if (promoveu) SoundFX.king?.();

    historicoMovimentos.push({
        tabuleiro: tabuleiroParaFirebase(tabuleiro),
        turno: turnoAtual, cor: corPeca,
        de: `(${deR},${deC})`, para: `(${paraR},${paraC})`,
        captura: mov.captura ? `(${mov.captura.r},${mov.captura.c})` : null
    });
    adicionarNotacao(corPeca, { r: deR, c: deC }, { r: paraR, c: paraC }, !!mov.captura, isDamaOriginal || promoveu, mov.caminhoCompleto);

    lancesTotais++;
    if (mov.captura) lancesDamasSemCaptura = 0;

    celulaSelecionada = null;
    movimentosValidos = [];
    renderizarTabuleiro();

    turnoAtual = turnoAtual === 'white' ? 'red' : 'white';
    turnoInicioServidor = Date.now();
    if (modoHotSeat) {
        hotSeatJogadorAtual = turnoAtual;
        atualizarCorHotSeat();
    }
    aplicarIncremento(corPeca);

    const fim = verificarFimDeJogoCompleto(tabuleiro, turnoAtual, {
        lancesDamasSemCaptura, lancesFinaisEspeciais, posicoesRepetidas, lancesTotais
    });
    if (fim) {
        jogoEncerrado = true;
        pararTimer(); pararRelogio();
        if (fim.tipo === 'empate') tratarFimDeJogo('empate', fim.motivo || 'empate');
        else tratarFimDeJogo(fim.vencedor, fim.motivo || 'fim');
        return;
    }

    if (modoIA && turnoAtual === 'red') {
        setTimeout(() => fazerJogadaIA(), 350);
        return;
    }
    if (modoHotSeat) {
        setTimeout(() => { iniciarTimer(); iniciarRelogio(); }, 300);
        return;
    }
    if (firebaseDisponivel && idSalaAtual && !modoIA && !modoHotSeat) {
        try {
            await fns.runTransaction(fns.ref(db, `salas_damas/${idSalaAtual}`), (atual) => {
                if (!atual) return null;
                if (atual.status === 'encerrado') return;
                if (atual.turno !== corPeca) return;
                return {
                    ...atual,
                    tabuleiro: tabuleiroParaFirebase(tabuleiro),
                    turno: turnoAtual,
                    turnoInicio: Date.now(),
                    turnoNumero: (atual.turnoNumero || 1) + 1,
                    versao: (atual.versao || 0) + 1,
                    ultimaAtividade: Date.now()
                };
            });
        } catch (_) {}
    }
}

// ============================================================
// EXECUTAR MOVIMENTO (internacional)
// ============================================================
async function executarMovimentoInternacional(deR, deC, paraR, paraC) {
    const mov = movimentosValidos.find(m => m.r === paraR && m.c === paraC);
    if (!mov) return;

    const pecaOriginal = tabuleiro[deR][deC];
    if (!pecaOriginal) return;
    const corPeca = pecaOriginal.startsWith('white') ? 'white' : 'red';
    const isDamaOriginal = pecaOriginal.includes('king');

    const movimentoMotor = {
        de: { r: deR, c: deC },
        para: { r: paraR, c: paraC },
        caminho: mov.caminhoCompleto || null
    };
    const novoTab = executarMovimentoNoJogoInt(tabuleiro, movimentoMotor);
    const pecaFinal = novoTab[paraR][paraC];
    const promoveu = !isDamaOriginal && pecaFinal && pecaFinal.includes('king');

    tabuleiro = novoTab;
    ultimaJogadaDestino = { r: paraR, c: paraC };

    if (mov.captura) { SoundFX.capture?.(); vibrar(60); }
    else { SoundFX.move?.(); vibrar(20); }
    if (promoveu) SoundFX.king?.();

    historicoMovimentos.push({
        tabuleiro: tabuleiroParaFirebaseInt(tabuleiro),
        turno: turnoAtual, cor: corPeca,
        de: `(${deR},${deC})`, para: `(${paraR},${paraC})`,
        captura: mov.captura ? `(${mov.captura.r},${mov.captura.c})` : null
    });
    adicionarNotacao(corPeca, { r: deR, c: deC }, { r: paraR, c: paraC }, !!mov.captura, isDamaOriginal || promoveu, mov.caminhoCompleto);

    lancesTotais++;
    if (mov.captura) lancesDamasSemCaptura = 0;

    celulaSelecionada = null;
    movimentosValidos = [];
    renderizarTabuleiroInternacional();

    turnoAtual = turnoAtual === 'white' ? 'red' : 'white';
    turnoInicioServidor = Date.now();
    if (modoHotSeat) {
        hotSeatJogadorAtual = turnoAtual;
        atualizarCorHotSeat();
    }

    const fim = verificarFimDeJogoCompletoInt(tabuleiro, turnoAtual, {
        lancesDamasSemCaptura, lancesFinaisEspeciais, posicoesRepetidas, lancesTotais
    });
    if (fim) {
        jogoEncerrado = true;
        pararTimer(); pararRelogio();
        if (fim.tipo === 'empate') tratarFimDeJogo('empate', fim.motivo || 'empate');
        else tratarFimDeJogo(fim.vencedor, fim.motivo || 'fim');
        return;
    }
    if (modoHotSeat) setTimeout(() => { iniciarTimer(); iniciarRelogio(); }, 300);
}

// ============================================================
// IA
// ============================================================
async function fazerJogadaIA() {
    if (!modoIA || jogoEncerrado || iaPensando) return;
    if (turnoAtual === minhaCor) return;
    iaPensando = true;
    renderizarTabuleiro();
    const delay = nivelIA >= 4 ? 800 : nivelIA >= 3 ? 500 : 350;
    await new Promise(r => setTimeout(r, delay));

    const mov = IA.escolherMovimento(tabuleiro, 'red', nivelIA);
    if (!mov) {
        iaPensando = false;
        jogoEncerrado = true;
        tratarFimDeJogo('white', 'sem-movimentos');
        return;
    }

    const pecaOriginal = tabuleiro[mov.de.r][mov.de.c];
    const isDamaOriginal = pecaOriginal.includes('king');

    const movimentoMotor = {
        de: { r: mov.de.r, c: mov.de.c },
        para: { r: mov.para.r, c: mov.para.c },
        caminho: mov.caminho || null
    };
    const novoTab = executarMovimentoNoJogo(tabuleiro, movimentoMotor);
    const pecaFinal = novoTab[mov.para.r][mov.para.c];
    const promoveu = !isDamaOriginal && pecaFinal && pecaFinal.includes('king');
    tabuleiro = novoTab;
    ultimaJogadaDestino = { r: mov.para.r, c: mov.para.c };

    if (mov.captura) SoundFX.capture?.();
    else SoundFX.move?.();
    if (promoveu) SoundFX.king?.();

    historicoMovimentos.push({
        tabuleiro: tabuleiroParaFirebase(tabuleiro),
        turno: 'red', cor: 'red',
        de: `(${mov.de.r},${mov.de.c})`, para: `(${mov.para.r},${mov.para.c})`,
        captura: mov.captura ? 'sim' : null
    });
    adicionarNotacao('red', { r: mov.de.r, c: mov.de.c }, { r: mov.para.r, c: mov.para.c }, !!mov.captura, isDamaOriginal || promoveu, mov.caminho);

    lancesTotais++;
    if (mov.captura) lancesDamasSemCaptura = 0;

    turnoAtual = 'white';
    turnoInicioServidor = Date.now();
    iaPensando = false;
    renderizarTabuleiro();

    const fim = verificarFimDeJogoCompleto(tabuleiro, turnoAtual, {
        lancesDamasSemCaptura, lancesFinaisEspeciais, posicoesRepetidas, lancesTotais
    });
    if (fim) {
        jogoEncerrado = true;
        pararTimer(); pararRelogio();
        if (fim.tipo === 'empate') tratarFimDeJogo('empate', fim.motivo || 'empate');
        else tratarFimDeJogo(fim.vencedor, fim.motivo || 'fim');
        return;
    }
    iniciarTimer();
    iniciarRelogio();
}

// ============================================================
// FIM DE JOGO
// ============================================================
function tratarFimDeJogo(vencedor, motivo) {
    if (desistenciaProcessada && vencedor !== 'empate') return;
    desistenciaProcessada = true;
    pararTimer();
    pararRelogio();

    const empate = (vencedor === 'empate');
    let euVenci;
    if (modoHotSeat) euVenci = (vencedor === hotSeatJogadorAtual);
    else if (modoEspectador) euVenci = false;
    else euVenci = (vencedor === minhaCor);

    if (empate) {
        SoundFX.empate?.();
        vibrar([50, 50, 50]);
        toast('🤝 Empate!', 'info');
        if (!modoHotSeat && !modoEspectador) adicionarAoHistorico('empate', nomeOponente);
    } else if (euVenci) {
        SoundFX.win?.();
        vibrar([100, 50, 100, 50, 200]);
        placarSessao.vitorias++;
        salvarPlacarLocal();
        atualizarPlacarUI();
        toast('🏆 Você venceu!', 'success');
        if (!modoHotSeat && !modoEspectador) adicionarAoHistorico('vitoria', nomeOponente);
    } else if (!modoEspectador) {
        SoundFX.lose?.();
        vibrar(300);
        placarSessao.derrotas++;
        salvarPlacarLocal();
        atualizarPlacarUI();
        toast('😢 Você perdeu.', 'error');
        if (!modoHotSeat) adicionarAoHistorico('derrota', nomeOponente);
    }

    const cData = carregarConquistas();
    if (empate) cData.stats.empates = (cData.stats.empates || 0) + 1;
    else if (euVenci) {
        cData.stats.vitorias++;
        cData.stats.streakAtual = (cData.stats.streakAtual || 0) + 1;
        cData.stats.maiorStreak = Math.max(cData.stats.maiorStreak || 0, cData.stats.streakAtual);
    } else { cData.stats.derrotas++; cData.stats.streakAtual = 0; }
    salvarConquistas(cData);
    desbloquearConquistas();

    let motivoTxt = '';
    if (motivo === 'desistencia') motivoTxt = (euVenci ? 'O adversário desistiu.' : 'Você desistiu.');
    else if (motivo === 'timeout') motivoTxt = (euVenci ? 'O adversário deixou o tempo esgotar.' : 'Você deixou o tempo esgotar!');
    else if (motivo === 'empate') motivoTxt = 'Empate por regra oficial.';
    else if (motivo === 'sem-pecas') motivoTxt = (euVenci ? 'Capturaste TODAS as peças do adversário!' : 'Ficaste sem peças.');
    else if (motivo === 'sem-movimentos') motivoTxt = (euVenci ? 'O adversário ficou sem movimentos.' : 'Você ficou sem movimentos.');
    else motivoTxt = 'Fim da partida.';

    setTimeout(() => {
        const acoes = [];
        if (modoIA) acoes.push({ label: '🔄 Jogar Novamente', onClick: () => jogarContraIA(nivelIA) });
        else if (modoHotSeat) acoes.push({ label: '🔄 Nova Partida', onClick: () => (modoInternacional ? iniciarPartidaInternacional() : iniciarHotSeat(hotSeatNome1, hotSeatNome2)) });
        else if (!modoEspectador) acoes.push({ label: '🔄 Jogar Novamente', onClick: () => enviarPedidoRevanche() });
        acoes.push({ label: '🏠 Início', onClick: irParaInicio, className: 'btn-secundario' });

        let tituloModal = 'Fim';
        if (empate) tituloModal = 'Empate!';
        else if (euVenci) tituloModal = modoHotSeat ? `🏆 ${turnoAtual === 'white' ? hotSeatNome1 : hotSeatNome2} venceu!` : (modoIA ? 'Vitória contra a IA!' : 'Vitória!');
        else tituloModal = modoIA ? 'A IA venceu' : (motivo === 'timeout' ? 'Tempo Esgotado' : 'Derrota');

        abrirModal({
            icon: empate ? '🤝' : (euVenci ? '🏆' : (motivo === 'timeout' ? '⏱️' : '💔')),
            title: tituloModal,
            message: motivoTxt + '\n\nDeseja jogar novamente?',
            actions: acoes
        });
    }, 600);
    document.getElementById('div-pos-jogo')?.classList.remove('hidden');
}

// ============================================================
// TIMER / RELÓGIO
// ============================================================
function iniciarTimer() {
    pararTimer();
    if (tempoLimiteSegundos <= 0 || jogoEncerrado || modoEspectador || emPausa) return;
    const minhaVez = modoHotSeat || (turnoAtual === minhaCor);
    if (!minhaVez) return;

    const barWrap = document.getElementById('timer-bar-wrap');
    const display = document.getElementById('timer-display');
    barWrap?.classList.remove('hidden');
    display?.classList.remove('hidden', 'warn', 'danger');

    aviso5sDisparado = false;
    timerIntervalId = setInterval(() => {
        if (jogoEncerrado || emPausa) { pararTimer(); return; }
        if (!modoHotSeat && turnoAtual !== minhaCor) { pararTimer(); return; }
        const agora = agoraServidor();
        const decorrido = agora - turnoInicioServidor;
        timerSegundosRestantes = Math.max(0, tempoLimiteSegundos - Math.floor(decorrido / 1000));
        if (timerSegundosRestantes <= 10 && timerSegundosRestantes > 5) SoundFX.tick?.();
        if (timerSegundosRestantes === 5 && !aviso5sDisparado) {
            aviso5sDisparado = true;
            SoundFX.alert5s?.();
            toast('🔔 Faltam 5 segundos!', 'error');
            vibrar([200, 100, 200]);
        }
        if (display) {
            display.textContent = `⏱️ ${timerSegundosRestantes}s`;
            display.classList.remove('warn', 'danger');
            if (timerSegundosRestantes <= 10) display.classList.add('danger');
            else if (timerSegundosRestantes <= 20) display.classList.add('warn');
        }
        atualizarBarraTimer();
        if (timerSegundosRestantes <= 0) {
            pararTimer();
            SoundFX.timeout?.();
            perderPorTempo();
        }
    }, 500);
}
function pararTimer() {
    if (timerIntervalId) { clearInterval(timerIntervalId); timerIntervalId = null; }
    document.getElementById('timer-bar-wrap')?.classList.add('hidden');
    document.getElementById('timer-display')?.classList.add('hidden');
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

async function perderPorTempo() {
    if (jogoEncerrado || desistenciaProcessada) return;
    if (!modoHotSeat && turnoAtual !== minhaCor) return;
    const corPerdedora = modoHotSeat ? turnoAtual : minhaCor;
    const corAdversaria = corPerdedora === 'white' ? 'red' : 'white';
    if (modoIA || modoHotSeat) { jogoEncerrado = true; tratarFimDeJogo(corAdversaria, 'timeout'); return; }
    try {
        await fns.runTransaction(fns.ref(db, `salas_damas/${idSalaAtual}`), (atual) => {
            if (!atual) return null;
            if (atual.status === 'encerrado') return;
            if (atual.turno !== corPerdedora) return;
            return {
                ...atual, status: 'encerrado', vencedor: corAdversaria,
                motivoFim: 'timeout', versao: (atual.versao || 0) + 1,
                ultimaAtividade: Date.now()
            };
        });
    } catch (_) {}
}

function formatarTempo(ms) {
    const totalSeg = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeg / 60);
    const s = totalSeg % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
function iniciarRelogio() {
    pararRelogio();
    if (modoRelogio === 'none' || modoHotSeat || jogoEncerrado || modoEspectador || emPausa) return;
    if (turnoAtual !== minhaCor) return;
    const inicio = Date.now();
    relogioIntervalId = setInterval(() => {
        if (jogoEncerrado || emPausa) return;
        if (turnoAtual !== minhaCor) return;
        const decorrido = Date.now() - inicio;
        const tempoRestante = turnoAtual === 'white' ? relogioBrancas - decorrido : relogioPretas - decorrido;
        atualizarRelogioUI();
        if (tempoRestante <= 0) {
            pararRelogio();
            SoundFX.timeout?.();
            toast('⏱️ Relógio esgotado!', 'error');
            perderPorTempo();
        }
    }, 200);
}
function pararRelogio() {
    if (relogioIntervalId) { clearInterval(relogioIntervalId); relogioIntervalId = null; }
}
function atualizarRelogioUI() {
    const elW = document.getElementById('clock-white');
    const elR = document.getElementById('clock-red');
    if (!elW || !elR) return;
    const w = document.getElementById('clock-white-txt');
    const r = document.getElementById('clock-red-txt');
    if (w) w.textContent = formatarTempo(relogioBrancas);
    if (r) r.textContent = formatarTempo(relogioPretas);
    elW.classList.remove('active', 'danger');
    elR.classList.remove('active', 'danger');
    if (turnoAtual === 'white') {
        elW.classList.add('active');
        if (relogioBrancas < 30000) elW.classList.add('danger');
    } else {
        elR.classList.add('active');
        if (relogioPretas < 30000) elR.classList.add('danger');
    }
}
function aplicarIncremento(cor) {
    if (modoRelogio === 'none') return;
    if (cor === 'white') relogioBrancas += incrementoRelogio;
    else relogioPretas += incrementoRelogio;
}

// ============================================================
// HANDSHAKE / HEARTBEAT / MONITOR
// ============================================================
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
function pararHeartbeat() {
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
}

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
function pararMonitorSala() {
    if (salaCheckInterval) { clearInterval(salaCheckInterval); salaCheckInterval = null; }
}

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

function marcarFirebaseVivo() {
    ultimaRespostaFirebase = Date.now();
    document.getElementById('connection-status')?.classList.add('hidden');
}

// ============================================================
// ESCUTA FIREBASE
// ============================================================
function escutarFirebase() {
    if (!firebaseDisponivel) return;
    if (unsubscribeFirebase) unsubscribeFirebase();
    unsubscribeFirebase = fns.onValue(fns.ref(db, 'salas_damas/' + idSalaAtual), (snapshot) => {
        if (!snapshot.exists()) {
            if (idSalaAtual && salaConfirmada && !jogoEncerrado) {
                toast('⏳ Sala expirou (30 min inativa).', 'warn');
                setTimeout(() => irParaInicio(), 1500);
            }
            return;
        }
        const dados = snapshot.val();
        const turnoAnterior = turnoAtual;
        const statusAnteriorEncerrado = jogoEncerrado;
        const versaoRemota = dados.versao || 0;
        if (versaoRemota > versaoLocalSala) versaoLocalSala = versaoRemota;

        tabuleiro = firebaseParaTabuleiro(dados.tabuleiro);
        turnoAtual = dados.turno || 'white';
        turnoInicioServidor = dados.turnoInicio || Date.now();
        jogoEncerrado = dados.status === 'encerrado';
        if (dados.tempoLimite !== undefined) tempoLimiteSegundos = dados.tempoLimite;

        if (dados.melhorDe) {
            modoTorneio = dados.melhorDe;
            if (!modoEspectador) {
                document.getElementById('torneio-bar')?.classList.remove('hidden');
                document.getElementById('torneio-melhor-de').textContent = modoTorneio;
            }
        }

        const pausaAtivaRemota = !!dados.pausaAtiva;
        if (pausaAtivaRemota && !emPausa) ativarPausaLocal('acordo mútuo');
        else if (!pausaAtivaRemota && emPausa) retomarPausaLocal();

        const pedidoPausa = dados.pausaPedido;
        if (pedidoPausa && pedidoPausa.de !== jogadorSessao.chave && !modoEspectador) {
            if (pausaPendenteDe !== pedidoPausa.de) {
                pausaPendenteDe = pedidoPausa.de;
                SoundFX.notify?.();
                mostrarPedidoPausa(pedidoPausa.nome || 'Adversário');
            }
        } else if (!pedidoPausa) {
            pausaPendenteDe = null;
            document.getElementById('div-pausa-pendente')?.classList.add('hidden');
        }

        const pedidoEmpate = dados.empatePedido;
        if (pedidoEmpate && pedidoEmpate.de !== jogadorSessao.chave && !modoEspectador) {
            if (empatePendenteDe !== pedidoEmpate.de) {
                empatePendenteDe = pedidoEmpate.de;
                mostrarPedidoEmpate(pedidoEmpate.nome || 'Adversário');
            }
        } else if (!pedidoEmpate) {
            empatePendenteDe = null;
            document.getElementById('div-empate-pendente')?.classList.add('hidden');
        }

        const jogadores = dados.jogadores || {};
        const uids = Object.keys(jogadores);
        const uidOponente = uids.find(u => u !== jogadorSessao.chave);
        if (uidOponente && jogadores[uidOponente]) {
            nomeOponente = jogadores[uidOponente].nome || 'Oponente';
            document.getElementById('placar-nome-op').textContent = nomeOponente;
            document.getElementById('oponente-status').className = `status-dot ${jogadores[uidOponente].online ? 'online' : 'offline'}`;
        }
        document.getElementById('placar-nome-eu').textContent = modoEspectador ? '⚪ Brancas' : apelido;
        marcarFirebaseVivo();
        atualizarHandshake(dados, uids);

        if (jogoEncerrado && !statusAnteriorEncerrado && !desistenciaProcessada && !modoEspectador) {
            desistenciaProcessada = true;
            renderizarTabuleiroAtual();
            const motivos = ['sem-pecas', 'sem-movimentos', 'desistencia', 'timeout', 'empate'];
            const motivo = motivos.includes(dados.motivoFim) ? dados.motivoFim : 'sem-movimentos';
            if (motivo === 'empate' || dados.vencedor === 'empate') tratarFimDeJogo('empate', 'empate');
            else tratarFimDeJogo(dados.vencedor, motivo);
            return;
        }

        if (jogoEncerrado && desistenciaProcessada) {
            renderizarTabuleiroAtual();
            return;
        }

        const pedido = dados.pedidoRevanche || null;
        if (pedido && pedido.de !== jogadorSessao.chave && !modoEspectador) {
            if (pedidoRevancheDe !== pedido.de) {
                pedidoRevancheDe = pedido.de;
                SoundFX.notify?.();
                mostrarPedidoRevanche(pedido.nome || 'Oponente');
            }
        } else if (!pedido) { pedidoRevancheDe = null; esconderPedidoRevanche(); }

        if (dados.status === 'jogando' && statusAnteriorEncerrado) resetarParaNovaPartida(dados);

        if (jogadores[jogadorSessao.chave]?.cor) {
            const novaCor = jogadores[jogadorSessao.chave].cor;
            if (novaCor !== minhaCor && !modoEspectador) {
                minhaCor = novaCor;
                document.getElementById('info-minha-cor').textContent = minhaCor === 'white' ? '⚪ Brancas' : '🔴 Vermelhas';
            }
        }

        if (turnoAnterior !== turnoAtual) {
            celulaSelecionada = null;
            movimentosValidos = [];
            renderizarTabuleiroAtual();
            if (!jogoEncerrado && !modoEspectador && !emPausa) {
                if (turnoAtual === minhaCor) {
                    setTimeout(() => SoundFX.notify?.(), 150);
                    iniciarTimer();
                    iniciarRelogio();
                } else { pararTimer(); pararRelogio(); }
            }
        } else {
            renderizarTabuleiroAtual();
        }
    });
}

function resetarParaNovaPartida(dados) {
    desistenciaProcessada = false;
    pedidoRevancheDe = null;
    celulaSelecionada = null;
    movimentosValidos = [];
    jogoEncerrado = false;
    euPronto = false; adversarioPronto = false; ambosProntos = false;
    emPausa = false; pausaPendenteDe = null;
    empatePendenteDe = null;
    lancesDamasSemCaptura = 0; lancesFinaisEspeciais = 0; lancesTotais = 0;
    posicoesRepetidas = {};
    notacaoAtual = []; ultimaJogadaDestino = null;
    tabuleiro = firebaseParaTabuleiro(dados.tabuleiro);
    turnoAtual = dados.turno || 'white';
    turnoInicioServidor = dados.turnoInicio || Date.now();
    versaoLocalSala = dados.versao || 0;
    if (modoRelogio !== 'none') { relogioBrancas = tempoInicialRelogio; relogioPretas = tempoInicialRelogio; }
    const jogadores = dados.jogadores || {};
    if (jogadores[jogadorSessao.chave]?.cor) {
        minhaCor = jogadores[jogadorSessao.chave].cor;
        document.getElementById('info-minha-cor').textContent = minhaCor === 'white' ? '⚪ Brancas' : '🔴 Vermelhas';
    }
    document.getElementById('div-pos-jogo')?.classList.add('hidden');
    esconderPedidoRevanche();
    renderizarTabuleiroAtual();
    renderizarNotacao();
    atualizarRelogioUI();
    SoundFX.notify?.();
    toast('🎮 Nova partida!', 'success');
    setTimeout(() => marcarPronto(), 400);
}

// ============================================================
// CHAT
// ============================================================
function escutarChat() {
    if (!firebaseDisponivel) return;
    if (unsubscribeChat) unsubscribeChat();
    const chatRef = fns.ref(db, `salas_damas/${idSalaAtual}/chat`);
    unsubscribeChat = fns.onValue(chatRef, (snapshot) => {
        const dados = snapshot.val();
        if (!dados) return;
        const entradas = Object.entries(dados)
            .map(([k, v]) => ({ id: k, ...v }))
            .filter(m => (m.ts || 0) > ultimoChatTs)
            .sort((a, b) => (a.ts || 0) - (b.ts || 0));
        entradas.forEach(msg => {
            ultimoChatTs = Math.max(ultimoChatTs, msg.ts || 0);
            if (msg.de !== jogadorSessao.chave) {
                if (msg.texto) mostrarBalao(msg.texto, msg.nome || 'Oponente', true);
                else if (msg.emoji) mostrarBalao(msg.emoji, msg.nome || 'Oponente', false);
                SoundFX.chat?.();
            }
        });
    });
}
function enviarEmoji(emoji) {
    if (!idSalaAtual || modoIA || modoHotSeat || !firebaseDisponivel) return;
    SoundFX.click?.();
    const nome = modoEspectador ? 'Espectador' : apelido;
    const msgRef = fns.push(fns.ref(db, `salas_damas/${idSalaAtual}/chat`));
    fns.set(msgRef, { emoji, de: jogadorSessao.chave, nome, ts: Date.now() }).catch(() => {});
    mostrarBalao(emoji, modoEspectador ? '👁️ Espectador' : 'Você', false);
}
function enviarTexto(texto) {
    if (!idSalaAtual || modoIA || modoHotSeat || !firebaseDisponivel) return;
    const t = (texto || '').trim().slice(0, 120);
    if (!t) return;
    SoundFX.click?.();
    const nome = modoEspectador ? 'Espectador' : apelido;
    const msgRef = fns.push(fns.ref(db, `salas_damas/${idSalaAtual}/chat`));
    fns.set(msgRef, { texto: t, de: jogadorSessao.chave, nome, ts: Date.now() }).catch(() => {});
    mostrarBalao(t, modoEspectador ? '👁️ Espectador' : 'Você', true);
}
function mostrarBalao(conteudo, nome, isTexto) {
    const layer = document.getElementById('bubble-layer');
    if (!layer) return;
    const el = document.createElement('div');
    el.className = 'bubble';
    el.innerHTML = `<span class="bubble-nome">${nome}</span><span style="${isTexto ? 'font-size:13px; font-weight:600;' : ''}">${conteudo}</span>`;
    layer.appendChild(el);
    const bubbles = layer.querySelectorAll('.bubble');
    if (bubbles.length > 3) bubbles[0].remove();
    setTimeout(() => el.remove(), 3600);
}

// ============================================================
// PAUSA / EMPATE / REVANCHE
// ============================================================
function pedirPausa() {
    if (modoEspectador || jogoEncerrado || emPausa) return;
    if (modoIA || modoHotSeat) { toast('Pausa indisponível.', 'info'); return; }
    SoundFX.click?.();
    updateSeguro(`salas_damas/${idSalaAtual}`, {
        pausaPedido: { de: jogadorSessao.chave, nome: apelido, em: Date.now() }
    });
    toast('⏸️ Pedido enviado...', 'info');
}
function ativarPausaLocal(porQuem) {
    if (emPausa) return;
    emPausa = true;
    pararTimer(); pararRelogio();
    document.getElementById('board-wrapper-el')?.classList.add('paused');
    document.getElementById('badge-pausa')?.classList.remove('hidden');
    const btnPausa = document.getElementById('btn-pausa');
    if (btnPausa) btnPausa.textContent = '▶️ Retomar';
    SoundFX.pause?.();
    toast(`⏸️ Em pausa${porQuem ? ' por ' + porQuem : ''}.`, 'info');
}
function retomarPausaLocal() {
    if (!emPausa) return;
    emPausa = false; pausaPendenteDe = null;
    document.getElementById('board-wrapper-el')?.classList.remove('paused');
    document.getElementById('badge-pausa')?.classList.add('hidden');
    document.getElementById('div-pausa-pendente')?.classList.add('hidden');
    const btnPausa = document.getElementById('btn-pausa');
    if (btnPausa) btnPausa.textContent = '⏸️ Pausa';
    SoundFX.unpause?.();
    if (!jogoEncerrado && turnoAtual === minhaCor) setTimeout(() => { iniciarTimer(); iniciarRelogio(); }, 200);
    toast('▶️ Retomada!', 'success');
}
function mostrarPedidoPausa(nome) {
    const div = document.getElementById('div-pausa-pendente');
    if (!div) return;
    div.classList.remove('hidden');
    document.getElementById('pausa-msg').textContent = nome || 'Adversário';
}
async function aceitarPausa() {
    SoundFX.click?.();
    if (!firebaseDisponivel) return;
    try { await fns.update(fns.ref(db, `salas_damas/${idSalaAtual}`), { pausaAtiva: true, pausaPedido: null }); } catch (_) {}
    ativarPausaLocal('acordo mútuo');
    document.getElementById('div-pausa-pendente')?.classList.add('hidden');
}
async function recusarPausa() {
    SoundFX.click?.();
    if (firebaseDisponivel) { try { await fns.update(fns.ref(db, `salas_damas/${idSalaAtual}`), { pausaPedido: null }); } catch (_) {} }
    toast('Pausa recusada.', 'info');
    document.getElementById('div-pausa-pendente')?.classList.add('hidden');
}
function togglePausa() {
    if (emPausa) {
        SoundFX.click?.();
        updateSeguro(`salas_damas/${idSalaAtual}`, { pausaAtiva: null, pausaPedido: null });
        retomarPausaLocal();
    } else pedirPausa();
}

function podeOferecerEmpate() { return lancesTotais >= 10; }
function pedirEmpate() {
    if (modoEspectador || jogoEncerrado) return;
    if (!podeOferecerEmpate()) { toast('⏳ Aguarde 10 lances.', 'warn'); SoundFX.error?.(); return; }
    SoundFX.click?.();
    if (modoIA || modoHotSeat) {
        abrirModal({
            icon: '🤝', title: 'Oferecer Empate?',
            message: modoIA ? 'A IA decide.' : 'O outro jogador decide.',
            actions: [
                { label: 'Cancelar', onClick: () => {}, className: 'btn-secundario' },
                { label: '🤝 Oferecer', onClick: () => {
                    if (modoIA) {
                        const av = avaliarPosicaoSimples();
                        if (av >= 0) toast('🤖 IA recusou.', 'info');
                        else { jogoEncerrado = true; tratarFimDeJogo('empate', 'empate'); }
                    } else { jogoEncerrado = true; tratarFimDeJogo('empate', 'empate'); }
                } }
            ]
        });
        return;
    }
    updateSeguro(`salas_damas/${idSalaAtual}`, {
        empatePedido: { de: jogadorSessao.chave, nome: apelido, em: Date.now() }
    });
    toast('🤝 Oferta enviada...', 'info');
}
function avaliarPosicaoSimples() {
    let score = 0;
    const n = tabuleiro.length;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const p = tabuleiro[r][c]; if (!p) continue;
        const v = p.includes('king') ? 5 : 1;
        if (p.startsWith('red')) score += v; else score -= v;
    }
    return score;
}
function mostrarPedidoEmpate(nome) {
    const div = document.getElementById('div-empate-pendente');
    if (!div) return;
    div.classList.remove('hidden');
    document.getElementById('empate-msg').textContent = nome || 'Adversário';
    SoundFX.empate?.();
}
async function aceitarEmpate() {
    SoundFX.click?.();
    if (firebaseDisponivel) {
        try {
            await fns.runTransaction(fns.ref(db, `salas_damas/${idSalaAtual}`), (atual) => {
                if (!atual || atual.status === 'encerrado') return;
                return {
                    ...atual, status: 'encerrado', vencedor: 'empate', motivoFim: 'empate',
                    empatePedido: null, versao: (atual.versao || 0) + 1,
                    ultimaAtividade: Date.now()
                };
            });
        } catch (_) {}
    }
    document.getElementById('div-empate-pendente')?.classList.add('hidden');
}
async function recusarEmpate() {
    SoundFX.click?.();
    if (firebaseDisponivel) { try { await fns.update(fns.ref(db, `salas_damas/${idSalaAtual}`), { empatePedido: null }); } catch (_) {} }
    toast('Empate recusado.', 'info');
    document.getElementById('div-empate-pendente')?.classList.add('hidden');
}

function confirmarDesistencia() {
    if (modoEspectador) return;
    SoundFX.click?.();
    if (modoIA || modoHotSeat) {
        abrirModal({
            icon: '🏳️', title: 'Sair?', message: 'O progresso será perdido.',
            actions: [{ label: 'Cancelar', onClick: () => {}, className: 'btn-secundario' }, { label: 'Sair', onClick: irParaInicio }]
        });
        return;
    }
    abrirModal({
        icon: '🏳️', title: 'Desistir?', message: 'Se desistir, o adversário vence.',
        actions: [
            { label: 'Cancelar', onClick: () => {}, className: 'btn-secundario' },
            { label: 'Sim, desistir', onClick: async () => {
                pararTimer(); pararRelogio();
                const corAdversaria = minhaCor === 'white' ? 'red' : 'white';
                try {
                    await fns.runTransaction(fns.ref(db, `salas_damas/${idSalaAtual}`), (atual) => {
                        if (!atual || atual.status === 'encerrado') return;
                        return {
                            ...atual, status: 'encerrado', vencedor: corAdversaria,
                            motivoFim: 'desistencia', versao: (atual.versao || 0) + 1,
                            ultimaAtividade: Date.now()
                        };
                    });
                } catch (_) {}
            } }
        ]
    });
}

async function enviarPedidoRevanche() {
    SoundFX.click?.();
    if (modoIA) { jogarContraIA(nivelIA); return; }
    if (modoHotSeat) { modoInternacional ? iniciarPartidaInternacional() : iniciarHotSeat(hotSeatNome1, hotSeatNome2); return; }
    if (!firebaseDisponivel) return;
    try {
        await fns.update(fns.ref(db, `salas_damas/${idSalaAtual}`), {
            pedidoRevanche: { de: jogadorSessao.chave, nome: apelido, em: Date.now() }
        });
        toast('⏳ Pedido enviado...', 'info');
    } catch (_) {}
}
function mostrarPedidoRevanche(nome) {
    const div = document.getElementById('div-revanche-pendente');
    if (!div) return;
    div.classList.remove('hidden');
    document.getElementById('revanche-msg').textContent = `🔄 ${nome} quer jogar novamente!`;
    document.getElementById('revanche-actions').style.display = 'flex';
}
function esconderPedidoRevanche() {
    const div = document.getElementById('div-revanche-pendente');
    if (!div) return;
    div.classList.add('hidden');
    const acts = document.getElementById('revanche-actions');
    if (acts) acts.style.display = 'none';
}
async function aceitarRevanche() {
    SoundFX.click?.();
    if (!firebaseDisponivel) return;
    try {
        const jogadoresSnap = await fns.get(fns.ref(db, `salas_damas/${idSalaAtual}/jogadores`));
        const jogadores = jogadoresSnap.val() || {};
        const novasCores = {};
        Object.entries(jogadores).forEach(([uid, j]) => {
            novasCores[uid] = { ...j, cor: j.cor === 'white' ? 'red' : 'white' };
        });
        await fns.update(fns.ref(db, `salas_damas/${idSalaAtual}`), {
            status: 'jogando', turno: 'white',
            tabuleiro: tabuleiroParaFirebase(criarTabuleiroInicial()),
            turnoInicio: Date.now(), turnoNumero: 1, versao: 1,
            vencedor: null, motivoFim: null,
            pedidoRevanche: null, empatePedido: null, jogadores: novasCores,
            pausaAtiva: null, pausaPedido: null, ultimaAtividade: Date.now()
        });
        toast('🎮 Nova partida!', 'success');
    } catch (_) {}
}
async function recusarRevanche() {
    SoundFX.click?.();
    if (firebaseDisponivel) { try { await fns.update(fns.ref(db, `salas_damas/${idSalaAtual}`), { pedidoRevanche: null }); } catch (_) {} }
    toast('Recusada.', 'info');
}

async function updateSeguro(path, dados) {
    if (!firebaseDisponivel) return { ok: false };
    try { await fns.update(fns.ref(db, path), dados); return { ok: true }; }
    catch (err) { return { ok: false, err }; }
}

// ============================================================
// TELA CHEIA
// ============================================================
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement); }
async function entrarTelaCheia() {
    const el = document.documentElement;
    try {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        document.body.classList.add('is-fullscreen');
    } catch (_) { document.body.classList.add('is-fullscreen'); }
}
async function sairTelaCheia() {
    try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) {}
    document.body.classList.remove('is-fullscreen');
}
function alternarTelaCheia() {
    if (isFullscreen() || document.body.classList.contains('is-fullscreen')) sairTelaCheia();
    else entrarTelaCheia();
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
function limparSessao() {
    localStorage.removeItem('brain_damas_sessao');
    const url = new URL(window.location.href);
    url.searchParams.delete('sala'); url.searchParams.delete('modo');
    window.history.replaceState({}, '', url.pathname);
    pararMonitorConexao(); pararTimer(); pararRelogio();
    pararHeartbeat(); pararMonitorSala(); pararMonitorAdversario();
}

function irParaInicio() {
    SoundFX.click?.();
    if (firebaseDisponivel && idSalaAtual && jogadorSessao?.chave && !modoEspectador && !modoIA && !modoHotSeat) {
        fns.update(fns.ref(db, `salas_damas/${idSalaAtual}/jogadores/${jogadorSessao.chave}`), { online: false }).catch(() => {});
    }
    limparSessao();
    setTimeout(() => { window.location.href = window.location.pathname; }, 100);
}

console.log('[Brain Damas v7.6] main.js carregado');
 
