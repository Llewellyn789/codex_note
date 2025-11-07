import { loadNotes } from "./storage.js";
import { summarize } from "./summarizer.js";

const notesList = document.getElementById("notes-list");
const template = document.getElementById("note-item-template");
const emptyState = document.getElementById("empty-state");
const sortSelect = document.getElementById("sort-select");

let notes = loadNotes();

function sortNotes(mode) {
  const copy = [...notes];
  switch (mode) {
    case "oldest":
      return copy.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    case "alpha":
      return copy.sort((a, b) => {
        const aKey = (a.summary?.[0] || a.transcript).toLowerCase();
        const bKey = (b.summary?.[0] || b.transcript).toLowerCase();
        return aKey.localeCompare(bKey);
      });
    case "length":
      return copy.sort((a, b) => b.transcript.length - a.transcript.length);
    case "newest":
    default:
      return copy.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
  }
}

function renderNotes() {
  notesList.innerHTML = "";
  const sorted = sortNotes(sortSelect.value);
  if (!sorted.length) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  sorted.forEach((note) => {
    const fragment = template.content.cloneNode(true);
    const timeEl = fragment.querySelector("time");
    const summaryList = fragment.querySelector(".summary-list");
    const transcriptEl = fragment.querySelector(".transcript");
    const audioEl = fragment.querySelector(".note-audio");

    timeEl.textContent = new Date(note.createdAt).toLocaleString();

    const summaryItems =
      note.summary && note.summary.length
        ? note.summary
        : summarize(note.transcript).slice(0, 3);

    summaryList.innerHTML = "";
    summaryItems.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      summaryList.appendChild(li);
    });

    transcriptEl.textContent = note.transcript;

    if (note.audio) {
      audioEl.classList.remove("hidden");
      audioEl.src = note.audio;
    }

    notesList.appendChild(fragment);
  });
}

sortSelect.addEventListener("change", renderNotes);
renderNotes();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}
