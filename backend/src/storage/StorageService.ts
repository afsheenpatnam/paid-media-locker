export interface StorageService {
  saveOriginal(key: string, buffer: Buffer): Promise<void>;
  savePreview(key: string, buffer: Buffer): Promise<void>;
  readOriginal(key: string): Promise<Buffer>;
  readPreview(key: string): Promise<Buffer>;
}
