const STORAGE_KEY = "notes-pulse";

export function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to load notes", err);
    return [];
  }
}

export function saveNote(note) {
  const notes = loadNotes();
  notes.unshift(note);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  return notes;
}

export function overwriteNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}
