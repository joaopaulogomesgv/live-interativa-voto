// Cliente Principal do Overlay da Live
const socket = io();

// Elementos da Interface
const timerEl = document.getElementById('round-timer');
const c1NumberEl = document.getElementById('c1-number');
const c2NumberEl = document.getElementById('c2-number');
const c1PercentEl = document.getElementById('c1-percent');
const c2PercentEl = document.getElementById('c2-percent');
const c1NameEl = document.getElementById('c1-name');
const c2NameEl = document.getElementById('c2-name');
const c1AvatarEl = document.getElementById('c1-avatar');
const c2AvatarEl = document.getElementById('c2-avatar');
const c1VotesTag = document.getElementById('c1-votes-tag');
const c2VotesTag = document.getElementById('c2-votes-tag');
const tugBarC1 = document.getElementById('tug-bar-c1');
const tugBarC2 = document.getElementById('tug-bar-c2');
const votesFeed = document.getElementById('votes-feed');
const winnerModal = document.getElementById('winner-modal');
const winnerNameEl = document.getElementById('winner-name');
const winnerNumberEl = document.getElementById('winner-number');
const winnerRestartTimerEl = document.getElementById('winner-restart-timer');

let localState = {
  c1Votes: 0,
  c2Votes: 0
};

// Formatar segundos em MM:SS
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Atualizar Placar e Barra de Disputa
function updateScoreboard(c1Votes, c2Votes) {
  localState.c1Votes = c1Votes;
  localState.c2Votes = c2Votes;

  const total = c1Votes + c2Votes;
  let p1 = 50.0;
  let p2 = 50.0;

  if (total > 0) {
    p1 = (c1Votes / total) * 100;
    p2 = (c2Votes / total) * 100;
  }

  c1PercentEl.textContent = `${p1.toFixed(1).replace('.', ',')}%`;
  c2PercentEl.textContent = `${p2.toFixed(1).replace('.', ',')}%`;

  c1VotesTag.textContent = `${c1Votes} votos`;
  c2VotesTag.textContent = `${c2Votes} votos`;

  tugBarC1.style.width = `${p1}%`;
  tugBarC2.style.width = `${p2}%`;
}

// Adicionar mensagem no feed flutuante
function addFeedItem(vote) {
  const item = document.createElement('div');
  const isC1 = String(vote.candidateNumber) === c1NumberEl.textContent;
  item.className = `feed-item ${isC1 ? 'c1' : 'c2'} ${vote.isGift ? 'gift' : ''}`;

  if (vote.isGift) {
    item.innerHTML = `🎁 <b>${vote.senderName}</b> enviou <b>${vote.giftName}</b> (+${vote.votesAdded} votos para ${vote.candidateNumber}!)`;
  } else {
    item.innerHTML = `💬 <b>${vote.senderName}</b> votou <b>${vote.candidateNumber}</b> (+${vote.votesAdded})`;
  }

  votesFeed.prepend(item);

  // Limita feed aos últimos 4 itens
  while (votesFeed.children.length > 4) {
    votesFeed.removeChild(votesFeed.lastChild);
  }
}

// Exibir vencedor da rodada
function showWinner(winner) {
  winnerNameEl.textContent = winner.name;
  winnerNumberEl.textContent = winner.number !== '--' ? `NÚMERO ${winner.number}` : 'EMPATE TÉCNICO!';
  winnerModal.classList.add('active');

  let restartSec = 6;
  winnerRestartTimerEl.textContent = `Nova rodada em ${restartSec}s...`;

  const countdown = setInterval(() => {
    restartSec--;
    if (restartSec <= 0) {
      clearInterval(countdown);
      winnerModal.classList.remove('active');
      socket.emit('restart_round');
    } else {
      winnerRestartTimerEl.textContent = `Nova rodada em ${restartSec}s...`;
    }
  }, 1000);
}

// SOCKET.IO LISTENERS
socket.on('game_state', state => {
  // Dados Candidato 1
  c1NumberEl.textContent = state.candidate1.number;
  c1NameEl.textContent = state.candidate1.name;
  if (state.candidate1.photo) c1AvatarEl.src = state.candidate1.photo;

  // Dados Candidato 2
  c2NumberEl.textContent = state.candidate2.number;
  c2NameEl.textContent = state.candidate2.name;
  if (state.candidate2.photo) c2AvatarEl.src = state.candidate2.photo;

  // Cores
  document.documentElement.style.setProperty('--c1-color', state.candidate1.color || '#ef4444');
  document.documentElement.style.setProperty('--c2-color', state.candidate2.color || '#22c55e');

  // Timer
  timerEl.textContent = formatTime(state.timer);

  // Votos
  updateScoreboard(state.candidate1.votes, state.candidate2.votes);
});

socket.on('timer_update', data => {
  timerEl.textContent = formatTime(data.timer);
});

socket.on('new_vote', vote => {
  // Atualiza placar imediatamente
  updateScoreboard(vote.totalVotesC1, vote.totalVotesC2);

  // Alimenta feed
  addFeedItem(vote);

  // Se for presente, toca som animado
  if (vote.isGift) {
    window.urnaAudio.playGiftSound();
  }

  // Envia para a urna eletrônica digitar
  window.urnaController.enqueueVote(vote);
});

socket.on('round_winner', data => {
  showWinner(data.winner);
});

// Desbloquear AudioContext no primeiro clique (política de navegadores modernos)
window.addEventListener('click', () => {
  window.urnaAudio.init();
}, { once: true });

// Atalhos de teclado para teste rápido (1 = Voto no Cand 1, 2 = Voto no Cand 2, R = Rosa)
window.addEventListener('keydown', e => {
  if (e.key === '1') {
    socket.emit('simulate_vote', { candidateNumber: c1NumberEl.textContent, votes: 1, senderName: 'Chat' });
  } else if (e.key === '2') {
    socket.emit('simulate_vote', { candidateNumber: c2NumberEl.textContent, votes: 1, senderName: 'Chat' });
  } else if (e.key.toLowerCase() === 'r') {
    socket.emit('simulate_vote', { candidateNumber: c1NumberEl.textContent, votes: 10, senderName: 'Fã', isGift: true, giftName: 'Rosa' });
  }
});
