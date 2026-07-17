import fs from "fs/promises";
import path from "path";
import { env } from "../config/env";
import { StorageService } from "./StorageService";

// Files live outside any Express static/public directory, so the only way to
// reach them is through the authenticated controller routes in the media
// module -- there is no static file route that serves these folders.
export class LocalDiskStorage implements StorageService {
  private async ensureDirs() {
    await fs.mkdir(env.storageOriginalsDir, { recursive: true });
    await fs.mkdir(env.storagePreviewsDir, { recursive: true });
  }

  async saveOriginal(key: string, buffer: Buffer): Promise<void> {
    await this.ensureDirs();
    await fs.writeFile(path.join(env.storageOriginalsDir, key), buffer);
  }

  async savePreview(key: string, buffer: Buffer): Promise<void> {
    await this.ensureDirs();
    await fs.writeFile(path.join(env.storagePreviewsDir, key), buffer);
  }

  async readOriginal(key: string): Promise<Buffer> {
    return fs.readFile(path.join(env.storageOriginalsDir, key));
  }

  async readPreview(key: string): Promise<Buffer> {
    return fs.readFile(path.join(env.storagePreviewsDir, key));
  }
}

export const storageService: StorageService = new LocalDiskStorage();
