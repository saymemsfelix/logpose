/**
 * Sintetizador Web Audio API para o som de venda (Caixa Registradora / Moedas de Ouro - Ka-Ching!).
 * 100% autônomo, sem depender de download de arquivo externo, funciona em Android, iOS e Desktop.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Toca o som viciante de "Caixa Registradora + Moedas Caindo" (Ka-Ching! 🪙🛎️)
 */
export function playSaleCashSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 1. O "Click / Latch" mecânico da gaveta abrindo
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = "square";
    clickOsc.frequency.setValueAtTime(140, now);
    clickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.04);
    clickGain.gain.setValueAtTime(0.3, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.05);

    // 2. O Sino Principal de Caixa Registradora (Sino Dó Maior - 1318Hz / 2637Hz)
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = "sine";
    bellOsc.frequency.setValueAtTime(1318.51, now + 0.03); // E6
    bellGain.gain.setValueAtTime(0.5, now + 0.03);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellOsc.start(now + 0.03);
    bellOsc.stop(now + 0.7);

    // Harmônico do sino
    const bellHarmonic = ctx.createOscillator();
    const harmGain = ctx.createGain();
    bellHarmonic.type = "sine";
    bellHarmonic.frequency.setValueAtTime(2637.02, now + 0.03); // E7
    harmGain.gain.setValueAtTime(0.25, now + 0.03);
    harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    bellHarmonic.connect(harmGain);
    harmGain.connect(ctx.destination);
    bellHarmonic.start(now + 0.03);
    bellHarmonic.stop(now + 0.55);

    // 3. Cascata de Moedas de Ouro tilintando (Frequências de metal: 1975Hz, 2349Hz, 3136Hz)
    const coins = [
      { time: now + 0.08, freq: 1975.53, gain: 0.35, dur: 0.25 }, // B6
      { time: now + 0.15, freq: 2349.32, gain: 0.4, dur: 0.3 },   // D7
      { time: now + 0.22, freq: 3135.96, gain: 0.45, dur: 0.4 },  // G7
      { time: now + 0.29, freq: 2637.02, gain: 0.35, dur: 0.35 }, // E7
      { time: now + 0.36, freq: 3520.00, gain: 0.3, dur: 0.4 },   // A7
    ];

    coins.forEach((c) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle"; // Som cristalino de metal/moeda
      osc.frequency.setValueAtTime(c.freq, c.time);
      g.gain.setValueAtTime(c.gain, c.time);
      g.gain.exponentialRampToValueAtTime(0.001, c.time + c.dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(c.time);
      osc.stop(c.time + c.dur + 0.05);
    });
  } catch (err) {
    console.warn("Não foi possível reproduzir som de venda:", err);
  }
}

/**
 * Dispara vibração tátil no celular (Padrão triunfante de venda)
 */
export function vibrateSale() {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([150, 80, 150, 80, 300]);
    } catch {
      // Ignora se não for suportado
    }
  }
}

/**
 * Sintetizador de Fala (Text-to-Speech) Ninja's Tracker.
 * Fala em voz alta as vendas, criativo e status de lucro.
 */
export function speakVoice(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }
  try {
    // Cancela falas anteriores pendentes
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1.05; // ritmo dinâmico de aplicativo
    utterance.pitch = 1.05;

    // Tenta encontrar uma voz em Português
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(
      (v) => v.lang.toLowerCase().includes("pt-br") || v.lang.toLowerCase().startsWith("pt")
    );
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Falha ao sintetizar voz:", err);
  }
}
