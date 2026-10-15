/**
 * Synthesizes a subtle, pleasant incoming message chime using the Web Audio API.
 * Uses harmonic soft sine waves with smooth exponential decay.
 * Zero external mp3 assets required, instant and lightweight.
 */
let sharedAudioCtx: AudioContext | null = null;

export function playIncomingChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioContextClass();
    }

    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }

    const now = sharedAudioCtx.currentTime;

    // Tone 1: 587.33 Hz (D5) gentle lead-in
    const osc1 = sharedAudioCtx.createOscillator();
    const gain1 = sharedAudioCtx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(sharedAudioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: 1174.66 Hz (D6) harmonic chime
    const osc2 = sharedAudioCtx.createOscillator();
    const gain2 = sharedAudioCtx.createGain();

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1174.66, now + 0.06);

    gain2.gain.setValueAtTime(0, now + 0.06);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(sharedAudioCtx.destination);

    osc2.start(now + 0.06);
    osc2.stop(now + 0.45);
  } catch {
    // Autoplay or audio context permission blocked; fail silently
  }
}
