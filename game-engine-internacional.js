// ============================================================
// game-engine-internacional.js — Motor Damas Internacionais (v7.6)
// Tabuleiro 10x10, peão captura para trás, dama voadora
// ============================================================

const TAM = 10;

// ---------- TABULEIRO ----------
export function criarTabuleiroInternacional() {
    const t = Array.from({ length: TAM }, () => Array(TAM).fill(null));
    // Vermelhas (topo) — 4 linhas
    for (let r = 0; r < 4; r++) for (let c = 0; c < TAM; c++) {
        if ((r + c) % 2 === 1) t[r][c] = 'red';
    }
    // Brancas (base) — 4 linhas
    for (let r = 6; r < TAM; r++) for (let c = 0; c < TAM; c++) {
        if ((r + c) % 2 === 1) t[r][c] = 'white';
    }
    return t;
}

export function tabuleiroParaFirebaseInt(t) { return t.map(row => row.slice()); }

export function firebaseParaTabuleiroInt(raw) {
    if (!raw) return criarTabuleiroInternacional();
    const t = [];
    for (let r = 0; r < TAM; r++) {
        const linhaRaw = raw[r] || raw[String(r)] || {};
        const linha = [];
        for (let c = 0; c < TAM; c++) linha.push(linhaRaw[c] ?? linhaRaw[String(c)] ?? null);
        t.push(linha);
    }
    return t;
}

export function contarPecasDaCorInt(tab, cor) {
    let n = 0;
    for (let r = 0; r < TAM; r++) for (let c = 0; c < TAM; c++) {
        const p = tab[r][c];
        if (p && p.startsWith(cor)) n++;
    }
    return n;
}

// ---------- EXPLORAÇÃO DE CAPTURAS ----------
// Regra internacional: peão captura para frente E para trás. Dama voadora.
export function explorarCapturasInt(r, c, cor, tab, capturadasSet = new Set(), profundidade = 0) {
    if (profundidade > 30) return [];
    const peca = tab[r][c]; if (!peca) return [];
    const isDama = peca.includes('king');
    const caminhos = []; const caps = [];

    if (isDama) {
        // Dama voadora: percorre diagonais, salta UMA peça adversária, pode parar em qualquer casa vazia depois
        for (const dr of [-1, +1]) for (const dc of [-1, +1]) {
            let nr = r + dr, nc = c + dc;
            // Avança até encontrar peça
            while (nr >= 0 && nr < TAM && nc >= 0 && nc < TAM && !tab[nr][nc]) { nr += dr; nc += dc; }
            if (nr < 0 || nr >= TAM || nc < 0 || nc >= TAM) continue;
            const alvo = tab[nr][nc];
            if (!alvo || alvo.startsWith(cor)) continue;
            if (capturadasSet.has(`${nr},${nc}`)) continue;
            // Casas de pouso após a capturada
            let tr = nr + dr, tc = nc + dc;
            while (tr >= 0 && tr < TAM && tc >= 0 && tc < TAM && !tab[tr][tc]) {
                caps.push({ r: tr, c: tc, capturada: { r: nr, c: nc } });
                tr += dr; tc += dc;
            }
        }
    } else {
        // Peão internacional: captura em diagonais para frente E para trás
        for (const dr of [-1, +1]) for (const dc of [-1, +1]) {
            const mr = r + dr, mc = c + dc;
            const jr = r + 2 * dr, jc = c + 2 * dc;
            if (jr < 0 || jr >= TAM || jc < 0 || jc >= TAM) continue;
            const meio = tab[mr][mc];
            if (meio && !meio.startsWith(cor) && !tab[jr][jc] && !capturadasSet.has(`${mr},${mc}`)) {
                caps.push({ r: jr, c: jc, capturada: { r: mr, c: mc } });
            }
        }
    }

    if (caps.length === 0) return [];

    for (const cap of caps) {
        const novaTab = tab.map(row => row.slice());
        const pecaAtual = novaTab[r][c];
        novaTab[cap.r][cap.c] = pecaAtual;
        novaTab[r][c] = null;
        novaTab[cap.capturada.r][cap.capturada.c] = null;

        const isPeao = !pecaAtual.includes('king');
        const corDaPeca = pecaAtual.startsWith('white') ? 'white' : 'red';
        const virouDamaAgora = (isPeao && corDaPeca === 'white' && cap.r === 0)
                            || (isPeao && corDaPeca === 'red' && cap.r === TAM - 1);

        if (virouDamaAgora) novaTab[cap.r][cap.c] = corDaPeca + '-king';

        const novasCapturadas = new Set(capturadasSet);
        novasCapturadas.add(`${cap.capturada.r},${cap.capturada.c}`);

        // Regra internacional: se promoção ocorre durante captura múltipla,
        // a peça CONTINUA a capturar como dama (ao contrário do CBD).
        const continuacoes = explorarCapturasInt(cap.r, cap.c, cor, novaTab, novasCapturadas, profundidade + 1);

        if (continuacoes.length === 0) caminhos.push([cap]);
        else for (const cont of continuacoes) caminhos.push([cap, ...cont]);
    }
    return caminhos;
}

