// Controlador da Urna Eletrônica e da Mãozinha Animada
class UrnaController {
  constructor() {
    this.voteQueue = [];
    this.isAnimating = false;
    this.handEl = document.getElementById('hand-pointer');
    this.urnaScreen = document.getElementById('urna-screen');
    this.digitBox1 = document.getElementById('digit-1');
    this.digitBox2 = document.getElementById('digit-2');
    this.candNameEl = document.getElementById('screen-cand-name');
    this.candPartyEl = document.getElementById('screen-cand-party');
    this.screenPhotoBox = document.getElementById('screen-photo-box');
    this.screenPhotoImg = document.getElementById('screen-photo-img');
    this.screenEndState = document.getElementById('screen-end-state');
    
    // Posição de repouso da mão (fora do teclado, embaixo à direita)
    this.restingPosition = { x: 500, y: 500 };
  }

  // Adiciona um voto na fila para animação na urna
  enqueueVote(voteData) {
    this.voteQueue.push(voteData);
    if (!this.isAnimating) {
      this.processNextInQueue();
    }
  }

  async processNextInQueue() {
    if (this.voteQueue.length === 0) {
      this.isAnimating = false;
      this.resetScreen();
      this.moveHandToRest();
      return;
    }

    this.isAnimating = true;
    const currentVote = this.voteQueue.shift();

    // Se houver muitos votos na fila, acelera a velocidade da animação para não atrasar a live
    const speedMultiplier = this.voteQueue.length > 5 ? 0.5 : (this.voteQueue.length > 2 ? 0.75 : 1);

    await this.animateVote(currentVote, speedMultiplier);

    // Pequena pausa antes do próximo voto da fila
    setTimeout(() => {
      this.processNextInQueue();
    }, 200 * speedMultiplier);
  }

  // Reseta a tela para o estado inicial esperando voto
  resetScreen() {
    this.digitBox1.textContent = '';
    this.digitBox2.textContent = '';
    this.digitBox1.classList.add('blink');
    this.digitBox2.classList.remove('blink');
    this.candNameEl.textContent = '---';
    this.candPartyEl.textContent = '---';
    this.screenPhotoBox.classList.remove('show');
    this.screenPhotoImg.src = '';
    this.screenEndState.classList.remove('visible');
  }

  // Animação completa de um voto sendo digitado na urna
  async animateVote(vote, speed) {
    const numStr = String(vote.candidateNumber);
    const d1 = numStr[0] || '1';
    const d2 = numStr[1] || '3';

    this.resetScreen();

    // 1. Dedo vai até o primeiro dígito e pressiona
    await this.pressKey('key-' + d1, 240 * speed);
    this.digitBox1.textContent = d1;
    this.digitBox1.classList.remove('blink');
    this.digitBox2.classList.add('blink');
    window.urnaAudio.playKeyBeep();

    await this.sleep(120 * speed);

    // 2. Dedo vai até o segundo dígito e pressiona
    await this.pressKey('key-' + d2, 240 * speed);
    this.digitBox2.textContent = d2;
    this.digitBox2.classList.remove('blink');
    window.urnaAudio.playKeyBeep();

    // Mostra dados do candidato na tela LCD
    this.candNameEl.textContent = vote.candidateName || 'CANDIDATO';
    this.candPartyEl.textContent = vote.party || 'PARTIDO';
    if (vote.photo) {
      this.screenPhotoImg.src = vote.photo;
      this.screenPhotoBox.classList.add('show');
    }

    await this.sleep(220 * speed);

    // 3. Dedo vai até a tecla verde "CONFIRMA" e pressiona
    await this.pressKey('key-confirma', 280 * speed);
    
    // Toca o clássico "pi-li-li-liim" da urna!
    window.urnaAudio.playConfirmaSound();

    // Tela de FIM clássica da urna do TSE
    this.screenEndState.classList.add('visible');

    await this.sleep(500 * speed);
  }

  // Move o dedo até a tecla especificada e aciona o efeito de clique
  pressKey(keyId, travelDuration) {
    return new Promise(resolve => {
      const keyEl = document.getElementById(keyId);
      if (!keyEl || !this.handEl) {
        resolve();
        return;
      }

      const urnaContainer = document.querySelector('.stream-container');
      const containerRect = urnaContainer.getBoundingClientRect();
      const keyRect = keyEl.getBoundingClientRect();

      // Ponto de toque: ponta do dedo indicador do SVG
      // A ponta do dedo no hand_finger.svg fica aproximadamente em x: 35px, y: 25px
      const targetX = (keyRect.left + keyRect.width / 2) - containerRect.left - 55;
      const targetY = (keyRect.top + keyRect.height / 2) - containerRect.top - 25;

      this.handEl.style.transition = `transform ${travelDuration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
      this.handEl.style.transform = `translate(${targetX}px, ${targetY}px)`;

      setTimeout(() => {
        // Efeito de pressionar botão
        keyEl.classList.add('active-press');
        this.handEl.classList.add('pressing');

        setTimeout(() => {
          keyEl.classList.remove('active-press');
          this.handEl.classList.remove('pressing');
          resolve();
        }, 110);
      }, travelDuration);
    });
  }

  moveHandToRest() {
    if (this.handEl) {
      this.handEl.style.transition = 'transform 0.4s ease-out';
      this.handEl.style.transform = `translate(420px, 600px)`;
    }
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

window.urnaController = new UrnaController();
