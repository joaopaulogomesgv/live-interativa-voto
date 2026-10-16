const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Estado do Jogo
const gameState = {
  tiktokUsername: '',
  connected: false,
  roundDuration: 180, // 3 minutos por padrão
  timer: 180,
  isTimerRunning: true,
  candidate1: {
    name: 'CANDIDATO A',
    number: '13',
    party: 'PARTIDO A',
    color: '#ef4444', // Vermelho
    photo: '/assets/candidate1.png',
    votes: 0
  },
  candidate2: {
    name: 'CANDIDATO B',
    number: '22',
    party: 'PARTIDO B',
    color: '#22c55e', // Verde
    photo: '/assets/candidate2.png',
    votes: 0
  },
  giftsConfig: {
    rose: { name: 'Rosa', votes: 10 },
    fingerHeart: { name: 'Coração', votes: 20 },
    doughnut: { name: 'Rosquinha', votes: 50 },
    perfume: { name: 'Perfume', votes: 100 },
    cap: { name: 'Boné', votes: 200 },
    weights: { name: 'Haltere', votes: 15 },
    default: { name: 'Outros', votes: 25 }
  },
  chatVoteWeight: 1,
  likeVoteWeight: 1 // a cada X likes ou 1 voto a cada pacote
};

let tiktokLiveConnection = null;
let timerInterval = null;

// Loop do Temporizador
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameState.isTimerRunning && gameState.timer > 0) {
      gameState.timer--;
      io.emit('timer_update', { timer: gameState.timer });
      if (gameState.timer === 0) {
        // Fim de rodada
        determineWinner();
      }
    }
  }, 1000);
}

function determineWinner() {
  let winner = null;
  if (gameState.candidate1.votes > gameState.candidate2.votes) {
    winner = gameState.candidate1;
  } else if (gameState.candidate2.votes > gameState.candidate1.votes) {
    winner = gameState.candidate2;
  } else {
    winner = { name: 'EMPATE', number: '--' };
  }
  io.emit('round_winner', {
    winner,
    candidate1: gameState.candidate1,
    candidate2: gameState.candidate2
  });
}

function restartRound() {
  gameState.timer = gameState.roundDuration;
  gameState.candidate1.votes = 0;
  gameState.candidate2.votes = 0;
  gameState.isTimerRunning = true;
  io.emit('game_state', gameState);
}

// Processador de Voto
function processVote(targetCandidateNum, votesCount, senderName = 'Eleitor', avatar = '', isGift = false, giftName = '') {
  const numStr = String(targetCandidateNum).trim();
  let candidate = null;

  if (numStr === String(gameState.candidate1.number)) {
    candidate = gameState.candidate1;
  } else if (numStr === String(gameState.candidate2.number)) {
    candidate = gameState.candidate2;
  }

  if (candidate) {
    candidate.votes += votesCount;
    // Emite o evento de voto para a urna animar e atualizar o placar
    io.emit('new_vote', {
      candidateNumber: candidate.number,
      candidateName: candidate.name,
      party: candidate.party,
      photo: candidate.photo,
      votesAdded: votesCount,
      totalVotesC1: gameState.candidate1.votes,
      totalVotesC2: gameState.candidate2.votes,
      senderName,
      avatar,
      isGift,
      giftName
    });
  }
}

