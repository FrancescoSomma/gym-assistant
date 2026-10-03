let context: AudioContext | null = null;

/** iOS plays Web Audio only after a user gesture (touch end): called on every pointerup (cheap). */
export function unlockAudio(): void {
  context ??= new AudioContext();
  if (context.state !== 'running') void context.resume();
}

/** Two short beeps. No vibration: navigator.vibrate does not exist on iOS. */
export function beep(): void {
  if (context?.state !== 'running') return;
  const t = context.currentTime;
  for (const start of [0, 0.25]) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t + start);
    gain.gain.exponentialRampToValueAtTime(0.4, t + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + start + 0.18);
    osc.connect(gain).connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + 0.2);
  }
}
