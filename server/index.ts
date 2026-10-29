import { createApp } from "./app";
import { CategoryRepo } from "./categories";
import { config } from "./config";
import { ItemRepo } from "./items";
import { SearchIndex } from "./search";
import { SettingsRepo } from "./settings";

const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function main() {
  const categories = new CategoryRepo(config.dataDir, config.seedCategoriesFile);
  await categories.load();

  const items = new ItemRepo(config.dataDir, categories);
  await items.load();

  const settings = new SettingsRepo(config.dataDir);
  await settings.load();

  const search = new SearchIndex(items, categories);

  // Removal job: on startup, then once a day.
  const purge = () =>
    items
      .purgeDeleted()
      .then((n) => n > 0 && console.log(`Purged ${n} deleted item${n === 1 ? "" : "s"} past the 30-day hold.`))
      .catch((err) => console.error("Purge failed:", err));
  await purge();
  setInterval(purge, PURGE_INTERVAL_MS);

  const app = createApp({ categories, items, settings, search, distDir: config.distDir });
  app.listen(config.port, config.host, () => {
    console.log(`Overplanner API on http://${config.host}:${config.port} (data: ${config.dataDir})`);
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
