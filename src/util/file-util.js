import fsP from 'node:fs/promises';
import fs from 'node:fs';
import crypto from 'node:crypto';

export async function getFileSize(inFullPath) {
  const fileStats = await fsP.stat(inFullPath);

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

export async function deleteFile(inFullPath) {
  await fsP.unlink(inFullPath);
}

export async function isDirExist(inFullPath) {
  let result = false

  try {
    await fsP.access(inFullPath);
    result = true
  } catch {
    result = false
  } 
  
  return result
}