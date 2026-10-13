// ============================================================
// game-engine.js — Motor de Jogo, Regras CBD e IA (v7.6)
// ============================================================

// ---------- TABULEIRO ----------
export function criarTabuleiroInicial() {
    const t = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) t[r][c] = 'red';
    for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) t[r][c] = 'white';
    return t;
}

export function tabuleiroParaFirebase(t) { return t.map(row => row.slice()); }

export function firebaseParaTabuleiro(raw) {
    if (!raw) return criarTabuleiroInicial();
    const t = [];
    for (let r = 0; r < 8; r++) {
        const linhaRaw = raw[r] || raw[String(r)] || {};
        const linha = [];
        for (let c = 0; c < 8; c++) linha.push(linhaRaw[c] ?? linhaRaw[String(c)] ?? null);
        t.push(linha);
    }
    return t;
}

export function contarPecasDaCor(tab, cor) {
    let n = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = tab[r][c];
        if (p && p.startsWith(cor)) n++;
    }
    return n;
}

// ---------- EXPLORAÇÃO DE CAPTURAS ----------
export function explorarCapturas(r, c, cor, tab, capturadasSet = new Set(), profundidade = 0) {
    if (profundidade > 20) return [];
    const peca = tab[r][c]; if (!peca) return [];
    const isDama = peca.includes('king');
    const caminhos = []; const caps = [];

    if (isDama) {
        for (const dr of [-1, +1]) for (const dc of [-1, +1]) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !tab[nr][nc]) { nr += dr; nc += dc; }
            if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
            const alvo = tab[nr][nc];
            if (!alvo || alvo.startsWith(cor)) continue;
            if (capturadasSet.has(`${nr},${nc}`)) continue;
            let tr = nr + dr, tc = nc + dc;
            while (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && !tab[tr][tc]) {
                caps.push({ r: tr, c: tc, capturada: { r: nr, c: nc } });
                tr += dr; tc += dc;
            }
        }
    } else {
        for (const dr of [-1, +1]) for (const dc of [-1, +1]) {
            const mr = r + dr, mc = c + dc;
            const jr = r + 2 * dr, jc = c + 2 * dc;
            if (jr < 0 || jr >= 8 || jc < 0 || jc >= 8) continue;
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
                            || (isPeao && corDaPeca === 'red' && cap.r === 7);

        if (virouDamaAgora) novaTab[cap.r][cap.c] = corDaPeca + '-king';

        const novasCapturadas = new Set(capturadasSet);
        novasCapturadas.add(`${cap.capturada.r},${cap.capturada.c}`);

        // Regra CBD: promoção no meio do salto interrompe a captura múltipla
        let continuacoes = [];
        if (!virouDamaAgora) {
            continuacoes = explorarCapturas(cap.r, cap.c, cor, novaTab, novasCapturadas, profundidade + 1);
        }

        if (continuacoes.length === 0) caminhos.push([cap]);
        else for (const cont of continuacoes) caminhos.push([cap, ...cont]);
    }
    return caminhos;
}

export function todosCaminhosCaptura(tab, r, c, cor) {
    const caminhos = explorarCapturas(r, c, cor, tab);
    if (caminhos.length === 0) return { max: 0, caminhos: [] };
    const max = Math.max(...caminhos.map(c => c.length));
    return { max, caminhos: caminhos.filter(c => c.length === max) };
}

export function maxCapturasDaPeca(tab, r, c, cor) {
    return todosCaminhosCaptura(tab, r, c, cor).max;
}

export function maxCapturasGlobais(tab, cor) {
    let max = 0;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = tab[r][c];
        if (p && p.startsWith(cor)) {
            const m = maxCapturasDaPeca(tab, r, c, cor);
            if (m > max) max = m;
        }
    }
    return max;
}

export function capturasObrigatorias(tab, cor) {
    const maxGlobal = maxCapturasGlobais(tab, cor);
    if (maxGlobal === 0) return [];
    const out = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = tab[r][c];
        if (!p || !p.startsWith(cor)) continue;
        const m = maxCapturasDaPeca(tab, r, c, cor);
        if (m === maxGlobal) out.push({ r, c, maxCapturas: m });
    }
    return out;
}

export function jogadorTemCapturaObrigatoria(tab, cor) {
    return maxCapturasGlobais(tab, cor) > 0;
}

// ---------- MOVIMENTOS VÁLIDOS ----------
export function calcularMovimentos(tab, r, c, corDaVez) {
    const peca = tab[r][c]; if (!peca) return [];
    const cor = peca.startsWith('white') ? 'white' : 'red';

    const obrig = capturasObrigatorias(tab, cor);
    if (obrig.length > 0) {
        const estaObrig = obrig.find(o => o.r === r && o.c === c);
        if (!estaObrig) return [];
        const res = todosCaminhosCaptura(tab, r, c, cor);
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
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !tab[nr][nc]) {
                movs.push({ r: nr, c: nc });
                nr += dr; nc += dc;
            }
        }
    } else {
        const dirs = cor === 'white' ? [-1] : [+1];
        for (const dr of dirs) for (const dc of [-1, +1]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !tab[nr][nc]) movs.push({ r: nr, c: nc });
        }
    }
    return movs;
}

