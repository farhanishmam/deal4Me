const UPDATE_MS = 1_500;
const TARGET_SAMPLE_RATE = 16_000;

/** Each snapshot is a complete WAV, so it can be decoded independently. */
function wavSnapshot(chunks: Float32Array[], sampleCount: number, inputRate: number): Blob {
  const samples = new Float32Array(sampleCount);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }

  const outputRate = Math.min(TARGET_SAMPLE_RATE, inputRate);
  const ratio = inputRate / outputRate;
  const outputCount = Math.floor(sampleCount / ratio);
  const buffer = new ArrayBuffer(44 + outputCount * 2);
  const view = new DataView(buffer);
  const label = (start: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(start + i, text.charCodeAt(i));
  };
  label(0, "RIFF");
  view.setUint32(4, 36 + outputCount * 2, true);
  label(8, "WAVE");
  label(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, outputRate, true);
  view.setUint32(28, outputRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  label(36, "data");
  view.setUint32(40, outputCount * 2, true);
  for (let i = 0; i < outputCount; i++) {
    const from = Math.floor(i * ratio);
    const to = Math.floor((i + 1) * ratio);
    let value = 0;
    for (let j = from; j < to; j++) value += samples[j];
    value = Math.max(-1, Math.min(1, value / (to - from)));
    view.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Transcribes real microphone PCM while the MediaRecorder keeps the final take.
 * The caller owns the stream and recording limit. Stop this before requesting
 * the final transcript; cleanup never stops the stream's shared tracks.
 */
export async function startLiveTranscription(
  stream: MediaStream,
  onText: (text: string) => void,
): Promise<() => void> {
  if (typeof AudioContext === "undefined" || typeof AudioWorkletNode === "undefined") {
    throw new Error("Live transcription is not supported by this browser.");
  }

  let context: AudioContext;
  try {
    context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    context = new AudioContext();
  }

  let source: MediaStreamAudioSourceNode | undefined;
  let worklet: AudioWorkletNode | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  let stopped = false;
  const chunks: Float32Array[] = [];
  let sampleCount = 0;
  let hasSound = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    request?.abort();
    source?.disconnect();
    if (worklet) {
      worklet.port.onmessage = null;
      worklet.port.close();
      worklet.disconnect();
    }
    chunks.length = 0;
    void context.close().catch(() => {});
  };

  try {
    // A suspended or failed audio context must not strand setup indefinitely.
    let setupTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.all([
          context.audioWorklet.addModule("/audio/transcript-capture.worklet.js"),
          context.resume(),
        ]),
        new Promise<never>((_, reject) => {
          setupTimer = setTimeout(() => reject(new Error("Live microphone capture did not start.")), 5_000);
        }),
      ]);
    } finally {
      clearTimeout(setupTimer);
    }
    if (!stream.getAudioTracks().some((track) => track.readyState === "live")) {
      throw new Error("The microphone recording has ended.");
    }

    source = context.createMediaStreamSource(stream);
    worklet = new AudioWorkletNode(context, "transcript-capture", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      channelCount: 1,
      channelCountMode: "explicit",
    });
    worklet.port.onmessage = (event: MessageEvent<Float32Array>) => {
      if (stopped || !(event.data instanceof Float32Array)) return;
      const samples = event.data;
      chunks.push(samples);
      sampleCount += samples.length;
      // Avoid asking the model to interpret digital silence as speech.
      if (!hasSound) {
        let energy = 0;
        for (const value of samples) energy += value * value;
        hasSound = energy / samples.length > 0.00001;
      }
    };
    source.connect(worklet);
    // The processor outputs silence, keeping capture active without playback.
    worklet.connect(context.destination);

    const update = async () => {
      if (stopped) return;
      const started = Date.now();
      try {
        if (hasSound && sampleCount >= context.sampleRate) {
          hasSound = false;
          request = new AbortController();
          const form = new FormData();
          form.append("audio", wavSnapshot(chunks, sampleCount, context.sampleRate), "live.wav");
          const response = await fetch("/api/ai/transcribe", {
            method: "POST",
            body: form,
            signal: request.signal,
          });
          if (response.ok && !stopped) {
            const result = (await response.json()) as { text?: string };
            if (!stopped && result.text?.trim()) onText(result.text.trim());
          }
        }
      } catch {
        // Interim failures do not discard the authoritative final recording.
      } finally {
        request = undefined;
        // Serial scheduling prevents overlapping transcription requests.
        if (!stopped) timer = setTimeout(() => void update(), Math.max(0, UPDATE_MS - (Date.now() - started)));
      }
    };
    timer = setTimeout(() => void update(), UPDATE_MS);
    return stop;
  } catch (error) {
    stop();
    throw error;
  }
}
