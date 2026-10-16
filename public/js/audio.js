// Gerador e Reprodutor dos Sons Oficiais da Urna Eletrônica via Web Audio API
class UrnaAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Som curto ao teclar cada número ("Bip")
  playKeyBeep() {
    if (!this.enabled) return;
    this.init();
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // 880Hz (A5)

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Som inconfundível do CONFIRMA do TSE ("Pi-li-li-liim")
  playConfirmaSound() {
    if (!this.enabled) return;
    this.init();

    const now = this.ctx.currentTime;
    
    // As 4 notas características do arpeggio de encerramento da urna do TSE
    const notes = [
      { freq: 784, time: 0.00, dur: 0.08 },  // Sol 5
      { freq: 987, time: 0.08, dur: 0.08 },  // Si 5
      { freq: 1175, time: 0.16, dur: 0.08 }, // Ré 6
      { freq: 1568, time: 0.24, dur: 0.85 }  // Sol 6 (sustentado e triunfante)
    ];

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle'; // Onda triangular dá o timbre idêntico ao sintetizador da urna
      osc.frequency.setValueAtTime(n.freq, now + n.time);

      gain.gain.setValueAtTime(0.25, now + n.time);
      if (n.dur > 0.2) {
        gain.gain.setValueAtTime(0.25, now + n.time + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
      } else {
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + n.time);
      osc.stop(now + n.time + n.dur);
    });
  }

  // Som de erro / Corrige
  playErrorSound() {
    if (!this.enabled) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Som especial para presentes (Gifts)
  playGiftSound() {
    if (!this.enabled) return;
    this.init();

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // Acorde Dó Maior animado
    
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + (idx * 0.05));

      gain.gain.setValueAtTime(0.18, now + (idx * 0.05));
      gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.05) + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + (idx * 0.05));
      osc.stop(now + (idx * 0.05) + 0.3);
    });
  }
}

window.urnaAudio = new UrnaAudio();
