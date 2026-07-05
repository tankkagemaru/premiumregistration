/**
 * Tiny two-note notification chime, synthesised with WebAudio — no audio file
 * to load, works offline. Browsers block audio until the user has interacted
 * with the page at least once; we fail silently in that case (the visual badge
 * still updates).
 */
let ctx: AudioContext | null = null;

export function playChime() {
  try {
    type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();

    const note = (freq: number, start: number, dur: number, peak: number) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx!.currentTime + start;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    };
    // A gentle E6 → A6 "ding-dong", quiet enough for an office.
    note(1318.5, 0, 0.28, 0.12);
    note(1760, 0.12, 0.4, 0.1);
  } catch {
    /* audio unavailable / blocked — ignore */
  }
}
