from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional, List, Tuple

import streamlit as st


# ============================================================
# CONSTANTES E TIPOS
# ============================================================

TAMANHO_TABULEIRO = 8
LINHAS_INICIAIS_BRANCAS = range(0, 3)
LINHAS_INICIAIS_VERMELHAS = range(5, 8)


class Peca(IntEnum):
    """Representação numérica das peças no tabuleiro."""
    VAZIO = 0
    VERMELHA = 1
    BRANCA = 2
    DAMA_VERMELHA = 3
    DAMA_BRANCA = 4


class Jogador(IntEnum):
    VERMELHO = 1
    BRANCO = 2


# Conjuntos auxiliares para validações rápidas
PECAS_DO_JOGADOR = {
    Jogador.VERMELHO: {Peca.VERMELHA, Peca.DAMA_VERMELHA},
    Jogador.BRANCO: {Peca.BRANCA, Peca.DAMA_BRANCA},
}

DAMAS = {Peca.DAMA_VERMELHA, Peca.DAMA_BRANCA}
PECAS_COMUNS = {Peca.VERMELHA, Peca.BRANCA}

# Símbolos exibidos na interface
SIMBOLOS = {
    Peca.VERMELHA: "🔴",
    Peca.BRANCA: "⚪",
    Peca.DAMA_VERMELHA: "🔴👑",
    Peca.DAMA_BRANCA: "⚪👑",
    Peca.VAZIO: "",
}

DIRECAO_FRENTE = {
    Peca.VERMELHA: -1,
    Peca.BRANCA: +1,
}


# ============================================================
# ESTRUTURAS DE DADOS
# ============================================================

Posicao = tuple[int, int]


@dataclass
class EstadoJogo:
    """Encapsula todo o estado mutável do jogo."""
    tabuleiro: list[list[int]] = field(default_factory=list)
    turno: Jogador = Jogador.VERMELHO
    selecionada: Optional[Posicao] = None
    vencedor: Optional[Jogador] = None
    historico: list[str] = field(default_factory=list)
    capturadas_vermelho: int = 0
    capturadas_branco: int = 0


# ============================================================
# REGRAS DO JOGO (camada pura, sem dependência do Streamlit)
# ============================================================

