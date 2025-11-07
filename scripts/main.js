import { summarize } from "./summarizer.js";
import { saveNote } from "./storage.js";
import { showToast } from "./toast.js";

const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const saveBtn = document.getElementById("save-btn");
const indicatorDot = document.querySelector("[data-recording-indicator]");
const indicatorLabel = document.querySelector("[data-recording-label]");
const transcriptOutput = document.getElementById("transcript-output");
const summaryOutput = document.getElementById("summary-output");
const resultCard = document.getElementById("result-card");
const audioEl = document.getElementById("playback");
const summaryTemplate = document.getElementById("summary-item-template");
const speechWarning = document.getElementById("speech-warning");

let mediaRecorder;
let recognition;
let audioChunks = [];
let transcriptText = "";
let isRecording = false;
let lastAudioBlob = null;
let lastSummary = [];
let activeStream;
let recognitionInitialized = false;
let recognitionActive = false;

function showSpeechWarning(message) {
  if (!speechWarning) return;
  speechWarning.textContent = message;
  speechWarning.classList.remove("hidden");
}

function hideSpeechWarning() {
  if (!speechWarning) return;
  speechWarning.classList.add("hidden");
}

function initSpeechRecognition() {
  if (recognitionInitialized) {
    return recognition;
  }
  recognitionInitialized = true;
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (!window.isSecureContext) {
      showSpeechWarning("Live transcription needs HTTPS or chrome://flags → insecure origins.");
    } else {
      showSpeechWarning("Speech recognition is not supported on this browser.");
    }
    return null;
  }
  recognition = new SpeechRecognition();
  hideSpeechWarning();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;
  recognition.addEventListener("result", handleSpeechResult);
  recognition.addEventListener("error", (event) => {
    console.error("Speech error:", event.error);
    showToast(`Speech error: ${event.error}`);
  });
  recognition.addEventListener("end", () => {
    recognitionActive = false;
    if (isRecording) {
      try {
        recognition.start();
        recognitionActive = true;
      } catch (err) {
        console.warn("Unable to restart recognition", err);
      }
    }
  });
  return recognition;
}

function stopSpeechRecognition() {
  if (!recognition) return;
  try {
    recognition.stop();
  } catch (err) {
    console.warn("Speech stop failed", err);
  }
  recognitionActive = false;
}

function handleSpeechResult(event) {
  let interim = "";
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    if (result.isFinal) {
      transcriptText = `${transcriptText} ${result[0].transcript}`.trim();
    } else {
      interim += ` ${result[0].transcript}`;
    }
  }
  const display = `${transcriptText} ${interim}`.trim();
  updateTranscript(display);
}

function updateTranscript(text) {
  transcriptOutput.textContent = text || "Listening...";
  transcriptOutput.dataset.content = text;
  const summary = summarize(text);
  lastSummary = summary;
  renderSummary(summary);
  const hasContent = Boolean(text && text.trim().length > 3);
  toggleResultCard(hasContent);
  saveBtn.disabled = !hasContent;
}

function renderSummary(items) {
  summaryOutput.innerHTML = "";
  if (!items.length) {
    const placeholder = summaryTemplate.content.cloneNode(true);
    placeholder.querySelector("li").textContent =
      "Keep talking… we will surface the takeaways.";
    summaryOutput.appendChild(placeholder);
    return;
  }
  items.forEach((item) => {
    const fragment = summaryTemplate.content.cloneNode(true);
    fragment.querySelector("li").textContent = item;
    summaryOutput.appendChild(fragment);
  });
}

function toggleResultCard(show) {
  resultCard.classList.toggle("hidden", !show);
}

function setRecordingState(recording) {
  isRecording = recording;
  startBtn.disabled = recording;
  stopBtn.disabled = !recording;
  indicatorDot.classList.toggle("recording", recording);
  indicatorLabel.textContent = recording ? "Recording…" : "Idle";
}

async function startRecording() {
  if (isRecording) return;
  setRecordingState(true);
  const speechRecognizer = initSpeechRecognition();
  if (speechRecognizer && !recognitionActive) {
    try {
      speechRecognizer.start();
      recognitionActive = true;
    } catch (err) {
      if (err.name !== "InvalidStateError") {
        console.error("Speech start failed", err);
        showToast("Speech engine busy. Try again.");
      }
    }
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error(err);
    setRecordingState(false);
    showToast("Microphone access is required.");
    stopSpeechRecognition();
    return;
  }

  transcriptText = "";
  lastAudioBlob = null;
  audioChunks = [];
  activeStream = stream;
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };
  mediaRecorder.onstop = handleRecordingStop;
  mediaRecorder.start();
  updateTranscript("");
  audioEl.classList.add("hidden");
}

function stopRecording() {
  if (!isRecording) return;
  setRecordingState(false);
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  stopSpeechRecognition();
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }
}

function handleRecordingStop() {
  const blob = new Blob(audioChunks, { type: "audio/webm" });
  lastAudioBlob = blob;
  const url = URL.createObjectURL(blob);
  audioEl.src = url;
  audioEl.classList.remove("hidden");
  showToast("Recording captured. Review & save.");
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function persistNote() {
  const transcript = (transcriptOutput.dataset.content || "").trim();
  if (!transcript) return;
  saveBtn.disabled = true;
  showToast("Saving note…");
  const note = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    createdAt: new Date().toISOString(),
    transcript,
    summary: lastSummary.length ? lastSummary : summarize(transcript),
    audio: lastAudioBlob ? await blobToDataUrl(lastAudioBlob) : null,
  };
  saveNote(note);
  showToast("Note saved.");
}

startBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);
saveBtn.addEventListener("click", persistNote);

// Prime speech engine or surface warning early.
initSpeechRecognition();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}
