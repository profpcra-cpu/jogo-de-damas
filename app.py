"""
Jogo de Damas - Regras Brasileiras
----------------------------------
Aplicação Streamlit que implementa o jogo de damas segundo as regras
brasileiras (peças comuns capturam para frente e para trás; damas
movem-se livremente por várias casas nas diagonais).

Autor: (refatoração profissional)
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

        # Sanidade básica
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
        return False, None  # não pode saltar duas peças

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
    def alternar_turno(jogador: Jogador) -> Jogador:
        return Jogador.BRANCO if jogador == Jogador.VERMELHO else Jogador.VERMELHO


# ============================================================
# ESTADO DA SESSÃO
# ============================================================

def inicializar_estado() -> None:
    """Inicializa o estado do jogo na sessão do Streamlit."""
    if "estado" not in st.session_state:
        st.session_state.estado = EstadoJogo(
            tabuleiro=RegrasDamas.criar_tabuleiro_inicial(),
            turno=Jogador.VERMELHO,
            selecionada=None,
        )


def reiniciar_jogo() -> None:
    st.session_state.estado = EstadoJogo(
        tabuleiro=RegrasDamas.criar_tabuleiro_inicial(),
        turno=Jogador.VERMELHO,
        selecionada=None,
    )
    st.rerun()


# ============================================================
# LÓGICA DE INTERAÇÃO
# ============================================================

def tratar_clique(estado: EstadoJogo, linha: int, coluna: int) -> None:
    """Processa o clique do usuário em uma casa do tabuleiro."""
    tabuleiro = estado.tabuleiro
    peca = tabuleiro[linha][coluna]
    jogador = estado.turno

    # Caso 1: nada selecionado -> tenta selecionar peça própria
    if estado.selecionada is None:
        if RegrasDamas.pertence_ao_jogador(peca, jogador):
            estado.selecionada = (linha, coluna)
            st.rerun()
        return

    origem = estado.selecionada
    valido, capturada = RegrasDamas.validar_movimento(
        tabuleiro, origem, (linha, coluna), jogador
    )

    if valido:
        RegrasDamas.aplicar_movimento(tabuleiro, origem, (linha, coluna), capturada)
        RegrasDamas.promover_se_aplicavel(tabuleiro, (linha, coluna), jogador)
        estado.turno = RegrasDamas.alternar_turno(jogador)
        estado.selecionada = None
        st.rerun()
        return

    # Movimento inválido: selecionar outra peça própria ou desmarcar
    if RegrasDamas.pertence_ao_jogador(peca, jogador):
        estado.selecionada = (linha, coluna)
    else:
        estado.selecionada = None
    st.rerun()


# ============================================================
# INTERFACE (UI)
# ============================================================

def aplicar_estilos_customizados() -> None:
    """Aplica estilos CSS para melhorar a apresentação visual do tabuleiro."""
    st.markdown(
        """
        <style>
            .stButton button {
                height: 55px;
                font-size: 26px !important;
                border-radius: 8px;
                transition: all 0.2s ease-in-out;
            }
            .stButton button:hover {
                transform: scale(1.03);
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def renderizar_cabecalho(estado: EstadoJogo) -> None:
    st.markdown("<h1 style='text-align: center;'>🔴 Jogo de Damas ⚪</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: gray;'>Regras Brasileiras</p>", unsafe_allow_html=True)
    st.markdown("---")

    col_status, col_acao = st.columns([2, 1])

    with col_status:
        nome_turno = "🔴 Vermelho (1)" if estado.turno == Jogador.VERMELHO else "⚪ Branco (2)"
        st.info(f"**Turno de:** {nome_turno}")

    with col_acao:
        if st.button("🔄 Reiniciar Jogo", use_container_width=True):
            reiniciar_jogo()


def renderizar_tabuleiro(estado: EstadoJogo) -> None:
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
    btn_type = "primary" if selecionada else "secondary"

    if st.button(
        label if label else "•",
        key=f"cell_{linha}_{coluna}",
        type=btn_type,
        use_container_width=True,
    ):
        tratar_clique(estado, linha, coluna)


def renderizar_rodape() -> None:
    st.markdown("---")
    st.markdown(
        "🎯 **Regras Brasileiras Aplicadas:** Peças comuns avançam para frente "
        "e capturam para trás/frente. Damas movimentam-se livremente por várias "
        "casas nas diagonais. Clique na peça para selecionar e na casa de destino "
        "para jogar."
    )


# ============================================================
# PONTO DE ENTRADA
# ============================================================

def main() -> None:
    st.set_page_config(
        page_title="Jogo de Damas - Regras Brasileiras",
        page_icon="🔴",
        layout="centered",
    )

    aplicar_estilos_customizados()
    inicializar_estado()
    estado: EstadoJogo = st.session_state.estado

    renderizar_cabecalho(estado)
    renderizar_tabuleiro(estado)
    renderizar_rodape()


if __name__ == "__main__":
    main()
