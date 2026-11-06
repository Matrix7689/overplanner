# Importing from Google Keep and WhatsApp

This guide takes your Google Keep notes and a WhatsApp chat into Overplanner. It's written so that you, or an AI assistant such as Claude working in this repository, can follow it from start to finish.

There are three stages: export your data, say where each item belongs, then run the import.

Your data stays on your computer. The `exports/` folder and everything in `data/` are git-ignored.

## 1. Export your data

Create a folder called `exports` in the project root. You'll end up with this:

```text
exports/
  Keep JSON/                  the .json files from Google Takeout
  WhatsApp Chat with Notes/   the exported chat (the folder name must start with "WhatsApp Chat")
    WhatsApp Chat with Notes.txt
    IMG-20240101-WA0001.jpg
```

You can import just one of the two. The importer reads one WhatsApp chat per folder, so give a second chat its own `exports-2` folder and run the steps again.

### Google Keep (Google Takeout)

1. Go to [takeout.google.com](https://takeout.google.com) and sign in.
2. Under **Select data to include**, click **Deselect all**.
3. Scroll to **Keep** and tick it, then click **Next step**.
4. Choose **Export once** and `.zip`, then click **Create export**.
5. Wait for Google's email (usually a few minutes), then download the file and unzip it.
6. Copy the `.json` files from `Takeout/Keep/` into `exports/Keep JSON/`.

Each note is one `.json` file. Archived notes are included.

### WhatsApp (Export chat)

This suits a chat you use as personal notes, such as a group with only you in it. The importer treats every message as an item, whoever sent it.

- **Android:** open the chat, tap **⋮ > More > Export chat**.
- **iPhone:** open the chat, tap its name at the top, then **Export Chat**.

Choose **Include media** to keep your photos, or **Without media** for a smaller file. Send the result to your computer (email or Drive works), unzip it if needed, and put it in `exports/`, in a folder whose name starts with `WhatsApp Chat`.

Menu names can change between app versions.

## 2. Create the classification file

Install dependencies if you haven't yet (`npm install`). Then run:

```bash
npm run import -- --dir exports --make-csv
```

This writes `exports/overplanner_classification.csv`, with one row per note and message:

| Column | Meaning |
|---|---|
| `source` | `keep` or `whatsapp` |
| `ref` | The Keep file name, or `msg N` for a message. Merge follow-up messages into one item with `msg 4,5,6` or `msg 4-6` |
| `title / text` | A preview, to help you decide. The import reads the real text from your exports |
| `category` | Where it goes (see below) |
| `secondary` | Optional second category |
| `kind (T=task,N=note)` | `T` for something to do, `N` for something to keep. The starter file makes a guess |

Fill in the `category` column. It takes any of these:

| Value | What happens |
|---|---|
| A category name or ID | Filed there, for example `Food` or `shopping-list`. Your categories are in **Settings > Categories** |
| Blank | Goes to the Inbox, to file later in the app |
| `split` | A Keep checklist becomes one task per line, each filed by keyword rules. Good for long catch-all to-do lists |
| `secret` | Left out, because it holds a password or code |
| `skip` or `skip: your reason` | Left out, and listed in the report |

Before filling it in, you may want to edit your categories in the app. Rows that name a category that doesn't exist stop the import with a clear message.

### Asking an AI assistant to fill it in

Paste something like this:

> Read `docs/IMPORTING.md`. Fill in the `category` and `kind` columns of `exports/overplanner_classification.csv`, using my categories from `data/categories.json` and the full text in `exports/`. Then run the dry run and show me the report.

**If you are the assistant:**

- Read the real note or message for each row, not just the preview.
- Take category names and descriptions from `data/categories.json` (or `defaults/categories.json` if the app hasn't run yet). Use only categories that exist. If many items have no home, suggest a new category and let the user decide.
- Mark anything holding a password, PIN, recovery code, card or account number, or government ID as `secret`. Never repeat those values in your replies or in any file you create.
- Merge messages only when they're clearly one thought sent in pieces.
- Don't run `--apply` until the user has seen the report and said to go ahead.

## 3. Do a dry run

```bash
npm run import -- --dir exports
```

This changes nothing in your data. It writes `exports/import-report.md`, listing what would come in, how it's filed, and what was left out.

**Check the "Withheld by the secret scan" section.** The importer scans all text for things that look like passwords or codes and leaves those items out, masking them in the report. It can flag harmless text such as "Get SSN" or "$5k", and it can miss a bare code like `gate 1234`, so it doesn't replace reading your notes. Move anything real into a password manager.

### Adjusting with `import-overrides.json`

To change what the importer decides, create `exports/import-overrides.json`. Every key is optional:

```json
{
  "categoryMap": { "My label": "food", "Old stuff": "skip: Too old" },
  "allow": ["Trip ideas.json", "msg 31"],
  "block": ["msg 12"],
  "titles": { "msg 8": "Espresso guide" },
  "texts": { "msg 8": "Sour: grind finer. Bitter: grind coarser." },
  "categories": { "To do.json#3": ["home"] }
}
```

| Key | Use |
|---|---|
| `categoryMap` | Turns your own labels in the CSV into a category or an action (`split`, `secret`, `skip`) |
| `allow` | Items the secret scan flagged wrongly, by `ref`. Lines of a `split` list look like `To do.json#3` |
| `block` | Items to leave out, whatever the CSV says |
| `titles`, `texts` | A title and searchable text for a message that's only a photo |
| `categories` | Files one item or one `split` line in specific categories, overriding everything else |

Run the dry run again after any change.

## 4. Import

1. **Back up.** Click **Force Backup** in the app if you've set a backup folder, or copy the `data/` folder somewhere safe.
2. **Stop the server**, because it would overwrite the import. Press `Ctrl+C` where it's running. If you use the Windows autostart task, run this in PowerShell:

   ```powershell
   Stop-ScheduledTask -TaskName Overplanner
   Get-NetTCPConnection -LocalPort 3030 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
   ```

3. **Run the import:**

   ```bash
   npm run import -- --dir exports --apply
   ```

4. **Start the server again** with `npm start`, or `Start-ScheduledTask -TaskName Overplanner`, and open the app.

## 5. Check the result

- Open a few long notes and checklists, and look through the Inbox and Search.
- Open tasks may be more than you expect. WhatsApp has no "done" state, so every WhatsApp task comes in as open.

## What gets imported

| From | In Overplanner |
|---|---|
| Keep title and text | Title and details (task) or body (note) |
| Keep checklist | A checklist on the item, with its ticks |
| Keep archived | Task: done. Note: archived |
| Keep checklist with every line ticked | Task: done |
| Keep pinned | Pinned |
| Keep links | Added to the text |
| Keep created and edited times | Kept, so old completions don't count as recent in Results |
| Keep images | Not copied. The item is tagged `missing-image` |
| WhatsApp message | One item. Task: open. Note: active |
| WhatsApp photo | Not copied. The note names the file and is tagged `has-photo`, so keep your exports folder |

The app has no file attachments yet, and imports don't use JEV or add to your classification feedback.

## Running it again

Items get IDs from their source, so re-running the import only adds what's new and never overwrites your edits. To undo an import, stop the server and restore the backup from step 4.

If WhatsApp dates look wrong, the importer guessed the date order. Add `--date-order dmy` or `--date-order mdy` to each command.
