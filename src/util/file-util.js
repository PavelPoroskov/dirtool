import fs from 'node:fs/promises';
import crypto from 'node:crypto';

export async function getFileSize(inFullPath) {
  const fileStats = await fs.stat(inFullPath);

  return  fileStats.size
}

export async function getFileHashMD5(inFullPath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(inFullPath);
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}