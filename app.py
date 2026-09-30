"""
JOGO DE DAMAS — REGRAS BRASILEIRAS
===================================

Aplicação Streamlit para jogo de damas segundo as regras brasileiras.

Características:
- Tabuleiro 8x8.
- Peças comuns movimentam-se uma casa para frente.
- Peças comuns capturam para frente e para trás.
- Damas movimentam-se livremente pelas diagonais.
- Captura obrigatória.
- Capturas múltiplas.
- Promoção para dama.
- Verificação automática de fim de jogo.
- Histórico das jogadas.
- Destaque da peça selecionada.
- Destaque das jogadas legais.
- Interface separada do motor de regras.

Autor: refatoração profissional
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional


import streamlit as st


# ============================================================
# CONFIGURAÇÕES
# ============================================================

TAMANHO_TABULEIRO = 8

LINHAS_INICIAIS_BRANCAS = range(0, 3)
LINHAS_INICIAIS_VERMELHAS = range(5, 8)

TITULO_JOGO = "🔴 Jogo de Damas — Regras Brasileiras ⚪"


# ============================================================
# ENUMERAÇÕES
# ============================================================

class Peca(IntEnum):
    """Tipos possíveis de peças."""

    VAZIO = 0

    VERMELHA = 1
    BRANCA = 2

    DAMA_VERMELHA = 3
    DAMA_BRANCA = 4


class Jogador(IntEnum):
    """Jogadores da partida."""

    VERMELHO = 1
    BRANCO = 2


# ============================================================
# CONSTANTES DE APOIO
# ============================================================

PECAS_DO_JOGADOR = {
    Jogador.VERMELHO: {
        Peca.VERMELHA,
        Peca.DAMA_VERMELHA,
    },
    Jogador.BRANCO: {
        Peca.BRANCA,
        Peca.DAMA_BRANCA,
    },
}


DAMAS = {
    Peca.DAMA_VERMELHA,
    Peca.DAMA_BRANCA,
}


PECAS_COMUNS = {
    Peca.VERMELHA,
    Peca.BRANCA,
}


SIMBOLOS = {
    Peca.VAZIO: "",
    Peca.VERMELHA: "🔴",
    Peca.BRANCA: "⚪",
    Peca.DAMA_VERMELHA: "🔴\n👑",
    Peca.DAMA_BRANCA: "⚪\n👑",
}


DIRECAO_FRENTE = {
    Peca.VERMELHA: -1,
    Peca.BRANCA: +1,
}


NOME_JOGADOR = {
    Jogador.VERMELHO: "Vermelho",
    Jogador.BRANCO: "Branco",
}


SIMBOLO_JOGADOR = {
    Jogador.VERMELHO: "🔴",
    Jogador.BRANCO: "⚪",
}


# ============================================================
# TIPOS
# ============================================================

Posicao = tuple[int, int]


@dataclass(frozen=True)
class Movimento:
    """
    Representa uma jogada completa.

    origem:
        posição inicial da peça.

    destino:
        posição final da peça.

    capturada:
        posição da peça adversária capturada, quando houver.
    """

    origem: Posicao
    destino: Posicao
    capturada: Optional[Posicao] = None

    @property
    def eh_captura(self) -> bool:
        return self.capturada is not None


@dataclass
class RegistroJogada:
    """Registro legível de uma jogada realizada."""

    jogador: Jogador
    movimento: Movimento
    peca: Peca
    promoveu: bool = False


@dataclass
class EstadoJogo:
    """Estado completo e mutável da partida."""

    tabuleiro: list[list[int]]

    turno: Jogador = Jogador.VERMELHO

    selecionada: Optional[Posicao] = None

    # Quando uma captura múltipla está acontecendo,
    # a mesma peça deve continuar jogando.
    peca_em_captura: Optional[Posicao] = None

    ultima_jogada: Optional[Movimento] = None

    historico: list[RegistroJogada] = field(default_factory=list)

    vencedor: Optional[Jogador] = None

    encerrado: bool = False


# ============================================================
# MOTOR DE REGRAS
# ============================================================

class RegrasDamas:
    """
    Motor das regras do jogo.

    Esta classe não depende do Streamlit.
    """

    # --------------------------------------------------------
    # TABULEIRO
    # --------------------------------------------------------

    @staticmethod
    def criar_tabuleiro_inicial() -> list[list[int]]:
        """Cria o tabuleiro inicial."""

        tabuleiro = [
            [Peca.VAZIO for _ in range(TAMANHO_TABULEIRO)]
            for _ in range(TAMANHO_TABULEIRO)
        ]

        # Peças brancas
        for linha in LINHAS_INICIAIS_BRANCAS:
            for coluna in range(TAMANHO_TABULEIRO):

                if RegrasDamas.casa_jogavel(linha, coluna):
                    tabuleiro[linha][coluna] = Peca.BRANCA

        # Peças vermelhas
        for linha in LINHAS_INICIAIS_VERMELHAS:
            for coluna in range(TAMANHO_TABULEIRO):

                if RegrasDamas.casa_jogavel(linha, coluna):
                    tabuleiro[linha][coluna] = Peca.VERMELHA

        return tabuleiro

    @staticmethod
    def casa_jogavel(linha: int, coluna: int) -> bool:
        """Indica se a casa é uma casa escura/jogável."""

        return (linha + coluna) % 2 == 1

    @staticmethod
    def dentro_do_tabuleiro(linha: int, coluna: int) -> bool:
        """Verifica se a posição pertence ao tabuleiro."""

        return (
            0 <= linha < TAMANHO_TABULEIRO
            and
            0 <= coluna < TAMANHO_TABULEIRO
        )

    # --------------------------------------------------------
    # PEÇAS
    # --------------------------------------------------------

    @staticmethod
    def pertence_ao_jogador(
        peca: int,
        jogador: Jogador,
    ) -> bool:
        """Verifica se a peça pertence ao jogador."""

        return peca in PECAS_DO_JOGADOR[jogador]

    @staticmethod
    def eh_adversaria(
        peca: int,
        jogador: Jogador,
    ) -> bool:
        """Verifica se a peça pertence ao adversário."""

        if peca == Peca.VAZIO:
            return False

        return not RegrasDamas.pertence_ao_jogador(
            peca,
            jogador,
        )

    @staticmethod
    def eh_dama(peca: int) -> bool:
        """Verifica se a peça é uma dama."""

        return peca in DAMAS

    # --------------------------------------------------------
    # DIREÇÕES
    # --------------------------------------------------------

    @staticmethod
    def direcoes_diagonais() -> tuple[tuple[int, int], ...]:
        """Todas as quatro diagonais."""

        return (
            (-1, -1),
            (-1, +1),
            (+1, -1),
            (+1, +1),
        )

    @staticmethod
    def direcoes_frente(
        peca: int,
    ) -> tuple[tuple[int, int], ...]:
        """
        Direções de movimento normal de uma peça comum.

        Vermelho:
            sobe no tabuleiro.

        Branco:
            desce no tabuleiro.
        """

        direcao = DIRECAO_FRENTE[peca]

        return (
            (direcao, -1),
            (direcao, +1),
        )

    # ========================================================
    # MOVIMENTOS DE PEÇA COMUM
    # ========================================================

    @staticmethod
    def obter_movimentos_peca_comum(
        tabuleiro: list[list[int]],
        origem: Posicao,
        jogador: Jogador,
    ) -> list[Movimento]:
        """
        Obtém movimentos simples de uma peça comum.

        Capturas não são produzidas aqui.
        """

        sr, sc = origem
        peca = tabuleiro[sr][sc]

        movimentos: list[Movimento] = []

        for dr, dc in RegrasDamas.direcoes_frente(peca):

            destino = (
                sr + dr,
                sc + dc,
            )

            if not RegrasDamas.dentro_do_tabuleiro(*destino):
                continue

            if tabuleiro[destino[0]][destino[1]] != Peca.VAZIO:
                continue

            movimentos.append(
                Movimento(
                    origem=origem,
                    destino=destino,
                )
            )

        return movimentos

    # ========================================================
    # CAPTURAS DE PEÇA COMUM
    # ========================================================

    @staticmethod
    def obter_capturas_peca_comum(
        tabuleiro: list[list[int]],
        origem: Posicao,
        jogador: Jogador,
    ) -> list[Movimento]:
        """
        Obtém todas as capturas possíveis de uma peça comum.

        A captura pode ocorrer para frente ou para trás.
        """

        sr, sc = origem

        movimentos: list[Movimento] = []

        for dr, dc in RegrasDamas.direcoes_diagonais():

            meio = (
                sr + dr,
                sc + dc,
            )

            destino = (
                sr + (2 * dr),
                sc + (2 * dc),
            )

            if not RegrasDamas.dentro_do_tabuleiro(*destino):
                continue

            if not RegrasDamas.dentro_do_tabuleiro(*meio):
                continue

            peca_meio = tabuleiro[meio[0]][meio[1]]

            if not RegrasDamas.eh_adversaria(
                peca_meio,
                jogador,
            ):
                continue

            if tabuleiro[destino[0]][destino[1]] != Peca.VAZIO:
                continue

            movimentos.append(
                Movimento(
                    origem=origem,
                    destino=destino,
                    capturada=meio,
                )
            )

        return movimentos

    # ========================================================
    # MOVIMENTOS DE DAMA
    # ========================================================

    @staticmethod
    def obter_movimentos_dama(
        tabuleiro: list[list[int]],
        origem: Posicao,
        jogador: Jogador,
    ) -> list[Movimento]:
        """
        Obtém movimentos simples da dama.

        A dama pode percorrer várias casas em uma diagonal,
        desde que o caminho esteja livre.
        """

        sr, sc = origem

        movimentos: list[Movimento] = []

        for dr, dc in RegrasDamas.direcoes_diagonais():

            linha = sr + dr
            coluna = sc + dc

            while RegrasDamas.dentro_do_tabuleiro(
                linha,
                coluna,
            ):

                if tabuleiro[linha][coluna] != Peca.VAZIO:
                    break

                movimentos.append(
                    Movimento(
                        origem=origem,
                        destino=(linha, coluna),
                    )
                )

                linha += dr
                coluna += dc

        return movimentos

    # ========================================================
    # CAPTURAS DE DAMA
    # ========================================================

    @staticmethod
    def obter_capturas_dama(
        tabuleiro: list[list[int]],
        origem: Posicao,
        jogador: Jogador,
    ) -> list[Movimento]:
        """
        Obtém todas as capturas possíveis da dama.

        Em cada diagonal:
        - pode haver zero peças;
        - pode haver uma peça adversária;
        - depois dessa peça deve haver pelo menos uma casa livre;
        - uma segunda peça bloqueia a direção.
        """

        sr, sc = origem

        movimentos: list[Movimento] = []

        for dr, dc in RegrasDamas.direcoes_diagonais():

            linha = sr + dr
            coluna = sc + dc

            encontrou_adversaria = False
            posicao_adversaria: Optional[Posicao] = None

            while RegrasDamas.dentro_do_tabuleiro(
                linha,
                coluna,
            ):

                peca_atual = tabuleiro[linha][coluna]

                # Casa vazia
                if peca_atual == Peca.VAZIO:

                    if encontrou_adversaria:
                        movimentos.append(
                            Movimento(
                                origem=origem,
                                destino=(linha, coluna),
                                capturada=posicao_adversaria,
                            )
                        )

                    linha += dr
                    coluna += dc
                    continue

                # Peça encontrada
                if RegrasDamas.pertence_ao_jogador(
                    peca_atual,
                    jogador,
                ):
                    break

                # Segunda peça adversária bloqueia a diagonal
                if encontrou_adversaria:
                    break

                # Primeira peça adversária
                encontrou_adversaria = True
                posicao_adversaria = (
                    linha,
                    coluna,
                )

                linha += dr
                coluna += dc

        return movimentos

    # ========================================================
    # MOVIMENTOS DE UMA PEÇA
    # ========================================================

    @staticmethod
    def obter_movimentos_peca(
        tabuleiro: list[list[int]],
        origem: Posicao,
        jogador: Jogador,
    ) -> list[Movimento]:
        """Obtém movimentos simples da peça."""

        sr, sc = origem

        if not RegrasDamas.dentro_do_tabuleiro(
            sr,
            sc,
        ):
            return []

        peca = tabuleiro[sr][sc]

        if not RegrasDamas.pertence_ao_jogador(
            peca,
            jogador,
        ):
            return []

        if peca in PECAS_COMUNS:
            return RegrasDamas.obter_movimentos_peca_comum(
                tabuleiro,
                origem,
                jogador,
            )

        if peca in DAMAS:
            return RegrasDamas.obter_movimentos_dama(
                tabuleiro,
                origem,
                jogador,
            )

        return []

    # ========================================================
    # CAPTURAS DE UMA PEÇA
    # ========================================================

    @staticmethod
    def obter_capturas_peca(
        tabuleiro: list[list[int]],
        origem: Posicao,
        jogador: Jogador,
    ) -> list[Movimento]:
        """Obtém todas as capturas de uma peça."""

        sr, sc = origem

        if not RegrasDamas.dentro_do_tabuleiro(
            sr,
            sc,
        ):
            return []

        peca = tabuleiro[sr][sc]

        if not RegrasDamas.pertence_ao_jogador(
            peca,
            jogador,
        ):
            return []

        if peca in PECAS_COMUNS:
            return RegrasDamas.obter_capturas_peca_comum(
                tabuleiro,
                origem,
                jogador,
            )

        if peca in DAMAS:
            return RegrasDamas.obter_capturas_dama(
                tabuleiro,
                origem,
                jogador,
            )

        return []

    # ========================================================
    # CAPTURAS OBRIGATÓRIAS
    # ========================================================

    @staticmethod
    def obter_capturas_obrigatorias(
        tabuleiro: list[list[int]],
        jogador: Jogador,
    ) -> list[Movimento]:
        """
        Obtém todas as capturas disponíveis para o jogador.

        Se houver pelo menos uma captura, movimentos simples
        ficam proibidos.
        """

        capturas: list[Movimento] = []

        for linha in range(TAMANHO_TABULEIRO):

            for coluna in range(TAMANHO_TABULEIRO):

                peca = tabuleiro[linha][coluna]

                if not RegrasDamas.pertence_ao_jogador(
                    peca,
                    jogador,
                ):
                    continue

                capturas.extend(
                    RegrasDamas.obter_capturas_peca(
                        tabuleiro,
                        (linha, coluna),
                        jogador,
                    )
                )

        return capturas

    # ========================================================
    # JOGADAS LEGAIS
    # ========================================================

    @staticmethod
    def obter_jogadas_legais(
        tabuleiro: list[list[int]],
        jogador: Jogador,
        origem: Optional[Posicao] = None,
    ) -> list[Movimento]:
        """
        Obtém as jogadas legalmente disponíveis.

        Regra central:
        se existir alguma captura, somente capturas são legais.

        Quando `origem` é informada, retorna somente as jogadas
        daquela peça.
        """

        capturas = RegrasDamas.obter_capturas_obrigatorias(
            tabuleiro,
            jogador,
        )

        if capturas:

            if origem is None:
                return capturas

            return [
                movimento
                for movimento in capturas
                if movimento.origem == origem
            ]

        if origem is not None:

            return RegrasDamas.obter_movimentos_peca(
                tabuleiro,
                origem,
                jogador,
            )

        movimentos: list[Movimento] = []

        for linha in range(TAMANHO_TABULEIRO):

            for coluna in range(TAMANHO_TABULEIRO):

                peca = tabuleiro[linha][coluna]

                if not RegrasDamas.pertence_ao_jogador(
                    peca,
                    jogador,
                ):
                    continue

                movimentos.extend(
                    RegrasDamas.obter_movimentos_peca(
                        tabuleiro,
                        (linha, coluna),
                        jogador,
                    )
                )

        return movimentos

    # ========================================================
    # APLICAÇÃO DE MOVIMENTO
    # ========================================================

    @staticmethod
    def aplicar_movimento(
        tabuleiro: list[list[int]],
        movimento: Movimento,
    ) -> Peca:
        """
        Executa a movimentação no tabuleiro.

        Retorna a peça que foi movida.
        """

        sr, sc = movimento.origem
        dr, dc = movimento.destino

        peca = Peca(tabuleiro[sr][sc])

        tabuleiro[dr][dc] = peca
        tabuleiro[sr][sc] = Peca.VAZIO

        if movimento.capturada is not None:

            cr, cc = movimento.capturada

            tabuleiro[cr][cc] = Peca.VAZIO

        return peca

    # ========================================================
    # PROMOÇÃO
    # ========================================================

    @staticmethod
    def promover_se_aplicavel(
        tabuleiro: list[list[int]],
        posicao: Posicao,
    ) -> bool:
        """
        Promove a peça quando chega à última linha.

        Retorna True se houve promoção.
        """

        linha, coluna = posicao

        peca = Peca(tabuleiro[linha][coluna])

        if peca == Peca.VERMELHA:

            if linha == 0:

                tabuleiro[linha][coluna] = Peca.DAMA_VERMELHA

                return True

        elif peca == Peca.BRANCA:

            if linha == TAMANHO_TABULEIRO - 1:

                tabuleiro[linha][coluna] = Peca.DAMA_BRANCA

                return True

        return False

    # ========================================================
    # TURNO
    # ========================================================

    @staticmethod
    def alternar_turno(
        jogador: Jogador,
    ) -> Jogador:

        if jogador == Jogador.VERMELHO:
            return Jogador.BRANCO

        return Jogador.VERMELHO

    # ========================================================
    # CONTAGEM DE PEÇAS
    # ========================================================

    @staticmethod
    def contar_pecas(
        tabuleiro: list[list[int]],
        jogador: Jogador,
    ) -> int:

        total = 0

        for linha in tabuleiro:

            for peca in linha:

                if RegrasDamas.pertence_ao_jogador(
                    peca,
                    jogador,
                ):
                    total += 1

        return total

    # ========================================================
    # FIM DE JOGO
    # ========================================================

    @staticmethod
    def determinar_vencedor(
        tabuleiro: list[list[int]],
        jogador: Jogador,
    ) -> Optional[Jogador]:
        """
        Verifica se o jogador da vez perdeu.

        Um jogador perde se:
        - não possui peças; ou
        - não possui movimentos legais.
        """

        if RegrasDamas.contar_pecas(
            tabuleiro,
            jogador,
        ) == 0:

            return RegrasDamas.alternar_turno(jogador)

        jogadas = RegrasDamas.obter_jogadas_legais(
            tabuleiro,
            jogador,
        )

        if not jogadas:

            return RegrasDamas.alternar_turno(jogador)

        return None


# ============================================================
# ESTADO DO STREAMLIT
# ============================================================

def criar_estado_inicial() -> EstadoJogo:
    """Cria uma nova partida."""

    return EstadoJogo(
        tabuleiro=RegrasDamas.criar_tabuleiro_inicial(),
        turno=Jogador.VERMELHO,
    )


def inicializar_estado() -> None:
    """Inicializa a partida na sessão."""

    if "estado" not in st.session_state:

        st.session_state.estado = criar_estado_inicial()


def reiniciar_jogo() -> None:
    """Inicia uma nova partida."""

    st.session_state.estado = criar_estado_inicial()

    st.rerun()


# ============================================================
# CONTROLADOR DO JOGO
# ============================================================

def obter_jogadas_da_selecionada(
    estado: EstadoJogo,
) -> list[Movimento]:
    """Obtém as jogadas legais da peça selecionada."""

    if estado.selecionada is None:
        return []

    return RegrasDamas.obter_jogadas_legais(
        estado.tabuleiro,
        estado.turno,
        estado.selecionada,
    )


def selecionar_peca(
    estado: EstadoJogo,
    posicao: Posicao,
) -> None:
    """
    Seleciona uma peça pertencente ao jogador atual.

    Durante captura múltipla, somente a peça responsável
    pela sequência pode permanecer selecionada.
    """

    if estado.encerrado:
        return

    linha, coluna = posicao

    peca = estado.tabuleiro[linha][coluna]

    if not RegrasDamas.pertence_ao_jogador(
        peca,
        estado.turno,
    ):
        return

    # Durante captura múltipla não podemos trocar de peça.
    if estado.peca_em_captura is not None:

        if posicao != estado.peca_em_captura:
            return

    jogadas = RegrasDamas.obter_jogadas_legais(
        estado.tabuleiro,
        estado.turno,
        posicao,
    )

    if not jogadas:
        return

    estado.selecionada = posicao


def executar_movimento(
    estado: EstadoJogo,
    movimento: Movimento,
) -> None:
    """Executa uma jogada legal."""

    if estado.encerrado:
        return

    jogador = estado.turno

    peca_original = Peca(
        estado.tabuleiro[
            movimento.origem[0]
        ][
            movimento.origem[1]
        ]
    )

    # Segurança adicional:
    # confirma que a jogada realmente está entre as legais.
    jogadas_legais = RegrasDamas.obter_jogadas_legais(
        estado.tabuleiro,
        jogador,
        movimento.origem,
    )

    if movimento not in jogadas_legais:
        return

    RegrasDamas.aplicar_movimento(
        estado.tabuleiro,
        movimento,
    )

    promoveu = RegrasDamas.promover_se_aplicavel(
        estado.tabuleiro,
        movimento.destino,
    )

    estado.historico.append(
        RegistroJogada(
            jogador=jogador,
            movimento=movimento,
            peca=peca_original,
            promoveu=promoveu,
        )
    )

    estado.ultima_jogada = movimento

    # --------------------------------------------------------
    # CAPTURA MÚLTIPLA
    # --------------------------------------------------------

    if movimento.eh_captura:

        novas_capturas = RegrasDamas.obter_capturas_peca(
            estado.tabuleiro,
            movimento.destino,
            jogador,
        )

        if novas_capturas:

            estado.peca_em_captura = movimento.destino
            estado.selecionada = movimento.destino

            return

    # --------------------------------------------------------
    # FIM DA CAPTURA / TROCA DE TURNO
    # --------------------------------------------------------

    estado.peca_em_captura = None
    estado.selecionada = None

    proximo_jogador = RegrasDamas.alternar_turno(
        jogador
    )

    estado.turno = proximo_jogador

    vencedor = RegrasDamas.determinar_vencedor(
        estado.tabuleiro,
        estado.turno,
    )

    if vencedor is not None:

        estado.vencedor = vencedor
        estado.encerrado = True


def tratar_clique(
    estado: EstadoJogo,
    linha: int,
    coluna: int,
) -> None:
    """Controla um clique realizado no tabuleiro."""

    if estado.encerrado:
        return

    posicao = (
        linha,
        coluna,
    )

    # --------------------------------------------------------
    # NENHUMA PEÇA SELECIONADA
    # --------------------------------------------------------

    if estado.selecionada is None:

        selecionar_peca(
            estado,
            posicao,
        )

        st.rerun()

        return

    # --------------------------------------------------------
    # PEÇA JÁ SELECIONADA
    # --------------------------------------------------------

    jogadas = obter_jogadas_da_selecionada(
        estado
    )

    for movimento in jogadas:

        if movimento.destino == posicao:

            executar_movimento(
                estado,
                movimento,
            )

            st.rerun()

            return

    # --------------------------------------------------------
    # CLICOU EM OUTRA PEÇA PRÓPRIA
    # --------------------------------------------------------

    peca = estado.tabuleiro[linha][coluna]

    if RegrasDamas.pertence_ao_jogador(
        peca,
        estado.turno,
    ):

        selecionar_peca(
            estado,
            posicao,
        )

        st.rerun()

        return

    # --------------------------------------------------------
    # CLICOU EM LOCAL INVÁLIDO
    # --------------------------------------------------------

    if estado.peca_em_captura is None:

        estado.selecionada = None

    st.rerun()


# ============================================================
# INTERFACE — CSS
# ============================================================

def inserir_estilo() -> None:
    """Insere o CSS da aplicação."""

    st.markdown(
        """
        <style>

        .block-container {
            max-width: 900px;
            padding-top: 2rem;
            padding-bottom: 3rem;
        }

        .titulo-jogo {
            text-align: center;
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.2rem;
        }

        .subtitulo-jogo {
            text-align: center;
            color: #666;
            margin-bottom: 1.5rem;
        }

        .status-jogo {
            text-align: center;
            font-size: 1.15rem;
            font-weight: 600;
            padding: 0.7rem;
            border-radius: 10px;
            border: 1px solid rgba(0,0,0,0.1);
            margin-bottom: 1rem;
        }

        .fim-jogo {
            text-align: center;
            font-size: 1.4rem;
            font-weight: 700;
            padding: 1rem;
            border-radius: 10px;
            border: 2px solid rgba(0,0,0,0.15);
            margin-bottom: 1rem;
        }

        .informacao-captura {
            text-align: center;
            font-weight: 600;
            margin-bottom: 0.8rem;
        }

        .historico-titulo {
            font-weight: 700;
            margin-top: 1.5rem;
        }

        </style>
        """,
        unsafe_allow_html=True,
    )


# ============================================================
# INTERFACE — CABEÇALHO
# ============================================================

def renderizar_cabecalho(
    estado: EstadoJogo,
) -> None:

    st.markdown(
        f"""
        <div class="titulo-jogo">
            {TITULO_JOGO}
        </div>

        <div class="subtitulo-jogo">
            Captura obrigatória • Capturas múltiplas • Promoção
        </div>
        """,
        unsafe_allow_html=True,
    )

    if estado.encerrado:

        vencedor = estado.vencedor

        nome = NOME_JOGADOR[vencedor]
        simbolo = SIMBOLO_JOGADOR[vencedor]

        st.markdown(
            f"""
            <div class="fim-jogo">
                🏆 {simbolo} Vitória do {nome}!
            </div>
            """,
            unsafe_allow_html=True,
        )

    else:

        nome = NOME_JOGADOR[estado.turno]
        simbolo = SIMBOLO_JOGADOR[estado.turno]

        st.markdown(
            f"""
            <div class="status-jogo">
                Turno: {simbolo} {nome}
            </div>
            """,
            unsafe_allow_html=True,
        )

    capturas = RegrasDamas.obter_capturas_obrigatorias(
        estado.tabuleiro,
        estado.turno,
    )

    if capturas and not estado.encerrado:

        st.markdown(
            """
            <div class="informacao-captura">
                ⚠️ Há captura obrigatória.
            </div>
            """,
            unsafe_allow_html=True,
        )


# ============================================================
# INTERFACE — TABULEIRO
# ============================================================

def renderizar_tabuleiro(
    estado: EstadoJogo,
) -> None:

    jogadas_da_selecionada = obter_jogadas_da_selecionada(
        estado
    )

    destinos = {
        movimento.destino
        for movimento in jogadas_da_selecionada
    }

    ultima_origem = None
    ultimo_destino = None

    if estado.ultima_jogada is not None:

        ultima_origem = estado.ultima_jogada.origem
        ultimo_destino = estado.ultima_jogada.destino

    for linha in range(TAMANHO_TABULEIRO):

        colunas = st.columns(
            TAMANHO_TABULEIRO,
            gap="small",
        )

        for coluna in range(TAMANHO_TABULEIRO):

            with colunas[coluna]:

                posicao = (
                    linha,
                    coluna,
                )

                if not RegrasDamas.casa_jogavel(
                    linha,
                    coluna
                ):

                    st.markdown(
                        """
                        <div style="
                            height: 58px;
                            border-radius: 5px;
                            background: rgba(0,0,0,0.035);
                        "></div>
                        """,
                        unsafe_allow_html=True,
                    )

                    continue

                peca = Peca(
                    estado.tabuleiro[linha][coluna]
                )

                selecionada = (
                    estado.selecionada == posicao
                )

                destino = posicao in destinos

                ultima = (
                    posicao == ultima_origem
                    or
                    posicao == ultimo_destino
                )

                # ------------------------------------------------
                # ESTADO VISUAL
                # ------------------------------------------------

                if selecionada:

                    tipo = "primary"

                elif destino:

                    tipo = "primary"

                else:

                    tipo = "secondary"

                label = SIMBOLOS[peca]

                if destino and peca == Peca.VAZIO:

                    label = "🟡"

                elif peca == Peca.VAZIO:

                    label = "·"

                # A informação de última jogada não altera
                # a mecânica; serve apenas para o estado visual.

                st.button(
                    label,
                    key=f"casa_{linha}_{coluna}",
                    type=tipo,
                    use_container_width=True,
                    on_click=tratar_clique,
                    args=(
                        estado,
                        linha,
                        coluna,
                    ),
                )


# ============================================================
# INTERFACE — CONTROLES
# ============================================================

def renderizar_controles(
    estado: EstadoJogo,
) -> None:

    st.markdown("---")

    col1, col2 = st.columns(
        [1, 1]
    )

    with col1:

        if st.button(
            "🔄 Nova partida",
            use_container_width=True,
        ):

            reiniciar_jogo()

    with col2:

        total_jogadas = len(
            estado.historico
        )

        st.metric(
            "Jogadas",
            total_jogadas,
        )


# ============================================================
# INTERFACE — HISTÓRICO
# ============================================================

def formatar_posicao(
    posicao: Posicao,
) -> str:

    linha, coluna = posicao

    letra = chr(
        ord("A") + coluna
    )

    numero = TAMANHO_TABULEIRO - linha

    return f"{letra}{numero}"


def renderizar_historico(
    estado: EstadoJogo,
) -> None:

    if not estado.historico:
        return

    with st.expander(
        "📜 Histórico da partida",
        expanded=False,
    ):

        for indice, registro in enumerate(
            estado.historico,
            start=1,
        ):

            origem = formatar_posicao(
                registro.movimento.origem
            )

            destino = formatar_posicao(
                registro.movimento.destino
            )

            simbolo = SIMBOLO_JOGADOR[
                registro.jogador
            ]

            separador = "×" if registro.movimento.eh_captura else "→"

            promocao = " 👑" if registro.promoveu else ""

            st.write(
                f"{indice}. "
                f"{simbolo} "
                f"{origem} {separador} {destino}"
                f"{promocao}"
            )


# ============================================================
# INTERFACE — RODAPÉ
# ============================================================

def renderizar_rodape() -> None:

    st.markdown("---")

    st.caption(
        "Regras implementadas: movimento diagonal, "
        "captura para frente e para trás pelas peças comuns, "
        "movimento livre das damas, captura obrigatória, "
        "capturas múltiplas e promoção."
    )


# ============================================================
# PONTO DE ENTRADA
# ============================================================

def main() -> None:

    st.set_page_config(
        page_title="Jogo de Damas — Regras Brasileiras",
        page_icon="🔴",
        layout="centered",
        initial_sidebar_state="collapsed",
    )

    inserir_estilo()

    inicializar_estado()

    estado: EstadoJogo = (
        st.session_state.estado
    )

    renderizar_cabecalho(
        estado
    )

    renderizar_tabuleiro(
        estado
    )

    renderizar_controles(
        estado
    )

    renderizar_historico(
        estado
    )

    renderizar_rodape()


# ============================================================
# EXECUÇÃO
# ============================================================

if __name__ == "__main__":
    main()