class RegrasDamas:
    """Implementa as regras brasileiras de movimentação e captura."""

    @staticmethod
    def criar_tabuleiro_inicial() -> list[list[int]]:
        """Cria o tabuleiro com a disposição inicial padrão."""
        tabuleiro = [
            [Peca.VAZIO for _ in range(TAMANHO_TABULEIRO)]
            for _ in range(TAMANHO_TABULEIRO)
        ]

        for linha in LINHAS_INICIAIS_BRANCAS:
            for coluna in range(TAMANHO_TABULEIRO):
                if RegrasDamas._casa_jogavel(linha, coluna):
                    tabuleiro[linha][coluna] = Peca.BRANCA

        for linha in LINHAS_INICIAIS_VERMELHAS:
            for coluna in range(TAMANHO_TABULEIRO):
                if RegrasDamas._casa_jogavel(linha, coluna):
                    tabuleiro[linha][coluna] = Peca.VERMELHA

        return tabuleiro

    @staticmethod
    def _casa_jogavel(linha: int, coluna: int) -> bool:
        """Casas escuras do tabuleiro (onde as peças se movem)."""
        return (linha + coluna) % 2 == 1

    @staticmethod
    def casa_jogavel(linha: int, coluna: int) -> bool:
        return RegrasDamas._casa_jogavel(linha, coluna)

    @staticmethod
    def dentro_do_tabuleiro(linha: int, coluna: int) -> bool:
        return 0 <= linha < TAMANHO_TABULEIRO and 0 <= coluna < TAMANHO_TABULEIRO

    @staticmethod
    def pertence_ao_jogador(peca: int, jogador: Jogador) -> bool:
        return peca in PECAS_DO_JOGADOR[jogador]

    @staticmethod
    def validar_movimento(
        tabuleiro: list[list[int]],
        origem: Posicao,
        destino: Posicao,
        jogador: Jogador,
    ) -> tuple[bool, Optional[Posicao]]:
        """
        Valida o movimento de `origem` para `destino`.

        Retorna:
            (movimento_valido, posicao_peca_capturada)
        """
        sr, sc = origem
        dr, dc = destino
        peca_origem = tabuleiro[sr][sc]

        if not RegrasDamas.dentro_do_tabuleiro(dr, dc):
            return False, None
        if tabuleiro[dr][dc] != Peca.VAZIO:
            return False, None
        if not RegrasDamas.pertence_ao_jogador(peca_origem, jogador):
            return False, None
        if abs(dr - sr) != abs(dc - sc):
            return False, None  # precisa ser diagonal

        if peca_origem in PECAS_COMUNS:
            return RegrasDamas._validar_movimento_peca_comum(
                tabuleiro, origem, destino, jogador, peca_origem
            )
        if peca_origem in DAMAS:
            return RegrasDamas._validar_movimento_dama(
                tabuleiro, origem, destino, jogador
            )
        return False, None

    @staticmethod
    def _validar_movimento_peca_comum(
        tabuleiro: list[list[int]],
        origem: Posicao,
        destino: Posicao,
        jogador: Jogador,
        peca_origem: int,
    ) -> tuple[bool, Optional[Posicao]]:
        sr, sc = origem
        dr, dc = destino
        delta_linha = dr - sr

        # Movimento simples (1 casa, apenas para frente)
        if abs(delta_linha) == 1 and abs(dc - sc) == 1:
            if delta_linha == DIRECAO_FRENTE[peca_origem]:
                return True, None
            return False, None

        # Captura (2 casas na diagonal, frente ou trás)
        if abs(delta_linha) == 2 and abs(dc - sc) == 2:
            mid_r = (sr + dr) // 2
            mid_c = (sc + dc) // 2
            peca_meio = tabuleiro[mid_r][mid_c]

            if peca_meio != Peca.VAZIO and not RegrasDamas.pertence_ao_jogador(
                peca_meio, jogador
            ):
                return True, (mid_r, mid_c)

        return False, None

    @staticmethod
    def _validar_movimento_dama(
        tabuleiro: list[list[int]],
        origem: Posicao,
        destino: Posicao,
        jogador: Jogador,
    ) -> tuple[bool, Optional[Posicao]]:
        sr, sc = origem
        dr, dc = destino
        passo_r = 1 if dr > sr else -1
        passo_c = 1 if dc > sc else -1

        adversarias_no_caminho: list[Posicao] = []

        curr_r, curr_c = sr + passo_r, sc + passo_c
        while (curr_r, curr_c) != (dr, dc):
            peca_atual = tabuleiro[curr_r][curr_c]
            if peca_atual != Peca.VAZIO:
                if RegrasDamas.pertence_ao_jogador(peca_atual, jogador):
                    return False, None  # bloqueada por peça própria
                adversarias_no_caminho.append((curr_r, curr_c))

            curr_r += passo_r
            curr_c += passo_c

        if not adversarias_no_caminho:
            return True, None
        if len(adversarias_no_caminho) == 1:
            return True, adversarias_no_caminho[0]
        return False, None

    @staticmethod
    def promover_se_aplicavel(
        tabuleiro: list[list[int]], posicao: Posicao, jogador: Jogador
    ) -> None:
        """Promove a peça a dama caso atinja a última linha."""
        linha, coluna = posicao
        peca = tabuleiro[linha][coluna]

        if peca == Peca.VERMELHA and linha == 0:
            tabuleiro[linha][coluna] = Peca.DAMA_VERMELHA
        elif peca == Peca.BRANCA and linha == TAMANHO_TABULEIRO - 1:
            tabuleiro[linha][coluna] = Peca.DAMA_BRANCA

    @staticmethod
    def aplicar_movimento(
        tabuleiro: list[list[int]],
        origem: Posicao,
        destino: Posicao,
        capturada: Optional[Posicao],
    ) -> None:
        """Move a peça e remove a peça capturada, se houver."""
        sr, sc = origem
        dr, dc = destino

        tabuleiro[dr][dc] = tabuleiro[sr][sc]
        tabuleiro[sr][sc] = Peca.VAZIO

        if capturada is not None:
            cr, cc = capturada
            tabuleiro[cr][cc] = Peca.VAZIO

    @staticmethod
    def verificar_vencedor(tabuleiro: list[list[int]]) -> Optional[Jogador]:
        """Verifica se algum jogador ficou sem peças no tabuleiro."""
        tem_vermelho = False
        tem_branco = False

        for linha in tabuleiro:
            for peca in linha:
                if peca in PECAS_DO_JOGADOR[Jogador.VERMELHO]:
                    tem_vermelho = True
                elif peca in PECAS_DO_JOGADOR[Jogador.BRANCO]:
                    tem_branco = True

        if not tem_vermelho:
            return Jogador.BRANCO
        if not tem_branco:
            return Jogador.VERMELHO
        return None

    @staticmethod
    def alternar_turno(jogador: Jogador) -> Jogador:
        return Jogador.BRANCO if jogador == Jogador.VERMELHO else Jogador.VERMELHO


