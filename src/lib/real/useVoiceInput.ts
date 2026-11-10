"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, postForm } from "@/lib/real/http";
import { startLiveTranscription } from "@/lib/real/live-transcription";
import type { Lang } from "@/lib/types";

type VoiceState = "idle" | "listening" | "processing";

const MIN_MS = 500;
const MAX_MS = 90_000;
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function voiceError(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Allow microphone access in your browser, then try again.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No microphone found. Connect one or type your description.";
  }
  if (error instanceof ApiError && error.status === 503) {
    return "Speech transcription is unavailable. Your recording is saved below. Try again or type your description.";
  }
  return error instanceof Error ? error.message : "Could not record your voice. Try again or type your description.";
}

/** Shows real speech as it is transcribed, then finalizes the draft after recording stops. */
export function useVoiceInput(opts: {
  onText: (text: string, lang: Lang | null) => void;
  onPartialText?: (text: string) => void;
  onUnavailable?: () => void;
}): { state: VoiceState; toggle: () => void; error: string | null; recordingUrl: string | null; durationMs: number; transcript: string } {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [transcript, setTranscript] = useState("");
  const optsRef = useRef(opts);
  const stateRef = useRef<VoiceState>("idle");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true);
  const session = useRef(0);
  const liveCleanup = useRef<(() => void) | null>(null);
  const playbackUrl = useRef<string | null>(null);
  const durationTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    optsRef.current = opts;
  });

  const updateState = useCallback((next: VoiceState) => {
    stateRef.current = next;
    if (alive.current) setState(next);
  }, []);

  const release = useCallback(() => {
    clearInterval(durationTimer.current);
    clearTimeout(stopTimer.current);
    liveCleanup.current?.();
    liveCleanup.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
  }, []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      session.current += 1;
      const rec = recorder.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.onerror = null;
        rec.stop();
      }
      release();
      if (playbackUrl.current) URL.revokeObjectURL(playbackUrl.current);
    };
  }, [release]);

  const fail = useCallback((cause: unknown, generation: number) => {
    if (!alive.current || session.current !== generation) return;
    release();
    setError(voiceError(cause));
    updateState("idle");
    optsRef.current.onUnavailable?.();
  }, [release, updateState]);

  const stop = useCallback(() => {
    const rec = recorder.current;
    if (rec && rec.state !== "inactive") {
      updateState("processing");
      clearInterval(durationTimer.current);
      clearTimeout(stopTimer.current);
      liveCleanup.current?.();
      liveCleanup.current = null;
      rec.stop();
    }
  }, [updateState]);

  const start = useCallback(async () => {
    const generation = ++session.current;
    const isCurrent = () => alive.current && session.current === generation;
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      fail(new Error("Voice recording needs a supported browser and HTTPS or localhost."), generation);
      return;
    }
    updateState("processing");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!isCurrent()) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mime = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      const startedAt = Date.now();
      rec.ondataavailable = (event) => {
        if (isCurrent() && event.data.size > 0) chunks.push(event.data);
      };
      rec.onerror = () => {
        rec.onstop = null;
        fail(new Error("The microphone stopped unexpectedly. Please record again."), generation);
      };
      rec.onstop = async () => {
        if (!isCurrent()) return;
        const duration = Date.now() - startedAt;
        const type = rec.mimeType || mime || "audio/webm";
        release();
        setDurationMs(duration);
        if (duration < MIN_MS || chunks.length === 0) {
          fail(new Error("That recording was too short. Tap the mic and speak again."), generation);
          return;
        }
        const audio = new Blob(chunks, { type });
        if (playbackUrl.current) URL.revokeObjectURL(playbackUrl.current);
        playbackUrl.current = URL.createObjectURL(audio);
        setRecordingUrl(playbackUrl.current);
        updateState("processing");
        try {
          const form = new FormData();
          form.append("audio", audio, type.includes("mp4") ? "voice.mp4" : "voice.webm");
          const res = await postForm<{ text: string; lang: Lang | null; ms: number }>("/api/ai/transcribe", form);
          const text = res.text?.trim();
          if (!text) {
            fail(new Error("No speech heard. Try again or type your description."), generation);
            return;
          }
          if (!isCurrent()) return;
          setError(null);
          setTranscript(text);
          updateState("idle");
          optsRef.current.onText(text, res.lang ?? null);
        } catch (cause) {
          fail(cause, generation);
        }
      };
      recorder.current = rec;
      if (playbackUrl.current) URL.revokeObjectURL(playbackUrl.current);
      playbackUrl.current = null;
      setRecordingUrl(null);
      setDurationMs(0);
      setTranscript("");
      optsRef.current.onPartialText?.("");
      rec.start(250);
      durationTimer.current = setInterval(() => {
        if (isCurrent()) setDurationMs(Date.now() - startedAt);
      }, 250);
      stopTimer.current = setTimeout(stop, MAX_MS);
      updateState("listening");
      void startLiveTranscription(media, (text) => {
        if (!isCurrent() || stateRef.current !== "listening") return;
        setTranscript(text);
        optsRef.current.onPartialText?.(text);
      }).then((cleanup) => {
        if (!isCurrent() || stateRef.current !== "listening") cleanup();
        else liveCleanup.current = cleanup;
      }).catch(() => {
        if (isCurrent() && stateRef.current === "listening") {
          setError("Live text is unavailable. Finish recording to transcribe it, or type your description.");
        }
      });
    } catch (cause) {
      fail(cause, generation);
    }
  }, [fail, release, stop, updateState]);

  const toggle = useCallback(() => {
    if (stateRef.current === "processing") return;
    if (stateRef.current === "listening") stop();
    else void start();
  }, [start, stop]);

  return { state, toggle, error, recordingUrl, durationMs, transcript };
}