// Conectar ao TikTok
function connectToTikTok(username) {
  if (tiktokLiveConnection) {
    try {
      tiktokLiveConnection.disconnect();
    } catch (e) {
      console.log('Desconectando anterior...', e.message);
    }
  }

  const cleanUsername = username.replace('@', '').trim();
  gameState.tiktokUsername = cleanUsername;

  tiktokLiveConnection = new WebcastPushConnection(cleanUsername, {
    processInitialData: false,
    enableExtendedGiftInfo: true,
    requestPollingIntervalMs: 1000
  });

  tiktokLiveConnection.connect()
    .then(state => {
      gameState.connected = true;
      console.log(`[TikTok] Conectado à live de: @${cleanUsername} (Room ID: ${state.roomId})`);
      io.emit('tiktok_status', { connected: true, username: cleanUsername, message: 'Conectado com sucesso!' });
    })
    .catch(err => {
      gameState.connected = false;
      console.error(`[TikTok] Falha ao conectar em @${cleanUsername}:`, err.message);
      io.emit('tiktok_status', { connected: false, username: cleanUsername, message: `Erro ao conectar: ${err.message}` });
    });

  // Escutar Comentários do Chat
  tiktokLiveConnection.on('chat', data => {
    const comment = data.comment.trim();
    const c1Num = String(gameState.candidate1.number);
    const c2Num = String(gameState.candidate2.number);

    // Se o comentário bater exatamente com o número ou contiver com destaque
    if (comment === c1Num || comment.startsWith(c1Num + ' ') || comment.endsWith(' ' + c1Num)) {
      processVote(c1Num, gameState.chatVoteWeight, data.nickname, data.profilePictureUrl);
    } else if (comment === c2Num || comment.startsWith(c2Num + ' ') || comment.endsWith(' ' + c2Num)) {
      processVote(c2Num, gameState.chatVoteWeight, data.nickname, data.profilePictureUrl);
    }
  });

  // Escutar Presentes (Gifts)
  tiktokLiveConnection.on('gift', data => {
    // data.giftType: 1 = presente que acumula combo, etc.
    if (data.giftType === 1 && !data.repeatEnd) {
      // Combo em andamento - podemos esperar finalizar ou somar a cada repetição
    }
    
    // Mapeamento de presentes:
    // Uma rosa (giftId 5655) ou pelo nome
    const giftName = data.giftName.toLowerCase();
    const count = data.repeatCount || 1;
    
    // Regra clássica de live: 
    // Rosa = Voto no Candidato 1, Haltere/Outro = Voto no Candidato 2 (ou configurável)
    // Vamos verificar se o presente foi configurado para C1 ou C2, ou se o usuário escolheu no painel
    let voteFor = null;
    let votesAwarded = 10 * count;

    if (giftName.includes('rose') || giftName.includes('rosa')) {
      voteFor = gameState.candidate1.number;
      votesAwarded = (gameState.giftsConfig.rose?.votes || 10) * count;
    } else {
      // Outros presentes dão voto pro Candidato 2 ou proporcional
      voteFor = gameState.candidate2.number;
      votesAwarded = (gameState.giftsConfig.fingerHeart?.votes || 15) * count;
    }

    if (voteFor) {
      processVote(voteFor, votesAwarded, data.nickname, data.profilePictureUrl, true, data.giftName);
    }
  });

  // Escutar Curtidas (Likes)
  let accumulatedLikes = 0;
  tiktokLiveConnection.on('like', data => {
    accumulatedLikes += data.likeCount || 1;
    // A cada 15 likes, distribui 1 voto ou atualiza
    if (accumulatedLikes >= 15) {
      accumulatedLikes = 0;
      io.emit('likes_trigger', { count: data.likeCount, total: data.totalLikeCount });
    }
  });

  tiktokLiveConnection.on('disconnected', () => {
    gameState.connected = false;
    io.emit('tiktok_status', { connected: false, username: cleanUsername, message: 'Live desconectada.' });
  });

  tiktokLiveConnection.on('error', err => {
    console.error('[TikTok Event Error]', err);
  });
}

// Sockets e Endpoints
io.on('connection', socket => {
  // Envia estado completo ao conectar novo cliente
  socket.emit('game_state', gameState);

  // Painel de Admin solicita conexão TikTok
  socket.on('connect_tiktok', ({ username }) => {
    if (username) connectToTikTok(username);
  });

  socket.on('disconnect_tiktok', () => {
    if (tiktokLiveConnection) {
      tiktokLiveConnection.disconnect();
      gameState.connected = false;
      io.emit('tiktok_status', { connected: false, message: 'Desconectado manualmente' });
    }
  });

  // Atualizar configurações dos candidatos
  socket.on('update_candidates', data => {
    if (data.candidate1) Object.assign(gameState.candidate1, data.candidate1);
    if (data.candidate2) Object.assign(gameState.candidate2, data.candidate2);
    io.emit('game_state', gameState);
  });

  // Atualizar regras de tempo
  socket.on('update_timer_settings', ({ duration }) => {
    gameState.roundDuration = parseInt(duration, 10) || 180;
    gameState.timer = gameState.roundDuration;
    io.emit('game_state', gameState);
  });

  // Reiniciar rodada
  socket.on('restart_round', () => {
    restartRound();
  });

  // Pausar/Retomar timer
  socket.on('toggle_timer', () => {
    gameState.isTimerRunning = !gameState.isTimerRunning;
    io.emit('timer_toggle', { isTimerRunning: gameState.isTimerRunning });
  });

  // Voto simulado (para testes locais sem precisar de live aberta)
  socket.on('simulate_vote', ({ candidateNumber, votes, senderName, isGift, giftName }) => {
    processVote(candidateNumber, votes || 1, senderName || 'Testador', '', isGift, giftName);
  });
});

// Inicia o timer
startTimer();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`   LIVE INTERATIVA - URNA ELETRÔNICA DO TIKTOK     `);
  console.log(`====================================================`);
  console.log(`-> Overlay da Live (OBS / Studio): http://localhost:${PORT}`);
  console.log(`-> Painel de Controle (Admin):     http://localhost:${PORT}/admin.html`);
  console.log(`====================================================`);
});