# ============================================================
# ESTADO DA SESSÃO E INTERAÇÃO
# ============================================================

def inicializar_estado() -> None:
    """Inicializa o estado do jogo na sessão do Streamlit."""
    if "estado" not in st.session_state:
        st.session_state.estado = EstadoJogo(
            tabuleiro=RegrasDamas.criar_tabuleiro_inicial(),
            turno=Jogador.VERMELHO,
            selecionada=None,
            vencedor=None,
            historico=["🎮 Partida iniciada. Vez do Jogador Vermelho."],
            capturadas_vermelho=0,
            capturadas_branco=0,
        )


def reiniciar_jogo() -> None:
    st.session_state.estado = EstadoJogo(
        tabuleiro=RegrasDamas.criar_tabuleiro_inicial(),
        turno=Jogador.VERMELHO,
        selecionada=None,
        vencedor=None,
        historico=["🔄 Partida reiniciada. Vez do Jogador Vermelho."],
        capturadas_vermelho=0,
        capturadas_branco=0,
    )
    st.rerun()


def tratar_clique(estado: EstadoJogo, linha: int, coluna: int) -> None:
    """Processa o clique do usuário em uma casa do tabuleiro."""
    if estado.vencedor is not None:
        return

    tabuleiro = estado.tabuleiro
    peca = tabuleiro[linha][coluna]
    jog = estado.turno

    # Caso 1: nada selecionado -> tenta selecionar peça própria
    if estado.selecionada is None:
        if RegrasDamas.pertence_ao_jogador(peca, jog):
            estado.selecionada = (linha, coluna)
            st.rerun()
        return

    origem = estado.selecionada
    valido, capturada = RegrasDamas.validar_movimento(
        tabuleiro, origem, (linha, coluna), jog
    )

    if valido:
        RegrasDamas.aplicar_movimento(tabuleiro, origem, (linha, coluna), capturada)
        RegrasDamas.promover_se_aplicavel(tabuleiro, (linha, coluna), jog)

        # Atualizar contagem de capturas
        if capturada is not None:
            if jog == Jogador.VERMELHO:
                estado.capturadas_vermelho += 1
            else:
                estado.capturadas_branco += 1

        # Verificar vencedor
        vencedor = RegrasDamas.verificar_vencedor(tabuleiro)
        if vencedor is not None:
            estado.vencedor = vencedor
            nome_venc = "Vermelho" if vencedor == Jogador.VERMELHO else "Branco"
            estado.historico.insert(0, f"🏆 Fim de jogo! Jogador {nome_venc} venceu!")
        else:
            estado.turno = RegrasDamas.alternar_turno(jog)
            proximo_nome = "Vermelho" if estado.turno == Jogador.VERMELHO else "Branco"
            estado.historico.insert(0, f"➡️ Movimento de {origem} para {(linha, coluna)}. Turno de {proximo_nome}.")

        estado.selecionada = None
        st.rerun()
        return

    # Movimento inválido ou troca de seleção
    if RegrasDamas.pertence_ao_jogador(peca, jog):
        estado.selecionada = (linha, coluna)
    else:
        estado.selecionada = None
    st.rerun()


# ============================================================
# INTERFACE (UI) COM DESIGN MODERNO
# ============================================================