// ---------- FIM DE JOGO ----------
export function jogadorTemAlgumMovimento(tab, cor) {
    const obrig = capturasObrigatorias(tab, cor);
    if (obrig.length > 0) return true;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = tab[r][c];
            if (!p || !p.startsWith(cor)) continue;
            const isDama = p.includes('king');
            if (isDama) {
                for (const dr of [-1, +1]) for (const dc of [-1, +1]) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !tab[nr][nc]) return true;
                }
            } else {
                const dr = cor === 'white' ? -1 : +1;
                for (const dc of [-1, +1]) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !tab[nr][nc]) return true;
                }
            }
        }
    }
    return false;
}

export function verificarFimDeJogoCompleto(tab, turno, contadores = {}) {
    const pecasBrancas = contarPecasDaCor(tab, 'white');
    const pecasPretas = contarPecasDaCor(tab, 'red');

    if (pecasBrancas === 0 && pecasPretas === 0) {
        return { tipo: 'empate', motivo: 'tabuleiro-vazio' };
    }
    if (pecasBrancas === 0) return { tipo: 'vitoria', vencedor: 'red', motivo: 'sem-pecas' };
    if (pecasPretas === 0) return { tipo: 'vitoria', vencedor: 'white', motivo: 'sem-pecas' };

    if (!jogadorTemAlgumMovimento(tab, turno)) {
        return {
            tipo: 'vitoria',
            vencedor: turno === 'white' ? 'red' : 'white',
            motivo: 'sem-movimentos'
        };
    }

    const lancesSemCaptura = contadores.lancesDamasSemCaptura || 0;
    if (lancesSemCaptura >= 20) {
        return { tipo: 'empate', motivo: '20-lances-dama-sem-captura' };
    }

    const repeticoes = contadores.posicoesRepetidas || {};
    const chave = JSON.stringify(tab) + '|' + turno;
    const count = (repeticoes[chave] || 0) + 1;
    if (count >= 3) {
        return { tipo: 'empate', motivo: 'posicao-repetida-3x' };
    }

    return null;
}

export function detectarFinalEspecial(tab) {
    const contar = (cor) => {
        let pedras = 0, damas = 0;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = tab[r][c];
            if (p && p.startsWith(cor)) {
                if (p.includes('king')) damas++; else pedras++;
            }
        }
        return { pedras, damas };
    };
    const b = contar('white');
    const p = contar('red');
    if (b.damas + b.pedras === 0 || p.damas + p.pedras === 0) return null;
    if (b.damas === 2 && p.damas === 2 && b.pedras === 0 && p.pedras === 0) return '2v2damas';
    if (b.damas === 2 && p.damas === 1 && b.pedras === 0 && p.pedras === 0) return '2v1dama';
    if (b.damas === 1 && p.damas === 2 && b.pedras === 0 && p.pedras === 0) return '1v2dama';
    if (b.damas === 1 && p.damas === 1 && b.pedras === 0 && p.pedras === 0) return '1v1dama';
    if (b.damas === 3 && p.damas === 1 && b.pedras === 0 && p.pedras === 0) return '3v1dama';
    if (b.damas === 1 && p.damas === 3 && b.pedras === 0 && p.pedras === 0) return '1v3dama';
    return null;
}

// ---------- APLICAR MOVIMENTO ----------
export function executarMovimentoNoJogo(tabuleiroAtual, movimento) {
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
        if (isPeao && ((corPeca === 'white' && ultimoPasso.r === 0) || (corPeca === 'red' && ultimoPasso.r === 7))) {
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
        if (isPeao && ((corPeca === 'white' && movimento.para.r === 0) || (corPeca === 'red' && movimento.para.r === 7))) {
            pecaFinal = corPeca + '-king';
        }
        novoTabuleiro[movimento.para.r][movimento.para.c] = pecaFinal;
    }
    return novoTabuleiro;
}

