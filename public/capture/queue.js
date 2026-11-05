// The capture app's offline queue, shared by the page (app.js) and the service
// worker (sw.js). Items wait in IndexedDB on the phone until the PC answers.
// Everything is sent to POST /api/items; nothing is ever read back from the PC.
"use strict";

const OverplannerQueue = (() => {
  const DB = "overplanner-capture";
  const STORE = "queue";

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function run(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => {
        db.close();
        resolve(req?.result);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  const put = (item) => run("readwrite", (s) => s.put(item));
  const remove = (id) => run("readwrite", (s) => s.delete(id));

  // Oldest first.
  async function all() {
    const items = await run("readonly", (s) => s.getAll());
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  // Sends waiting items in order. Stops at the first network or server problem
  // (the PC is off or restarting), so items stay queued and in order. An item
  // the server rejects is marked with the reason and skipped, so one bad item
  // can't block the rest. Items carry their own id, so a send that succeeded
  // but whose answer was lost is safe to repeat.
  let flushing = null;

  function flush() {
    if (!flushing) {
      flushing = send().finally(() => {
        flushing = null;
      });
    }
    return flushing;
  }

  async function send() {
    let sent = 0;
    for (const entry of await all()) {
      if (entry.error) continue;
      let res;
      try {
        res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry.payload),
        });
      } catch {
        return { sent, reachable: false };
      }
      if (res.ok) {
        await remove(entry.id);
        sent++;
      } else if (res.status >= 400 && res.status < 500) {
        const body = await res.json().catch(() => ({}));
        await put({ ...entry, error: body.error || `Rejected (${res.status})` });
      } else {
        return { sent, reachable: false };
      }
    }
    return { sent, reachable: true };
  }

  return { put, remove, all, flush };
})();