def aplicar_estilos_customizados() -> None:
    """Injeta CSS customizado para transformar a estética do aplicativo."""
    st.markdown(
        """
        <style>
            .stApp {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: #f8fafc;
            }
            .main-title {
                font-size: 2.5rem;
                font-weight: 800;
                background: linear-gradient(90deg, #ef4444 0%, #f97316 50%, #ffffff 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-align: center;
                margin-bottom: 0px;
            }
            .sub-title {
                text-align: center;
                color: #94a3b8;
                font-size: 1.1rem;
                margin-bottom: 2rem;
            }
            /* Board Button Styling */
            .stButton button {
                height: 60px !important;
                width: 100% !important;
                font-size: 28px !important;
                border-radius: 10px !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .stButton button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                border-color: rgba(255, 255, 255, 0.3) !important;
            }
            /* Stats Card */
            .stat-card {
                background: rgba(30, 41, 59, 0.7);
                border: 1px solid rgba(255, 255, 255, 0.08);
                padding: 1rem;
                border-radius: 12px;
                text-align: center;
                backdrop-filter: blur(8px);
            }
            .winner-banner {
                background: linear-gradient(90deg, #10b981 0%, #059669 100%);
                padding: 1.5rem;
                border-radius: 12px;
                text-align: center;
                font-size: 1.5rem;
                font-weight: bold;
                color: white;
                margin-bottom: 1.5rem;
                box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.02); }
                100% { transform: scale(1); }
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def renderizar_cabecalho(estado: EstadoJogo) -> None:
    st.markdown("<h1 class='main-title'>JOGO DE DAMAS</h1>", unsafe_allow_html=True)
    st.markdown("<div class='sub-title'>Edição Brasileira Profissional • Movimentos Diagonais e Capturas Retroativas</div>", unsafe_allow_html=True)

    if estado.vencedor is not None:
        nome_venc = "🔴 Vermelho" if estado.vencedor == Jogador.VERMELHO else "⚪ Branco"
        st.markdown(
            f"<div class='winner-banner'>🎉 VITÓRIA DO JOGADOR {nome_venc}! 🎉</div>",
            unsafe_allow_html=True,
        )


def renderizar_tabuleiro(estado: EstadoJogo) -> None:
    col_centro_esq, col_tab, col_centro_dir = st.columns([1, 6, 1])

    with col_tab:
        for linha in range(TAMANHO_TABULEIRO):
            colunas = st.columns(TAMANHO_TABULEIRO)
            for coluna in range(TAMANHO_TABULEIRO):
                with colunas[coluna]:
                    if RegrasDamas.casa_jogavel(linha, coluna):
                        _renderizar_casa_jogavel(estado, linha, coluna)
                    else:
                        st.button(
                            "",
                            key=f"empty_{linha}_{coluna}",
                            disabled=True,
                            use_container_width=True,
                        )


def _renderizar_casa_jogavel(estado: EstadoJogo, linha: int, coluna: int) -> None:
    peca = estado.tabuleiro[linha][coluna]
    selecionada = estado.selecionada == (linha, coluna)

    label = SIMBOLOS.get(Peca(peca), "")
    
    # Customizar cor do botão dependendo se está selecionado
    if selecionada:
        btn_type = "primary"
    else:
        btn_type = "secondary"

    if st.button(
        label if label else "•",
        key=f"cell_{linha}_{coluna}",
        type=btn_type,
        use_container_width=True,
    ):
        tratar_clique(estado, linha, coluna)


def renderizar_barra_lateral(estado: EstadoJogo) -> None:
    with st.sidebar:
        st.markdown("### ⚙️ Painel de Controle")
        
        if st.button("🔄 Reiniciar Partida", use_container_width=True, type="primary"):
            reiniciar_jogo()

        st.markdown("---")
        
        # Turno Atual Badge
        st.markdown("#### ⏱️ Turno Atual")
        if estado.turno == Jogador.VERMELHO:
            st.markdown(
                "<div style='background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; padding: 10px; border-radius: 8px; text-align: center; font-weight: bold; color: #f87171;'>🔴 Jogador Vermelho</div>",
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                "<div style='background: rgba(255, 255, 255, 0.1); border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; text-align: center; font-weight: bold; color: #f8fafc;'>⚪ Jogador Branco</div>",
                unsafe_allow_html=True,
            )

        st.markdown("---")

        # Placar / Capturas
        st.markdown("#### 📊 Estatísticas")
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(
                f"<div class='stat-card'><small>🔴 Vermelho</small><br><b>Capturas:</b> {estado.capturadas_vermelho}</div>",
                unsafe_allow_html=True,
            )
        with col2:
            st.markdown(
                f"<div class='stat-card'><small>⚪ Branco</small><br><b>Capturas:</b> {estado.capturadas_branco}</div>",
                unsafe_allow_html=True,
            )

        st.markdown("---")

        # Histórico de jogadas
        st.markdown("#### 📜 Histórico Recente")
        historico_container = st.container(height=250)
        with historico_container:
            for evento in estado.historico[:15]:
                st.caption(evento)


def renderizar_rodape() -> None:
    st.markdown("---")
    st.markdown(
        "<div style='text-align: center; color: #64748b; font-size: 0.9rem;'>"
        "🎯 <b>Regras Brasileiras:</b> Peças comuns avançam para frente e capturam para trás/frente. "
        "Damas movimentam-se livremente por várias casas nas diagonais."
        "</div>",
        unsafe_allow_html=True,
    )


# ============================================================
# PONTO DE ENTRADA PRINCIPAL
# ============================================================

def main() -> None:
    st.set_page_config(
        page_title="Jogo de Damas - Regras Brasileiras",
        page_icon="🔴",
        layout="wide",
    )

    aplicar_estilos_customizados()
    inicializar_estado()
    estado: EstadoJogo = st.session_state.estado

    renderizar_barra_lateral(estado)
    renderizar_cabecalho(estado)
    renderizar_tabuleiro(estado)
    renderizar_rodape()


if __name__ == "__main__":
    main()
