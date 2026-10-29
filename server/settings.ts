import path from "node:path";
import type { z } from "zod";
import { SettingsFileSchema, SettingsSchema, type SettingsPatchSchema } from "../shared/schemas";
import { DEFAULT_SETTINGS, type Settings } from "../shared/types";
import { readJsonFile, withWriteLock, writeJsonFile } from "./jsonFile";

export class SettingsRepo {
  private value: Settings = DEFAULT_SETTINGS;

  constructor(private readonly dataDir: string) {}

  private get file(): string {
    return path.join(this.dataDir, "settings.json");
  }

  async load(): Promise<void> {
    const stored = await readJsonFile(this.file, SettingsFileSchema, () => DEFAULT_SETTINGS);
    this.value = SettingsSchema.parse({ ...DEFAULT_SETTINGS, ...stored });
  }

  get(): Settings {
    return this.value;
  }

  update(patch: z.output<typeof SettingsPatchSchema>): Promise<Settings> {
    return withWriteLock(async () => {
      const next = SettingsSchema.parse({ ...this.value, ...patch });
      await writeJsonFile(this.file, SettingsSchema, next);
      this.value = next;
      return next;
    });
  }
}
