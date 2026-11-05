// The capture app: type or share something, and it goes to the PC's Inbox.
"use strict";

const RETRY_MS = 30000;
const LONG_TEXT = 140;
const SINGLE_LINE_TITLE = 100;

const $ = (id) => document.getElementById(id);
const text = $("text");
const modeButtons = document.querySelectorAll("[data-mode]");
let chosenMode = null;
let reachable = null;

const looksLikeNote = (s) => s.includes("\n") || s.length > LONG_TEXT || /https?:\/\//.test(s);
const currentMode = () => chosenMode ?? (looksLikeNote(text.value.trim()) ? "note" : "task");

// Same rules as Quick Add in the PC app. No categories: everything lands in
// the Inbox, to be filed from the PC.
function payloadFor(value, mode, source, id, createdAt) {
  const base = { id, createdAt, source, categories: [] };
  const [first, ...rest] = value.split("\n");
  if (mode === "task") return { ...base, kind: "task", title: first.trim(), notes: rest.join("\n").trim() };
  if (rest.length > 0) return { ...base, kind: "note", title: first.trim(), body: rest.join("\n").trim() };
  return value.length <= SINGLE_LINE_TITLE
    ? { ...base, kind: "note", title: value, body: "" }
    : { ...base, kind: "note", title: "", body: value };
}

async function capture(value, mode, source) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await OverplannerQueue.put({ id, createdAt, preview: value, payload: payloadFor(value, mode, source, id, createdAt) });
  await render();
  void sendNow();
  requestBackgroundSend();
}

// Android can send the queue after the app is closed, once it's back online.
async function requestBackgroundSend() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    await reg?.sync?.register("send-queue");
  } catch {
    // Not supported or not allowed: sends when the app is opened instead.
  }
}

let sending = false;
let sendAgain = false;

async function sendNow() {
  // Something added during a send goes right after it, not at the next retry.
  if (sending) {
    sendAgain = true;
    return;
  }
  sending = true;
  render();
  do {
    sendAgain = false;
    try {
      const result = await OverplannerQueue.flush();
      reachable = result.reachable;
    } catch {
      reachable = false;
    }
  } while (sendAgain && reachable);
  sending = false;
  await render();
}

async function render() {
  const items = await OverplannerQueue.all();
  const waiting = items.filter((i) => !i.error).length;

  const status = $("status");
  status.dataset.state = waiting === 0 && reachable !== false ? "ok" : reachable === false ? "off" : "busy";
  status.textContent = sending
    ? "Sending…"
    : waiting > 0
      ? `${waiting} waiting${reachable === false ? ". PC not reachable; it will send when it is." : ""}`
      : reachable === false
        ? "All saved. PC not reachable right now."
        : "All sent to your Inbox.";

  $("send").hidden = waiting === 0;
  $("send").disabled = sending;

  const list = $("queue");
  list.replaceChildren(
    ...items
      .slice()
      .reverse()
      .map((item) => {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = item.preview;
        li.append(span);
        if (item.error) {
          const err = document.createElement("small");
          err.textContent = item.error;
          li.append(err);
        }
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "×";
        del.setAttribute("aria-label", "Remove");
        del.onclick = async () => {
          await OverplannerQueue.remove(item.id);
          await render();
        };
        li.append(del);
        return li;
      }),
  );
}

function renderMode() {
  const mode = currentMode();
  modeButtons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === mode)));
  $("add").disabled = !text.value.trim();
}

modeButtons.forEach((b) => {
  b.onclick = () => {
    chosenMode = b.dataset.mode;
    renderMode();
    text.focus();
  };
});

text.oninput = () => {
  text.style.height = "auto";
  text.style.height = `${text.scrollHeight}px`;
  renderMode();
};

$("form").onsubmit = async (e) => {
  e.preventDefault();
  const value = text.value.trim();
  if (!value) return;
  const mode = currentMode();
  text.value = "";
  chosenMode = null;
  text.oninput();
  await capture(value, mode, "manual");
  text.focus();
};

$("send").onclick = () => void sendNow();

// Shared from another app: /capture/?title=...&text=...&url=...
// Saved straight away as a note, then the address is cleaned so a reload can't
// add it twice.
async function handleShare() {
  const params = new URLSearchParams(location.search);
  const parts = [params.get("title"), params.get("text"), params.get("url")].map((p) => p?.trim()).filter(Boolean);
  if (parts.length === 0) return;
  const url = params.get("url")?.trim();
  // Android apps often repeat the link in the text.
  const unique = parts.filter((p, i) => !(p === url && parts.slice(0, i).some((q) => q.includes(url))));
  history.replaceState(null, "", location.pathname);
  await capture(unique.join("\n"), "note", "share");
}

navigator.serviceWorker?.addEventListener("message", (e) => {
  if (e.data?.type !== "queue-changed") return;
  reachable = e.data.reachable;
  void render();
});

// Try whenever there's a chance the PC can be reached.
window.addEventListener("online", () => void sendNow());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void sendNow();
});
setInterval(() => {
  if (document.visibilityState === "visible") void sendNow();
}, RETRY_MS);

navigator.serviceWorker?.register("./sw.js");
navigator.storage?.persist?.();

renderMode();
handleShare().then(sendNow);
