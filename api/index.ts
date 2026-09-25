import app from '../server/index';
import { initDatabase } from '../server/db';

let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    try {
      await initDatabase();
      initialized = true;
    } catch (err: any) {
      console.error('[Vercel API DB Init Error]:', err);
    }
  }
  return app(req, res);
}
