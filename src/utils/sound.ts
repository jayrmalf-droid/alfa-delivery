// Synthesizes high-quality audio notifications using Web Audio API
// No external mp3/wav files required, zero latency, customizable duration and 6 sound types

export interface SoundTypeConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  previewNote: string;
}

export const SOUND_TYPES: SoundTypeConfig[] = [
  {
    id: 'bell',
    name: 'Campainha Delivery (Clássica)',
    description: 'Três notas cristalinas ascendentes com decaimento suave estilo iFood',
    category: 'Suave & Elegante',
    previewNote: 'Dó-Mi-Sol'
  },
  {
    id: 'alarm',
    name: 'Alarme de Cozinha (Pulsante)',
    description: 'Dois beeps enérgicos e assertivos para ambientes barulhentos',
    category: 'Alta Visibilidade',
    previewNote: 'Bip-Bip Urgente'
  },
  {
    id: 'digital',
    name: 'Beep Digital Triplo',
    description: 'Três bipes eletrônicos de alta frequência estilo terminal PDV',
    category: 'Tecnológico',
    previewNote: 'Tri-Bip POS'
  },
  {
    id: 'marimba',
    name: 'Marimba Harmônica (Melódica)',
    description: 'Acorde acústico de 4 notas alegres com ressonância de madeira',
    category: 'Musical',
    previewNote: 'Arpejo Marimba'
  },
  {
    id: 'cash',
    name: 'Caixa Registradora (Cha-Ching)',
    description: 'Abertura de gaveta e tilintar metálico brilhante de moedas',
    category: 'Vendas & Lucro',
    previewNote: 'Cha-Ching!'
  },
  {
    id: 'siren',
    name: 'Sirene de Urgência',
    description: 'Modulação alternada em sweep contínuo para atenção imediata',
    category: 'Alerta Máximo',
    previewNote: 'Sirene Contínua'
  }
];

// Active playback state tracker
let activeCtx: AudioContext | null = null;
let activeLoopTimer: any = null;
let activeStopTimer: any = null;
let isCurrentlyPlaying = false;

export const isOrderSoundPlaying = (): boolean => isCurrentlyPlaying;

export const stopOrderSound = () => {
  if (activeLoopTimer) {
    clearTimeout(activeLoopTimer);
    activeLoopTimer = null;
  }
  if (activeStopTimer) {
    clearTimeout(activeStopTimer);
    activeStopTimer = null;
  }
  if (activeCtx) {
    try {
      activeCtx.close();
    } catch {
      // ignore
    }
    activeCtx = null;
  }
  isCurrentlyPlaying = false;
};

// Internal sound synthesizers
const playSoundSingleIteration = (ctx: AudioContext, type: string, volume: number): number => {
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(1, volume)), now);
  masterGain.connect(ctx.destination);

  switch (type) {
    case 'alarm': {
      // Kitchen pulsante (2 beeps: 880Hz and 1174Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.18);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1174.66, now + 0.22);
      gain2.gain.setValueAtTime(0.35, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.45);

      return 0.7; // cycle duration
    }

    case 'digital': {
      // Tech terminal beep (3 fast pure sine bursts: 987, 1318, 1760 Hz)
      const freqs = [987.77, 1318.51, 1760.00];
      freqs.forEach((freq, idx) => {
        const t = now + idx * 0.11;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.08);
      });
      return 0.6;
    }

    case 'marimba': {
      // Warm marimba acoustic chord (C5, G5, E5, C6)
      const notes = [523.25, 783.99, 659.25, 1046.50];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.45);
      });
      return 0.85;
    }

    case 'cash': {
      // Cash drawer "clink" + coin ring
      // Drawer mechanical click
      const oscClick = ctx.createOscillator();
      const gainClick = ctx.createGain();
      oscClick.type = 'triangle';
      oscClick.frequency.setValueAtTime(140, now);
      oscClick.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      gainClick.gain.setValueAtTime(0.6, now);
      gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      oscClick.connect(gainClick);
      gainClick.connect(masterGain);
      oscClick.start(now);
      oscClick.stop(now + 0.08);

      // Cha-Ching bright bells (2100Hz, 3136Hz)
      const bell1 = ctx.createOscillator();
      const gainB1 = ctx.createGain();
      bell1.type = 'sine';
      bell1.frequency.setValueAtTime(2093, now + 0.08);
      gainB1.gain.setValueAtTime(0.4, now + 0.08);
      gainB1.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      bell1.connect(gainB1);
      gainB1.connect(masterGain);
      bell1.start(now + 0.08);
      bell1.stop(now + 0.7);

      const bell2 = ctx.createOscillator();
      const gainB2 = ctx.createGain();
      bell2.type = 'sine';
      bell2.frequency.setValueAtTime(3135.96, now + 0.14);
      gainB2.gain.setValueAtTime(0.35, now + 0.14);
      gainB2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      bell2.connect(gainB2);
      gainB2.connect(masterGain);
      bell2.start(now + 0.14);
      bell2.stop(now + 0.8);

      return 0.95;
    }

    case 'siren': {
      // Frequency sweep siren
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.linearRampToValueAtTime(1150, now + 0.25);
      osc.frequency.linearRampToValueAtTime(650, now + 0.5);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.55);

      return 0.65;
    }

    case 'bell':
    default: {
      // Classic 3-tone delivery bell (C5 -> E5 -> G5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.6);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.15);
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.8);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(783.99, now + 0.3);
      gain3.gain.setValueAtTime(0.4, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc3.connect(gain3);
      gain3.connect(masterGain);
      osc3.start(now + 0.3);
      osc3.stop(now + 1.2);

      return 1.3;
    }
  }
};

/**
 * Plays new order sound with specified type, duration in seconds, and volume.
 * Loops automatically until durationSeconds has elapsed or stopOrderSound() is called.
 */
export const playNewOrderSound = (
  soundType: string = 'bell',
  durationSeconds: number = 5,
  volume: number = 0.85
) => {
  stopOrderSound();

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    activeCtx = new AudioContextClass();
    isCurrentlyPlaying = true;

    const startTime = Date.now();
    const durationMs = Math.max(1, durationSeconds) * 1000;

    const playLoop = () => {
      if (!isCurrentlyPlaying || !activeCtx) return;

      const elapsed = Date.now() - startTime;
      if (elapsed >= durationMs) {
        stopOrderSound();
        return;
      }

      const cycleDuration = playSoundSingleIteration(activeCtx, soundType, volume);
      const nextDelayMs = Math.max(300, cycleDuration * 1000);

      activeLoopTimer = setTimeout(() => {
        playLoop();
      }, nextDelayMs);
    };

    playLoop();

    // Safety timeout to ensure sound stops exactly at durationSeconds
    activeStopTimer = setTimeout(() => {
      stopOrderSound();
    }, durationMs + 200);

  } catch (e) {
    console.warn('Audio could not play due to user interaction policy or unsupported browser context', e);
    isCurrentlyPlaying = false;
  }
};
