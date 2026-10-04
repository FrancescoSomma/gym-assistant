let context: AudioContext | null = null;

/** iOS plays Web Audio only after a user gesture (touch end): called on every pointerup (cheap). */
export function unlockAudio(): void {
  context ??= new AudioContext();
  if (context.state !== 'running') void context.resume();
}

/**
 * Two rising tones, like the competition clock calling the lifter. No vibration:
 * navigator.vibrate does not exist on iOS.
 */
export function beep(): void {
  if (context?.state !== 'running') return;
  const t = context.currentTime;
  const tones = [
    { start: 0, frequency: 660, length: 0.16 },
    { start: 0.2, frequency: 990, length: 0.32 },
  ];
  for (const { start, frequency, length } of tones) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, t + start);
    gain.gain.exponentialRampToValueAtTime(0.5, t + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + start + length);
    osc.connect(gain).connect(context.destination);
    osc.start(t + start);
    osc.stop(t + start + length + 0.02);
  }
}