// ============================================================
// INTELIGÊNCIA ARTIFICIAL — Minimax com Alpha-Beta
// ============================================================
export const IA = (() => {
    const NIVEIS = {
        1: { nome: '🐣 Iniciante', profundidade: 1, aleatoriedade: 0.60, usaPosicao: false },
        2: { nome: '🐤 Fácil', profundidade: 1, aleatoriedade: 0.30, usaPosicao: true },
        3: { nome: '🦊 Médio', profundidade: 3, aleatoriedade: 0.10, usaPosicao: true },
        4: { nome: '🐺 Difícil', profundidade: 5, aleatoriedade: 0.03, usaPosicao: true },
        5: { nome: '🐉 Mestre', profundidade: 7, aleatoriedade: 0.00, usaPosicao: true }
    };

    function gerarMovimentos(tab, cor) {
        const movs = [];
        let maxCapt = 0;
        const capturasPorPeca = [];

        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = tab[r][c]; if (!p || !p.startsWith(cor)) continue;
            const caminhos = explorarCapturas(r, c, cor, tab);
            if (caminhos.length > 0) {
                const max = Math.max(...caminhos.map(x => x.length));
                if (max > maxCapt) maxCapt = max;
                capturasPorPeca.push({ r, c, caminhos, max });
            }
        }

        if (maxCapt > 0) {
            for (const cp of capturasPorPeca) {
                if (cp.max !== maxCapt) continue;
                for (const cam of cp.caminhos) {
                    if (cam.length !== maxCapt) continue;
                    const dest = cam[cam.length - 1];
                    movs.push({
                        de: { r: cp.r, c: cp.c },
                        para: { r: dest.r, c: dest.c },
                        caminho: cam,
                        captura: true
                    });
                }
            }
            return movs;
        }

        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = tab[r][c]; if (!p || !p.startsWith(cor)) continue;
            const isDama = p.includes('king');
            if (isDama) {
                for (const dr of [-1, +1]) for (const dc of [-1, +1]) {
                    let nr = r + dr, nc = c + dc;
                    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !tab[nr][nc]) {
                        movs.push({ de: { r, c }, para: { r: nr, c: nc }, captura: false });
                        nr += dr; nc += dc;
                    }
                }
            } else {
                const dirs = cor === 'white' ? [-1] : [+1];
                for (const dr of dirs) for (const dc of [-1, +1]) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !tab[nr][nc]) {
                        movs.push({ de: { r, c }, para: { r: nr, c: nc }, captura: false });
                    }
                }
            }
        }
        return movs;
    }

    // ✅ Usa o motor — zero divergência
    function aplicarMovimentoIA(tab, mov) {
        return executarMovimentoNoJogo(tab, mov);
    }

    function avaliar(tab, cor, usaPosicao) {
        const oponente = cor === 'white' ? 'red' : 'white';
        let score = 0;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = tab[r][c]; if (!p) continue;
            const isDama = p.includes('king');
            const valor = isDama ? 5 : 1;
            if (p.startsWith(cor)) {
                score += valor;
                if (usaPosicao) {
                    if (!isDama) score += (cor === 'white' ? (7 - r) : r) * 0.08;
                    if (c >= 2 && c <= 5) score += 0.05;
                }
            } else {
                score -= valor;
                if (usaPosicao) {
                    if (!isDama) score -= (oponente === 'white' ? (7 - r) : r) * 0.08;
                    if (c >= 2 && c <= 5) score -= 0.05;
                }
            }
        }
        return score;
    }

    function minimax(tab, prof, alpha, beta, corAtual, corIA, usaPosicao) {
        if (prof === 0) return avaliar(tab, corIA, usaPosicao);

        const movs = gerarMovimentos(tab, corAtual);

        // Valores terminais escalonados por profundidade
        if (movs.length === 0) {
            return corAtual === corIA ? (-10000 - prof) : (10000 + prof);
        }

        const maximizando = (corAtual === corIA);
        if (maximizando) {
            let melhor = -Infinity;
            for (const mov of movs) {
                const val = minimax(
                    aplicarMovimentoIA(tab, mov),
                    prof - 1, alpha, beta,
                    corAtual === 'white' ? 'red' : 'white',
                    corIA, usaPosicao
                );
                if (val > melhor) melhor = val;
                if (melhor > alpha) alpha = melhor;
                if (beta <= alpha) break;
            }
            return melhor;
        } else {
            let melhor = Infinity;
            for (const mov of movs) {
                const val = minimax(
                    aplicarMovimentoIA(tab, mov),
                    prof - 1, alpha, beta,
                    corAtual === 'white' ? 'red' : 'white',
                    corIA, usaPosicao
                );
                if (val < melhor) melhor = val;
                if (melhor < beta) beta = melhor;
                if (beta <= alpha) break;
            }
            return melhor;
        }
    }

    function escolherMovimento(tab, cor, nivel) {
        const cfg = NIVEIS[nivel] || NIVEIS[3];
        const movs = gerarMovimentos(tab, cor);
        if (movs.length === 0) return null;

        if (Math.random() < cfg.aleatoriedade) {
            return movs[Math.floor(Math.random() * movs.length)];
        }

        let melhorMov = movs[0];
        let melhorVal = -Infinity;
        for (const mov of movs) {
            const val = minimax(
                aplicarMovimentoIA(tab, mov),
                cfg.profundidade - 1,
                -Infinity, Infinity,
                cor === 'white' ? 'red' : 'white',
                cor, cfg.usaPosicao
            );
            if (val > melhorVal) {
                melhorVal = val;
                melhorMov = mov;
            }
        }
        return melhorMov;
    }

    return { NIVEIS, escolherMovimento };
})();
