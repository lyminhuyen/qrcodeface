import * as fs from 'fs';
import * as path from 'path';

export function createLogger(logFile: string) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  return (message: string) => {
    console.log(message);
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
  };
}
