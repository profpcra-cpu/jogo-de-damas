"""
Jogo de Damas - Regras Brasileiras
----------------------------------
Aplicação Streamlit profissional com interface moderna, painel lateral,
histórico de jogadas e deteção automática de vitória.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional

import streamlit as st


# ============================================================
# CONSTANTES E TIPOS
# ============================================================

TAMANHO_TABULEIRO = 8
LINHAS_INICIAIS_BRANCAS = range(0, 3)
LINHAS_INICIAIS_VERMELHAS = range(5, 8)


class Peca(IntEnum):
    VAZIO = 0
    VERMELHA = 1
    BRANCA = 2
    DAMA_VERMELHA = 3
    DAMA_BRANCA = 4


class Jogador(IntEnum):
    VERMELHO = 1
    BRANCO = 2


PECAS_DO_JOGADOR = {
    Jogador.VERMELHO: {Peca.VERMELHA, Peca.DAMA_VERMELHA},
    Jogador.BRANCO: {Peca.BRANCA, Peca.DAMA_BRANCA},
}

DAMAS = {Peca.DAMA_VERMELHA, Peca.DAMA_BRANCA}
PECAS_COMUNS = {Peca.VERMELHA, Peca.BRANCA}

SIMBOLOS = {
    Peca.VERMELHA: "🔴",
    Peca.BRANCA: "⚪",
    Peca.DAMA_VERMELHA: "🔴👑",
    Peca.DAMA_BRANCA: "⚪👑",
    Peca.VAZIO: "",
}

Posicao = tuple[int, int]


@dataclass
class EstadoJogo:
    """Encapsula todo o estado mutável do jogo."""
    tabuleiro: list[list[int]] = field(default_factory=list)
    turno: Jogador = Jogador.VERMELHO
    selecionada: Optional[Posicao] = None
    capturas_vermelho: int = 0
    capturas_branco: int = 0
    historico: list[str] = field(default_factory=list)
    vencedor: Optional[Jogador] = None


# ============================================================
# REGRAS DO JOGO
# ============================================================

class RegrasDamas:
    @staticmethod
    def criar_tabuleiro_inicial() -> list[list[int]]:
        tabuleiro = [[Peca.VAZIO for _ in range(TAMANHO_TABULEIRO)] for _ in range(TAMANHO_TABULEIRO)]

        for linha in LINHAS_INICIAIS_BRANCAS:
            for coluna in range(TAMANHO_TABULEIRO):
                if (linha + coluna) % 2 == 1:
                    tabuleiro[linha][coluna] = Peca.BRANCA

        for linha in LINHAS_INICIAIS_VERMELHAS:
            for coluna in range(TAMANHO_TABULEIRO):
                if (linha + coluna) % 2 == 1:
                    tabuleiro[linha][coluna] = Peca.VERMELHA

        return tabuleiro

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
            return False, None

        delta_linha = dr - sr

        # Peça Comum
        if peca_origem in PECAS_COMUNS:
            direcao_frente = -1 if jogador == Jogador.VERMELHO else 1
            if abs(delta_linha) == 1 and abs(dc - sc) == 1:
                if delta_linha == direcao_frente:
                    return True, None
                return False, None
            if abs(delta_linha) == 2 and abs(dc - sc) == 2:
                mid_r = (sr + dr) // 2
                mid_c = (sc + dc) // 2
                peca_meio = tabuleiro[mid_r][mid_c]
                if peca_meio != Peca.VAZIO and not RegrasDamas.pertence_ao_jogador(peca_meio, jogador):
                    return True, (mid_r, mid_c)
            return False, None

        # Dama
        if peca_origem in DAMAS:
            passo_r = 1 if dr > sr else -1
            passo_c = 1 if dc > sc else -1
            adversarias_no_caminho: list[Posicao] = []

            curr_r, curr_c = sr + passo_r, sc + passo_c
            while (curr_r, curr_c) != (dr, dc):
                peca_atual = tabuleiro[curr_r][curr_c]
                if peca_atual != Peca.VAZIO:
                    if RegrasDamas.pertence_ao_jogador(peca_atual, jogador):
                        return False, None
                    adversarias_no_caminho.append((curr_r, curr_c))
                curr_r += passo_r
                curr_c += passo_c

            if not adversarias_no_caminho:
                return True, None
            if len(adversarias_no_caminho) == 1:
                return True, adversarias_no_caminho[0]
            return False, None

        return False, None

    @staticmethod
    def promover_se_aplicavel(tabuleiro: list[list[int]], posicao: Posicao, jogador: Jogador) -> None:
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
        sr, sc = origem
        dr, dc = destino
        tabuleiro[dr][dc] = tabuleiro[sr][sc]
        tabuleiro[sr][sc] = Peca.VAZIO
        if capturada is not None:
            cr, cc = capturada
            tabuleiro[cr][cc] = Peca.VAZIO

    @staticmethod
    def verificar_vencedor(tabuleiro: list[list[int]]) -> Optional[Jogador]:
        tem_vermelho = any(
            RegrasDamas.pertence_ao_jogador(tabuleiro[r][c], Jogador.VERMELHO)
            for r in range(TAMANHO_TABULEIRO) for c in range(TAMANHO_TABULEIRO)
        )
        tem_branco = any(
            RegrasDamas.pertence_ao_jogador(tabuleiro[r][c], Jogador.BRANCO)
            for r in range(TAMANHO_TABULEIRO) for c in range(TAMANHO_TABULEIRO)
        )

        if not tem_vermelho:
            return Jogador.BRANCO
        if not tem_branco:
            return Jogador.VERMELHO
        return None


# ============================================================
# ESTADO DA SESSÃO E INTERAÇÃO
# ============================================================

def inicializar_estado() -> None:
    if "estado" not in st.session_state:
        st.session_state.estado = EstadoJogo(
            tabuleiro=RegrasDamas.criar_tabuleiro_inicial(),
            turno=Jogador.VERMELHO,
            selecionada=None,
            capturas_vermelho=0,
            capturas_branco=0,
            historico=[],
            vencedor=None,
        )


def reiniciar_jogo() -> None:
    st.session_state.estado = EstadoJogo(
        tabuleiro=RegrasDamas.criar_tabuleiro_inicial(),
        turno=Jogador.VERMELHO,
        selecionada=None,
        capturas_vermelho=0,
        capturas_branco=0,
        historico=[],
        vencedor=None,
    )
    st.rerun()


def tratar_clique(estado: EstadoJogo, linha: int, coluna: int) -> None:
    if estado.vencedor is not None:
        return

    tabuleiro = estado.tabuleiro
    peca = tabuleiro[linha][coluna]
    jogador = estado.turno

    if estado.selecionada is None:
        if RegrasDamas.pertence_ao_jogador(peca, jogador):
            estado.selecionada = (linha, coluna)
            st.rerun()
        return

    origem = estado.selecionada
    valido, capturada = RegrasDamas.validar_movimento(tabuleiro, origem, (linha, coluna), jogador)

    if valido:
        RegrasDamas.aplicar_movimento(tabuleiro, origem, (linha, coluna), capturada)
        RegrasDamas.promover_se_aplicavel(tabuleiro, (linha, coluna), jogador)

        if capturada is not None:
            if jogador == Jogador.VERMELHO:
                estado.capturas_vermelho += 1
            else:
                estado.capturas_branco += 1

        # Registar histórico simples
        jog_str = "Vermelho" if jogador == Jogador.VERMELHO else "Branco"
        estado.historico.append(f"{jog_str}: {origem} ➔ {(linha, coluna)}")

        # Verificar se há vencedor
        vencedor = RegrasDamas.verificar_vencedor(tabuleiro)
        if vencedor:
            estado.vencedor = vencedor

        estado.turno = Jogador.BRANCO if jogador == Jogador.VERMELHO else Jogador.VERMELHO
        estado.selecionada = None
        st.rerun()
        return

    if RegrasDamas.pertence_ao_jogador(peca, jogador):
        estado.selecionada = (linha, coluna)
    else:
        estado.selecionada = None
    st.rerun()


# ============================================================
# INTERFACE (UI) COM ESTILIZAÇÃO CSS
# ============================================================

def aplicar_estilos_css() -> None:
    st.markdown("""
        <style>
        .stButton button {
            width: 100%;
            height: 60px;
            font-size: 24px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.2s ease-in-out;
        }
        .stButton button:hover {
            transform: scale(1.02);
            border-color: #ff4b4b;
        }
        .stat-card {
            background-color: #1e1e1e;
            padding: 15px;
            border-radius: 10px;
            border: 1px solid #333;
            text-align: center;
            margin-bottom: 10px;
        }
        </style>
    """, unsafe_allow_html=True)


def renderizar_barra_lateral(estado: EstadoJogo) -> None:
    with st.sidebar:
        st.title("⚙️ Painel de Controlo")
        st.markdown("---")

        if estado.vencedor is not None:
            v_nome = "Vermelho" if estado.vencedor == Jogador.VERMELHO else "Branco"
            st.success(f"🏆 **Vencedor:** Jogador {v_nome}!")
        else:
            t_nome = "Vermelho 🔴" if estado.turno == Jogador.VERMELHO else "Branco ⚪"
            st.info(f"📍 **Turno atual:** {t_nome}")

        st.markdown("### 📊 Estatísticas")
        st.markdown(f"""
            <div class='stat-card'>
                <small>🔴 Vermelho</small><br><b>Capturas:</b> {estado.capturas_vermelho}
            </div>
            <div class='stat-card'>
                <small>⚪ Branco</small><br><b>Capturas:</b> {estado.capturas_branco}
            </div>
        """, unsafe_allow_html=True)

        st.markdown("---")
        if st.button("🔄 Reiniciar Jogo", use_container_width=True):
            reiniciar_jogo()

        st.markdown("### 📜 Histórico de Jogadas")
        historico_container = st.container(height=200)
        with historico_container:
            if not estado.historico:
                st.caption("Ainda sem jogadas efetuadas.")
            else:
                for h in reversed(estado.historico):
                    st.text(h)


def renderizar_tabuleiro(estado: EstadoJogo) -> None:
    tabuleiro = estado.tabuleiro
    for linha in range(TAMANHO_TABULEIRO):
        cols = st.columns(TAMANHO_TABULEIRO)
        for coluna in range(TAMANHO_TABULEIRO):
            with cols[coluna]:
                if (linha + coluna) % 2 == 1:
                    peca = tabuleiro[linha][coluna]
                    selecionada = estado.selecionada == (linha, coluna)
                    label = SIMBOLOS.get(Peca(peca), "")
                    btn_type = "primary" if selecionada else "secondary"

                    if st.button(label, key=f"cell_{linha}_{coluna}", type=btn_type):
                        tratar_clique(estado, linha, coluna)
                else:
                    st.button(" ", key=f"empty_{linha}_{coluna}", disabled=True)


def main() -> None:
    st.set_page_config(
        page_title="Jogo de Damas - Regras Brasileiras",
        page_icon="🔴",
        layout="wide",
    )

    aplicar_estilos_css()
    inicializar_estado()
    estado: EstadoJogo = st.session_state.estado

    renderizar_barra_lateral(estado)

    st.title("🔴 Jogo de Damas - Regras Brasileiras ⚪")
    st.markdown("---")

    renderizar_tabuleiro(estado)


if __name__ == "__main__":
    main()
