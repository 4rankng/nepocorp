import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';

export class LocalStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = config.uploadDir || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(fileBuffer: Buffer, key: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, fileBuffer);
    return key;
  }

  async getSignedUrl(key: string): Promise<string> {
    // Return relative URL serving via authenticated route or express static
    return `/api/photos/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

export const storageService = new LocalStorageService();
