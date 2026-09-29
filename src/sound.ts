import type { SoundName } from "./palettes";
const durations: Record<SoundName, number> = {
  cream: 0.115,
  marble: 0.095,
  blue: 0.07,
  typewriter: 0.19,
  silent: 0.042,
  wood: 0.16,
  glass: 0.48,
  retro: 0.135,
  rain: 0.14,
  bubble: 0.19,
  copper: 0.42,
  felt: 0.12,
};
const peaks: Record<SoundName, number> = {
  cream: 0.62,
  marble: 0.66,
  blue: 0.5,
  typewriter: 0.55,
  silent: 0.16,
  wood: 0.62,
  glass: 0.43,
  retro: 0.38,
  rain: 0.4,
  bubble: 0.65,
  copper: 0.46,
  felt: 0.38,
};
const cache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
/** Independent material/gesture models, rendered once per key and reused. */
function render(
  context: BaseAudioContext,
  preset: SoundName,
  code: string,
  release: boolean,
) {
  let buffers = cache.get(context);
  if (!buffers) {
    buffers = new Map();
    cache.set(context, buffers);
  }
  const id = `${preset}:${code}:${release}`;
  const cached = buffers.get(id);
  if (cached) return cached;
  const hash = [...code].reduce((n, c) => n + c.charCodeAt(0), 0);
  const wide =
    code === "Space"
      ? 0.68
      : code === "Enter"
        ? 0.82
        : code.includes("Shift")
          ? 0.9
          : 1;
  const pitch = wide * (0.96 + (hash % 11) * 0.008) * (release ? 1.24 : 1);
  const speed = release ? 1.8 : 1;
  const duration = (durations[preset] / speed) * (wide < 1 ? 1.12 : 1);
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const data = buffer.getChannelData(0);
  let seed = hash + 71,
    low = 0,
    soft = 0,
    phase = 0,
    peak = 0;
  const tau = Math.PI * 2;
  const tone = (f: number, t: number, decay: number) =>
    Math.sin(tau * f * pitch * t) * Math.exp(-t / decay);
  const hit = (t: number, at: number, decay: number) =>
    t < at ? 0 : Math.exp(-(t - at) / decay);
  for (let i = 0; i < data.length; i++) {
    const t = (i / context.sampleRate) * speed;
    seed = (seed * 16807) % 2147483647;
    const noise = (seed / 2147483647) * 2 - 1;
    low += 0.13 * (noise - low);
    soft += 0.035 * (low - soft);
    let v = 0;
    switch (preset) {
      case "cream": // A low polymer thock; little high-frequency attack.
        v =
          0.85 * tone(145, t, 0.025) +
          0.25 * tone(335, t, 0.012) +
          low * 0.45 * Math.exp(-t / 0.009);
        break;
      case "marble": // Two dry, non-harmonic ceramic contacts.
        for (const at of [0, 0.021])
          if (t >= at) {
            const u = t - at;
            v +=
              (tone(820, u, 0.009) +
                0.6 * tone(1930, u, 0.006) +
                0.25 * noise * Math.exp(-u / 0.0025)) *
              (at ? 0.55 : 1);
          }
        break;
      case "blue": // Separate snap and click, above the body resonance.
        v =
          (noise - low) * (hit(t, 0, 0.0025) + 0.85 * hit(t, 0.012, 0.002)) +
          0.22 * tone(2350, t, 0.015) +
          0.1 * tone(185, t, 0.018);
        break;
      case "typewriter": // Lever impact, ratchet and short metal return.
        v = 0.38 * tone(170, t, 0.028) + 0.25 * tone(1440, t, 0.035);
        for (const at of [0, 0.018, 0.043, 0.069])
          v += (noise - low) * hit(t, at, 0.005) * (at === 0 ? 1 : 0.36);
        break;
      case "silent": // A very short cushioned noise pulse, no pitched resonator.
        v = soft * Math.exp(-t / 0.006);
        break;
      case "wood": // Wooden bar modes, no pitch glide.
        v =
          tone(360, t, 0.035) +
          0.26 * tone(994, t, 0.018) +
          0.1 * tone(1944, t, 0.009);
        break;
      case "glass": // Inharmonic glass bell, high and lightly sustained.
        v =
          tone(1730, t, 0.105) +
          0.4 * tone(4610, t, 0.058) +
          0.18 * tone(7190, t, 0.026);
        break;
      case "retro": {
        // Stepped 8-bit arpeggio, deliberate digital grain.
        const step = Math.floor(t / 0.032);
        const f = [330, 495, 660, 440][Math.min(step, 3)] * pitch;
        phase += ((tau * f) / context.sampleRate) * speed;
        v =
          (Math.sin(phase) > 0.35 ? 0.7 : -0.45) *
          Math.exp(-t / 0.08) *
          (1 - ((t % 0.032) / 0.032) * 0.7);
        break;
      }
      case "rain": // Fine hiss with three tiny, scattered droplet impacts.
        v = (noise - low) * 0.55 * Math.exp(-t / 0.025);
        for (const at of [0, 0.038, 0.073])
          if (t >= at) v += 0.22 * tone(2200 + at * 17000, t - at, 0.007);
        break;
      case "bubble": {
        // Rounded plop: a quick rising attack then a falling cavity tone.
        const f = (150 + 1150 * Math.exp(-t / 0.026)) * pitch;
        phase += ((tau * f) / context.sampleRate) * speed;
        v =
          Math.sin(phase) * Math.exp(-t / 0.035) * (1 - Math.exp(-t / 0.0018));
        if (t > 0.055) v += 0.2 * tone(430, t - 0.055, 0.025);
        break;
      }
      case "copper": // A struck metal plate with beating partials and a long tail.
        v =
          tone(520, t, 0.095) +
          0.65 * tone(737, t, 0.085) +
          0.42 * tone(1460, t, 0.052) +
          0.2 * tone(2347, t, 0.03);
        break;
      case "felt": // Soft mallet: slow attack, warm harmonics, no sharp transient.
        v =
          (tone(235, t, 0.028) + 0.18 * tone(705, t, 0.018)) *
          (1 - Math.exp(-t / 0.007));
        break;
    }
    const fade = Math.min(
      1,
      i / Math.max(1, context.sampleRate * 0.0004),
      (data.length - 1 - i) / (context.sampleRate * 0.006),
    );
    data[i] = v * Math.max(0, fade);
    peak = Math.max(peak, Math.abs(data[i]));
  }
  const gain = (peaks[preset] * (release ? 0.23 : 1)) / Math.max(0.00001, peak);
  for (let i = 0; i < data.length; i++) data[i] *= gain;
  if (buffers.size >= 192) buffers.delete(buffers.keys().next().value!);
  buffers.set(id, buffer);
  return buffer;
}
// Shared soft limiter leaves isolated notes unchanged and contains large chords.
const outputs = new WeakMap<AudioNode, GainNode>();
function outputFor(context: BaseAudioContext, destination: AudioNode) {
  const existing = outputs.get(destination);
  if (existing) return existing;
  const input = context.createGain(),
    limiter = context.createWaveShaper();
  input.gain.value = 0.25;
  const curve = new Float32Array(4097);
  for (let i = 0; i < curve.length; i++) {
    const x = ((i / (curve.length - 1)) * 2 - 1) * 4,
      a = Math.abs(x);
    curve[i] =
      Math.sign(x) *
      (a <= 0.72 ? a : 0.72 + 0.25 * Math.tanh((a - 0.72) / 0.25));
  }
  limiter.curve = curve;
  limiter.oversample = "2x";
  input.connect(limiter).connect(destination);
  outputs.set(destination, input);
  return input;
}
export function scheduleKeySound(
  context: BaseAudioContext,
  destination: AudioNode,
  preset: SoundName,
  code: string,
  volume: number,
  release = false,
) {
  const source = context.createBufferSource(),
    gain = context.createGain();
  source.buffer = render(context, preset, code, release);
  gain.gain.value = Math.max(0, Math.min(volume, 1));
  source.connect(gain).connect(outputFor(context, destination));
  source.start();
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
  };
}
export type GestureSound = "assembly" | "select" | "portal" | "float" | "snap";
export function renderGesture(
  context: BaseAudioContext,
  cue: GestureSound,
  code = "Escape",
) {
  const duration = {
    assembly: 3.1,
    select: 0.22,
    portal: 1.55,
    float: 1.1,
    snap: 0.9,
  }[cue];
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );
  const data = buffer.getChannelData(0),
    hash = [...code].reduce((n, c) => n + c.charCodeAt(0), 0);
  const pitch = 1 + (hash % 7) * 0.025;
  let seed = hash + 73,
    low = 0,
    peak = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / context.sampleRate;
    seed = (seed * 16807) % 2147483647;
    const noise = (seed / 2147483647) * 2 - 1;
    low += (noise - low) * 0.06;
    const tone = (f: number, at: number, decay: number) =>
      t < at
        ? 0
        : Math.sin(2 * Math.PI * f * pitch * (t - at)) *
          Math.exp(-(t - at) / decay);
    let sample = 0;
    if (cue === "assembly") {
      sample = tone(130, 0, 0.18) * 0.45 + tone(440, 0, 0.28) * 0.3;
      for (let n = 0; n < 23; n++) {
        const at = 0.28 + n * 0.065;
        if (t >= at) {
          const age = t - at;
          sample +=
            (noise * 0.2 + Math.sin(age * (800 + n * 50)) * 0.25) *
            Math.exp(-age / 0.016);
        }
      }
      const rise = Math.max(0, Math.sin(Math.PI * Math.min(t / 1.8, 1)));
      sample +=
        low * rise * 0.35 +
        Math.sin(2 * Math.PI * (80 * t + 90 * t * t)) * rise * 0.08;
      sample +=
        tone(330, 2.05, 0.4) * 0.3 +
        tone(495, 2.09, 0.45) * 0.2 +
        tone(660, 2.14, 0.5) * 0.15;
    } else if (cue === "select")
      sample =
        tone(740, 0, 0.045) * 0.5 +
        tone(1110, 0.035, 0.06) * 0.3 +
        noise * Math.exp(-t / 0.006) * 0.12;
    else if (cue === "portal") {
      const env = Math.sin((Math.PI * t) / duration);
      sample =
        (Math.sin(2 * Math.PI * (55 * t + 180 * t * t)) * 0.15 +
          low * 0.6 +
          tone(220, 0, 1) * 0.1) *
        env;
    } else if (cue === "float")
      sample =
        (tone(220, 0, 0.35) + tone(330, 0.06, 0.4) + tone(495, 0.12, 0.4)) *
          0.18 +
        low * Math.sin((Math.PI * t) / duration) * 0.15;
    else
      for (let n = 0; n < 9; n++) {
        const at = n * 0.065;
        if (t >= at)
          sample +=
            tone(360 + n * 55, at, 0.035) * 0.3 +
            noise * Math.exp(-(t - at) / 0.008) * 0.15;
      }
    const edge = Math.min(1, t / 0.004, (duration - t) / 0.015);
    data[i] = sample * Math.max(0, edge);
    peak = Math.max(peak, Math.abs(data[i]));
  }
  const scale = 0.6 / Math.max(0.01, peak);
  for (let i = 0; i < data.length; i++) data[i] *= scale;
  return buffer;
}
export class KeyboardAudio {
  private context: AudioContext | undefined;
  private active = false;
  private gestures = new Map<GestureSound, AudioBufferSourceNode>();
  get enabled() {
    return this.active;
  }
  set enabled(value: boolean) {
    this.active = value;
    if (!value) this.cancelGestures();
  }
  volume = 0.45;
  preset: SoundName = "bubble";
  async enable() {
    this.context ??= new AudioContext();
    await this.context.resume();
    this.enabled = true;
  }
  play(code: string, release = false) {
    if (!this.enabled || !this.context) return;
    scheduleKeySound(
      this.context,
      this.context.destination,
      this.preset,
      code,
      this.volume,
      release,
    );
  }
  playGesture(cue: GestureSound, code = "Escape") {
    if (!this.enabled || !this.context) return false;
    this.cancelGestures(cue);
    const source = this.context.createBufferSource(),
      gain = this.context.createGain();
    source.buffer = renderGesture(this.context, cue, code);
    gain.gain.value = this.volume;
    source
      .connect(gain)
      .connect(outputFor(this.context, this.context.destination));
    this.gestures.set(cue, source);
    source.start();
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (this.gestures.get(cue) === source) this.gestures.delete(cue);
    };
    return true;
  }
  cancelGestures(cue?: GestureSound) {
    this.gestures.forEach((source, name) => {
      if (!cue || name === cue) {
        try {
          source.stop();
        } catch {}
        this.gestures.delete(name);
      }
    });
  }
  close() {
    this.cancelGestures();
    return this.context?.close();
  }
}
