// === IA ===
const IA = (() => {
    const NIVEIS = {
        1: { nome: '🐣 Iniciante', profundidade: 1, aleatoriedade: 0.60, usaPosicao: false },
        2: { nome: '🐤 Fácil', profundidade: 1, aleatoriedade: 0.30, usaPosicao: true },
        3: { nome: '🦊 Médio', profundidade: 3, aleatoriedade: 0.10, usaPosicao: true },
        4: { nome: '🐺 Difícil', profundidade: 5, aleatoriedade: 0.03, usaPosicao: true },
        5: { nome: '🐉 Mestre', profundidade: 7, aleatoriedade: 0.00, usaPosicao: true }
    };
    function clonarTabuleiro(t) { return t.map(r => r.slice()); }
    function explorarCapturasIA(r, c, cor, tab, capturadasSet = new Set(), profundidade = 0) {
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
            novaTab[cap.r][cap.c] = pecaAtual; novaTab[r][c] = null; novaTab[cap.capturada.r][cap.capturada.c] = null;
            const isPeao = !pecaAtual.includes('king');
            const corDaPeca = pecaAtual.startsWith('white') ? 'white' : 'red';
            if ((isPeao && corDaPeca === 'white' && cap.r === 0) || (isPeao && corDaPeca === 'red' && cap.r === 7)) {
                novaTab[cap.r][cap.c] = corDaPeca + '-king';
            }
            const novasCapturadas = new Set(capturadasSet);
            novasCapturadas.add(`${cap.capturada.r},${cap.capturada.c}`);
            const continuacoes = explorarCapturasIA(cap.r, cap.c, cor, novaTab, novasCapturadas, profundidade + 1);
            if (continuacoes.length === 0) caminhos.push([cap]);
            else for (const cont of continuacoes) caminhos.push([cap, ...cont]);
        }
        return caminhos;
    }
    function gerarMovimentos(tab, cor) {
        const movs = []; let maxCapt = 0;
        const capturasPorPeca = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = tab[r][c]; if (!p || !p.startsWith(cor)) continue;
            const caminhos = explorarCapturasIA(r, c, cor, tab);
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
                    movs.push({ de: { r: cp.r, c: cp.c }, para: { r: dest.r, c: dest.c }, caminho: cam, captura: true });
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
    function aplicarMovimento(tab, mov) {
        const novo = clonarTabuleiro(tab);
        const peca = novo[mov.de.r][mov.de.c];
        if (mov.caminho && mov.caminho.length > 0) {
            let pos = { r: mov.de.r, c: mov.de.c };
            for (const passo of mov.caminho) {
                const pecaAqui = novo[pos.r][pos.c];
                novo[passo.r][passo.c] = pecaAqui; novo[pos.r][pos.c] = null; novo[passo.capturada.r][passo.capturada.c] = null;
                pos = { r: passo.r, c: passo.c };
                const isPeao = pecaAqui && !pecaAqui.includes('king');
                if (isPeao && pecaAqui === 'white' && pos.r === 0) novo[pos.r][pos.c] = 'white-king';
                if (isPeao && pecaAqui === 'red' && pos.r === 7) novo[pos.r][pos.c] = 'red-king';
            }
        } else {
            novo[mov.para.r][mov.para.c] = peca; novo[mov.de.r][mov.de.c] = null;
            if (peca === 'white' && mov.para.r === 0) novo[mov.para.r][mov.para.c] = 'white-king';
            if (peca === 'red' && mov.para.r === 7) novo[mov.para.r][mov.para.c] = 'red-king';
        }
        return novo;
    }
    function avaliar(tab, cor, usaPosicao) {
        const oponente = cor === 'white' ? 'red' : 'white';
        let score = 0;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = tab[r][c]; if (!p) continue;
            const isDama = p.includes('king'); const valor = isDama ? 5 : 1;
            if (p.startsWith(cor)) {
                score += valor;
                if (usaPosicao) { if (!isDama) score += (cor === 'white' ? (7 - r) : r) * 0.08; if (c >= 2 && c <= 5) score += 0.05; }
            } else {
                score -= valor;
                if (usaPosicao) { if (!isDama) score -= (oponente === 'white' ? (7 - r) : r) * 0.08; if (c >= 2 && c <= 5) score -= 0.05; }
            }
        }
        return score;
    }
    function minimax(tab, prof, alpha, beta, corAtual, corIA, usaPosicao) {
        if (prof === 0) return avaliar(tab, corIA, usaPosicao);
        const movs = gerarMovimentos(tab, corAtual);
        if (movs.length === 0) return corAtual === corIA ? -1000 : 1000;
        const maximizando = (corAtual === corIA);
        if (maximizando) {
            let melhor = -Infinity;
            for (const mov of movs) {
                const val = minimax(aplicarMovimento(tab, mov), prof - 1, alpha, beta, corAtual === 'white' ? 'red' : 'white', corIA, usaPosicao);
                if (val > melhor) melhor = val;
                if (melhor > alpha) alpha = melhor;
                if (beta <= alpha) break;
            }
            return melhor;
        } else {
            let melhor = Infinity;
            for (const mov of movs) {
                const val = minimax(aplicarMovimento(tab, mov), prof - 1, alpha, beta, corAtual === 'white' ? 'red' : 'white', corIA, usaPosicao);
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
        if (Math.random() < cfg.aleatoriedade) return movs[Math.floor(Math.random() * movs.length)];
        let melhorMov = movs[0]; let melhorVal = -Infinity;
        for (const mov of movs) {
            const val = minimax(aplicarMovimento(tab, mov), cfg.profundidade - 1, -Infinity, Infinity, cor === 'white' ? 'red' : 'white', cor, cfg.usaPosicao);
            if (val > melhorVal) { melhorVal = val; melhorMov = mov; }
        }
        return melhorMov;
    }
    return { NIVEIS, escolherMovimento };
})();

function jogarContraIA(nivel) {
    SoundFX.click();
    modoIA = true; modoHotSeat = false; nivelIA = nivel;
    modoEspectador = false; modoTorneio = 0;
    idSalaAtual = 'IA-' + Date.now().toString(36).toUpperCase();
    minhaCor = 'white';
    tabuleiro = criarTabuleiroInicial();
    turnoAtual = 'white'; turnoInicioServidor = Date.now();
    jogoEncerrado = false; vencedorDeclarado = null; desistenciaProcessada = false;
    lancesDamasSemCaptura = 0; lancesFinaisEspeciais = 0; lancesTotais = 0;
    posicoesRepetidas = {}; tipoFinalEspecial = null;
    celulaSelecionada = null; movimentosValidos = [];
    emPausa = false; iaPensando = false; notacaoAtual = [];
    nomeOponente = IA.NIVEIS[nivel].nome; ultimaJogadaDestino = null;
    if (modoRelogio !== 'none') { relogioBrancas = tempoInicialRelogio; relogioPretas = tempoInicialRelogio; }
    historicoMovimentos = [{ tabuleiro: tabuleiroParaFirebase(tabuleiro), turno: 'white', cor: 'white', de: '—', para: '—' }];
    salaConfirmada = true;
    entrarInterfaceJogo();
    toast(`🤖 ${IA.NIVEIS[nivel].nome}`, 'success');
}

async function fazerJogadaIA() {
    if (!modoIA || jogoEncerrado || iaPensando) return;
    if (turnoAtual === minhaCor) return;
    iaPensando = true;
    renderizarTabuleiro();
    const delay = nivelIA >= 4 ? 800 : nivelIA >= 3 ? 500 : 350;
    await new Promise(r => setTimeout(r, delay));
    const mov = IA.escolherMovimento(tabuleiro, 'red', nivelIA);
    if (!mov) {
        iaPensando = false; jogoEncerrado = true;
        tratarFimDeJogo('white', 'sem-movimentos');
        return;
    }
    const pecaMovida = tabuleiro[mov.de.r][mov.de.c];
    const isDamaMovida = pecaMovida.includes('king');
    let promoveuIA = false;
    if (mov.caminho && mov.caminho.length > 0) {
        let pos = { r: mov.de.r, c: mov.de.c };
        for (const passo of mov.caminho) {
            const pecaAqui = tabuleiro[pos.r][pos.c];
            tabuleiro[passo.r][passo.c] = pecaAqui; tabuleiro[pos.r][pos.c] = null; tabuleiro[passo.capturada.r][passo.capturada.c] = null;
            pos = { r: passo.r, c: passo.c };
            const isPeao = pecaAqui && !pecaAqui.includes('king');
            if (isPeao && pecaAqui === 'red' && pos.r === 7) { tabuleiro[pos.r][pos.c] = 'red-king'; promoveuIA = true; }
        }
        SoundFX.capture();
        if (promoveuIA) SoundFX.king();
    } else {
        tabuleiro[mov.para.r][mov.para.c] = pecaMovida; tabuleiro[mov.de.r][mov.de.c] = null;
        if (pecaMovida === 'red' && mov.para.r === 7) { tabuleiro[mov.para.r][mov.para.c] = 'red-king'; promoveuIA = true; }
        SoundFX.move();
        if (promoveuIA) SoundFX.king();
    }
    ultimaJogadaDestino = { r: mov.para.r, c: mov.para.c };
    historicoMovimentos.push({
        tabuleiro: tabuleiroParaFirebase(tabuleiro), turno: 'red', cor: 'red',
        de: `(${mov.de.r},${mov.de.c})`, para: `(${mov.para.r},${mov.para.c})`,
        captura: mov.captura ? 'sim' : null
    });
    adicionarNotacao('red', { r: mov.de.r, c: mov.de.c }, { r: mov.para.r, c: mov.para.c }, !!mov.captura, isDamaMovida || promoveuIA, mov.caminho);
    atualizarContadoresAposLance({ capturada: mov.captura, pecaOriginal: pecaMovida });
    turnoAtual = 'white';
    turnoInicioServidor = Date.now();
    iaPensando = false;
    renderizarTabuleiro();

    // ⚡ v7.2: PRIMEIRO verifica se IA capturou TUDO (humano ficou sem peças)
    const pecasHumano = contarPecasDaCor('white');
    if (pecasHumano === 0) {
        console.log('[v7.2 IA] IA capturou tudo. Vencedor: red');
        jogoEncerrado = true;
        tratarFimDeJogo('red', 'sem-pecas');
        return;
    }
    // Verifica se IA ficou sem peças (não deveria acontecer, mas proteção)
    const pecasIA = contarPecasDaCor('red');
    if (pecasIA === 0) {
        console.log('[v7.2 IA] Humano capturou tudo. Vencedor: white');
        jogoEncerrado = true;
        tratarFimDeJogo('white', 'sem-pecas');
        return;
    }

    // Empate
    const resEmpate = verificarEmpate();
    if (resEmpate.empate) {
        jogoEncerrado = true;
        toast(`🤝 Empate! (${resEmpate.motivo})`, 'info');
        tratarFimDeJogo('empate', 'empate');
        return;
    }

    // Imobilização
    const vencedorImob = verificarImobilizacao();
    if (vencedorImob) {
        jogoEncerrado = true;
        tratarFimDeJogo(vencedorImob, 'sem-movimentos');
        return;
    }

    iniciarTimer(); iniciarRelogio();
}
