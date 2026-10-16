# 🗳️ Urna Eletrônica Interativa para TikTok Live

Jogo interativo de votação e disputa eleitoral em tempo real para transmissões no **TikTok Live**, totalmente integrado com a urna eletrônica brasileira oficial do TSE.

---

## ✨ Funcionalidades

- **Urna Eletrônica Realista:** Layout fiel à urna do TSE, tela LCD verde com scanlines, foto do candidato e botões *Branco*, *Corrige* e *Confirma*.
- **Mãozinha com Dedo Animado:** Animação física do dedo indicador teclando os números e pressionando o botão verde *Confirma*.
- **Sons Oficiais:** Som de bipe a cada tecla digitada e o clássico *"pi-li-li-liim"* da confirmação gerados via Web Audio API com latência zero.
- **Placar & Cabo de Guerra:** Cálculo dinâmico de votos e porcentagens (`%`), com barra de disputa proporcional em tempo real.
- **Integração TikTok Live:**
  - **Chat:** Comentários com o número do candidato (ex: `13` ou `22`) viram votos automáticos.
  - **Presentes (Gifts):** Envio de Rosas ou Corações gera múltiplos votos com efeitos visuais e sonoros comemorativos.
- **Painel de Controle do Streamer (`/admin.html`):**
  - Conexão com o TikTok apenas informando o `@usuario` (sem necessidade de chaves/tokens complexos).
  - Personalização de candidatos (nome, número, partido, cor e foto).
  - Ajuste de tempo da rodada e botões de simulação para testes antes da transmissão.

---

## 🚀 Como Executar

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/joaopaulogomesgv/live-voto.git
cd live-voto
npm install
```

### 2. Iniciar o Servidor
```bash
npm start
```

O servidor estará disponível em:
- **Overlay do Jogo (para OBS / TikTok Live Studio):** [http://localhost:3000](http://localhost:3000)
- **Painel de Controle do Streamer:** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 🎬 Como Transmitir no TikTok LIVE Studio

1. Abra o **TikTok LIVE Studio** e inicie sua transmissão ao vivo.
2. Clique em **Adicionar Fonte (+)** e selecione **Link / Navegador (Browser Source)**.
3. Insira a URL: `http://localhost:3000`
4. Configure a resolução vertical (ex: `1080x1920`).
5. No painel [http://localhost:3000/admin.html](http://localhost:3000/admin.html), insira o seu `@usuario` do TikTok e clique em **Conectar**.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js & Express**
- **Socket.IO** (comunicação em tempo real)
- **tiktok-live-connector** (integração pública com eventos de chat e presentes do TikTok)
- **Web Audio API** (síntese sonora autêntica da urna sem dependências de arquivos de áudio externos)
- **HTML5 / CSS3 / JavaScript Vanilla**