export function todosCaminhosCapturaInt(tab, r, c, cor) {
    const caminhos = explorarCapturasInt(r, c, cor, tab);
    if (caminhos.length === 0) return { max: 0, caminhos: [] };
    const max = Math.max(...caminhos.map(c => c.length));
    return { max, caminhos: caminhos.filter(c => c.length === max) };
}

export function maxCapturasDaPecaInt(tab, r, c, cor) {
    return todosCaminhosCapturaInt(tab, r, c, cor).max;
}

export function maxCapturasGlobaisInt(tab, cor) {
    let max = 0;
    for (let r = 0; r < TAM; r++) for (let c = 0; c < TAM; c++) {
        const p = tab[r][c];
        if (p && p.startsWith(cor)) {
            const m = maxCapturasDaPecaInt(tab, r, c, cor);
            if (m > max) max = m;
        }
    }
    return max;
}

export function capturasObrigatoriasInt(tab, cor) {
    const maxGlobal = maxCapturasGlobaisInt(tab, cor);
    if (maxGlobal === 0) return [];
    const out = [];
    for (let r = 0; r < TAM; r++) for (let c = 0; c < TAM; c++) {
        const p = tab[r][c];
        if (!p || !p.startsWith(cor)) continue;
        const m = maxCapturasDaPecaInt(tab, r, c, cor);
        if (m === maxGlobal) out.push({ r, c, maxCapturas: m });
    }
    return out;
}

export function jogadorTemCapturaObrigatoriaInt(tab, cor) {
    return maxCapturasGlobaisInt(tab, cor) > 0;
}

// ---------- MOVIMENTOS VÁLIDOS ----------
export function calcularMovimentosInt(tab, r, c, corDaVez) {
    const peca = tab[r][c]; if (!peca) return [];
    const cor = peca.startsWith('white') ? 'white' : 'red';

    const obrig = capturasObrigatoriasInt(tab, cor);
    if (obrig.length > 0) {
        const estaObrig = obrig.find(o => o.r === r && o.c === c);
        if (!estaObrig) return [];
        const res = todosCaminhosCapturaInt(tab, r, c, cor);
        return res.caminhos.map(cam => {
            const destino = cam[cam.length - 1];
            return { r: destino.r, c: destino.c, captura: cam[0].capturada, caminhoCompleto: cam };
        });
    }

    const movs = [];
    const isDama = peca.includes('king');
    if (isDama) {
        for (const dr of [-1, +1]) for (const dc of [-1, +1]) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < TAM && nc >= 0 && nc < TAM && !tab[nr][nc]) {
                movs.push({ r: nr, c: nc });
                nr += dr; nc += dc;
            }
        }
    } else {
        // Peão internacional: move só para frente (1 casa)
        const dr = cor === 'white' ? -1 : +1;
        for (const dc of [-1, +1]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < TAM && nc >= 0 && nc < TAM && !tab[nr][nc]) movs.push({ r: nr, c: nc });
        }
    }
    return movs;
}

