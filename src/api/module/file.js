import fsP from 'node:fs/promises';
import fs, { unwatchFile } from 'node:fs';
import crypto from 'node:crypto';

export async function getFileSize(inFullPath) {
  const fileStats = await fsP.stat(inFullPath);

  return  fileStats.size
}


export async function getFirstNBytes(inFullPath) {
  let filehandle;

  try {
    filehandle = await fsP.open(inFullPath);
    const buf = Buffer.alloc(1024);
    await filehandle.read(buf)
    await filehandle.close();
    filehandle = undefined

    return buf.toString('hex')
  } finally {
    await filehandle?.close();
  } 
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

export const getExtname = (s) => {
  let result = ''
  let arAfterName = []

  const arr = s.split('.')
  const [first, second] = arr

  if (first) {
    // all from 1.. can be extension
    arAfterName = arr.slice(1)
  } else if (second) {
    // all from 2.. can be extension
    arAfterName = arr.slice(2)
  }

  const ext1 = arAfterName.at(-1)
  const ext2 = arAfterName.at(-2)

  if (ext1) {
    result = `.${ext1}`

    if (ext2 === 'fb2' && ext1 === 'zip') {
      result = `.${ext2}.${ext1}`
    } else if  (ext2 === 'rs' && ext1 === 'txt') { 
      result = `.${ext2}.${ext1}`
    }
  }

  // .gitignore =>  ''
  // .eslint.rc => .rc
  // 11.fb2.zip => .fb2.zip

  return result
}

export const getNameWithoutExt = (basename) => {
  // const basename = path.basename(inS)
  const ext = getExtname(basename)

  return basename.slice(0, basename.length - ext.length)
}

export async function deleteFile(inFullPath) {
  await fsP.unlink(inFullPath);
}

export async function isExist(inFullPath) {
  let result = false

  try {
    await fsP.access(inFullPath, fsP.constants.R_OK | fsP.constants.W_OK);
    result = true
  } catch {
    result = false
  } 
  
  return result
}