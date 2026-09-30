import streamlit as st

# Configuração da página do Streamlit
st.set_page_config(page_title="Jogo de Damas", page_icon="🔴", layout="centered")

# Inicialização do Estado do Jogo (Tabuleiro 8x8)
# 0 = Casa vazia (clara ou não jogável)
# 1 = Peça Vermelha (Jogador 1)
# 2 = Peça Branca (Jogador 2)
# 3 = Dama Vermelha
# 4 = Dama Branca
def inicializar_tabuleiro():
    tabuleiro = [[0 for _ in range(8)] for _ in range(8)]
    
    # Posicionar peças pretas/brancas (linhas 0 a 2)
    for linha in range(3):
        for coluna in range(8):
            if (linha + coluna) % 2 == 1:
                tabuleiro[linha][coluna] = 2

    # Posicionar peças vermelhas (linhas 5 a 7)
    for linha in range(5, 8):
        for coluna in range(8):
            if (linha + coluna) % 2 == 1:
                tabuleiro[linha][coluna] = 1
                
    return tabuleiro

if "tabuleiro" not in st.session_state:
    st.session_state.tabuleiro = inicializar_tabuleiro()
if "turno" not in st.session_state:
    st.session_state.turno = 1  # 1 para Vermelho, 2 para Branco
if "selecionada" not in st.session_state:
    st.session_state.selecionada = None  # (linha, coluna) da peça selecionada

st.title("🔴 Jogo de Damas em Python & Streamlit ⚪")
st.markdown("---")

# Painel de Status
col_status1, col_status2, col_status3 = st.columns(3)
with col_status1:
    turno_nome = "Vermelho (1)" if st.session_state.turno == 1 else "Branco (2)"
    st.info(f"Turno de: {turno_nome}")
with col_status2:
    if st.button("🔄 Reiniciar Jogo"):
        st.session_state.tabuleiro = inicializar_tabuleiro()
        st.session_state.turno = 1
        st.session_state.selecionada = None
        st.rerun()

# Renderização do Tabuleiro
st.write("### Tabuleiro")
tabuleiro = st.session_state.tabuleiro

for r in range(8):
    cols = st.columns(8)
    for c in range(8):
        with cols[c]:
            peca = tabuleiro[r][c]
            
            # Definir a cor visual da casa (padrão tabuleiro de damas)
            is_casa_jogavel = (r + c) % 2 == 1
            
            # Aparência visual da peça
            label = ""
            if peca == 1:
                label = "🔴"
            elif peca == 2:
                label = "⚪"
            elif peca == 3:
                label = "👑🔴"
            elif peca == 4:
                label = "👑⚪"
            else:
                label = "" if is_casa_jogavel else " "

            # Identificar se esta casa está selecionada
            selected = st.session_state.selecionada == (r, c)
            btn_type = "primary" if selected else "secondary"

            # Ação de clique na casa do tabuleiro
            if is_casa_jogavel:
                if st.button(label if label else "·", key=f"cell_{r}_{c}", use_container_width=True):
                    # Se nenhuma peça foi selecionada ainda, tentar selecionar
                    if st.session_state.selecionada is None:
                        if peca != 0:
                            # Verificar se a peça pertence ao jogador do turno
                            if (st.session_state.turno == 1 and peca in [1, 3]) or \
                               (st.session_state.turno == 2 and peca in [2, 4]):
                                st.session_state.selecionada = (r, c)
                                st.rerun()
                    else:
                        # Já existe uma peça selecionada, tentar mover para (r, c)
                        sr, sc = st.session_state.selecionada
                        
                        # Movimento simples válido (diagonal de 1 passo)
                        # Jogador 1 (Vermelho) move para cima (-1), Jogador 2 (Branco) move para baixo (+1)
                        direcoes_validas = []
                        peca_origem = tabuleiro[sr][sc]
                        
                        if peca_origem in [1, 3]: # Vermelho ou Dama
                            direcoes_validas.append(-1)
                        if peca_origem in [2, 4] or peca_origem == 3 or peca_origem == 4: # Branco ou Dama
                            direcoes_validas.append(1)

                        movimento_valido = False
                        
                        # Checar passo simples
                        if abs(r - sr) == 1 and abs(c - sc) == 1:
                            if peca == 0:
                                if peca_origem in [3, 4]: # Dama move para frente e para trás
                                    movimento_valido = True
                                elif (r - sr) in direcoes_validas:
                                    movimento_valido = True

                        # Checar captura (salto de 2 casas)
                        captura_valida = False
                        if abs(r - sr) == 2 and abs(c - sc) == 2 and peca == 0:
                            mid_r = (r + sr) // 2
                            mid_c = (c + sc) // 2
                            peca_meio = tabuleiro[mid_r][mid_c]
                            
                            # Verificar se há peça adversária no meio
                            if st.session_state.turno == 1 and peca_meio in [2, 4]:
                                captura_valida = True
                            elif st.session_state.turno == 2 and peca_meio in [1, 3]:
                                captura_valida = True
                                
                            if captura_valida:
                                # Remover a peça capturada
                                tabuleiro[mid_r][mid_c] = 0
                                movimento_valido = True

                        if movimento_valido:
                            # Executar o movimento
                            tabuleiro[r][c] = peca_origem
                            tabuleiro[sr][sc] = 0
                            
                            # Promover a Dama se chegar na extremidade oposta
                            if peca_origem == 1 and r == 0:
                                tabuleiro[r][c] = 3
                            elif peca_origem == 2 and r == 7:
                                tabuleiro[r][c] = 4

                            # Trocar o turno
                            st.session_state.turno = 2 if st.session_state.turno == 1 else 1
                            st.session_state.selecionada = None
                            st.rerun()
                        else:
                            # Se clicar na mesma peça, desmarca; se clicar em outra própria, muda a seleção
                            if peca != 0 and ((st.session_state.turno == 1 and peca in [1, 3]) or \
                                              (st.session_state.turno == 2 and peca in [2, 4])):
                                st.session_state.selecionada = (r, c)
                                st.rerun()
                            else:
                                st.session_state.selecionada = None
                                st.rerun()
            else:
                # Casas não jogáveis (fundo cinza/vazio)
                st.button(" ", key=f"empty_{r}_{c}", disabled=True, use_container_width=True)

st.markdown("---")
st.markdown("💡 **Como jogar:** Clique na sua peça para selecioná-la (ela ficará destacada) e depois clique na casa vazia para onde deseja movê-la.")