// ---------- FIM DE JOGO ----------
export function jogadorTemAlgumMovimentoInt(tab, cor) {
    const obrig = capturasObrigatoriasInt(tab, cor);
    if (obrig.length > 0) return true;

    for (let r = 0; r < TAM; r++) {
        for (let c = 0; c < TAM; c++) {
            const p = tab[r][c];
            if (!p || !p.startsWith(cor)) continue;
            const isDama = p.includes('king');
            if (isDama) {
                for (const dr of [-1, +1]) for (const dc of [-1, +1]) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < TAM && nc >= 0 && nc < TAM && !tab[nr][nc]) return true;
                }
            } else {
                const dr = cor === 'white' ? -1 : +1;
                for (const dc of [-1, +1]) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < TAM && nc >= 0 && nc < TAM && !tab[nr][nc]) return true;
                }
            }
        }
    }
    return false;
}

export function verificarFimDeJogoCompletoInt(tab, turno, contadores = {}) {
    const pecasBrancas = contarPecasDaCorInt(tab, 'white');
    const pecasPretas = contarPecasDaCorInt(tab, 'red');

    if (pecasBrancas === 0 && pecasPretas === 0) {
        return { tipo: 'empate', motivo: 'tabuleiro-vazio' };
    }
    if (pecasBrancas === 0) return { tipo: 'vitoria', vencedor: 'red', motivo: 'sem-pecas' };
    if (pecasPretas === 0) return { tipo: 'vitoria', vencedor: 'white', motivo: 'sem-pecas' };

    if (!jogadorTemAlgumMovimentoInt(tab, turno)) {
        return {
            tipo: 'vitoria',
            vencedor: turno === 'white' ? 'red' : 'white',
            motivo: 'sem-movimentos'
        };
    }

    // Regra internacional: 25 lances de dama sem captura = empate
    const lancesSemCaptura = contadores.lancesDamasSemCaptura || 0;
    if (lancesSemCaptura >= 25) {
        return { tipo: 'empate', motivo: '25-lances-dama-sem-captura' };
    }

    const repeticoes = contadores.posicoesRepetidas || {};
    const chave = JSON.stringify(tab) + '|' + turno;
    const count = (repeticoes[chave] || 0) + 1;
    if (count >= 3) {
        return { tipo: 'empate', motivo: 'posicao-repetida-3x' };
    }

    return null;
}

// ---------- APLICAR MOVIMENTO ----------
export function executarMovimentoNoJogoInt(tabuleiroAtual, movimento) {
    const novoTabuleiro = tabuleiroAtual.map(row => row.slice());

    if (movimento.caminho && movimento.caminho.length > 0) {
        const origem = movimento.de;
        const pecaOriginal = novoTabuleiro[origem.r][origem.c];
        if (!pecaOriginal) return novoTabuleiro;

        novoTabuleiro[origem.r][origem.c] = null;

        for (const passo of movimento.caminho) {
            if (passo.capturada) {
                novoTabuleiro[passo.capturada.r][passo.capturada.c] = null;
            }
        }

        const ultimoPasso = movimento.caminho[movimento.caminho.length - 1];
        let pecaFinal = pecaOriginal;
        const isPeao = !pecaOriginal.includes('king');
        const corPeca = pecaOriginal.startsWith('white') ? 'white' : 'red';
        if (isPeao && ((corPeca === 'white' && ultimoPasso.r === 0) || (corPeca === 'red' && ultimoPasso.r === TAM - 1))) {
            pecaFinal = corPeca + '-king';
        }
        novoTabuleiro[ultimoPasso.r][ultimoPasso.c] = pecaFinal;
    } else {
        const peca = novoTabuleiro[movimento.de.r][movimento.de.c];
        if (!peca) return novoTabuleiro;

        novoTabuleiro[movimento.de.r][movimento.de.c] = null;
        let pecaFinal = peca;
        const isPeao = !peca.includes('king');
        const corPeca = peca.startsWith('white') ? 'white' : 'red';
        if (isPeao && ((corPeca === 'white' && movimento.para.r === 0) || (corPeca === 'red' && movimento.para.r === TAM - 1))) {
            pecaFinal = corPeca + '-king';
        }
        novoTabuleiro[movimento.para.r][movimento.para.c] = pecaFinal;
    }
    return novoTabuleiro;
}
