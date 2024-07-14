import { opendir, rm } from 'node:fs/promises';
import path from 'node:path';
import { runOperationsWithConcurrencyLimit20 } from './runOperationsWithConcurrencyLimit.js';

async function getHiddenDir(inDir, level=0) {
  const dirIter = await opendir(inDir);
  const dirList = []
  const hiddenDirList = []

  for await (const dirent of dirIter) {
    if (dirent.isDirectory()) {
      if (dirent.name.startsWith('.') || dirent.name === '__MACOSX') {
        hiddenDirList.push({
          fullPath: path.join(dirent.parentPath, dirent.name),
          level
      })
      } else {
        dirList.push(
          path.join(dirent.parentPath, dirent.name)
        )
      }
    }
  }

  const dirListList = await Promise.all(
    dirList.map((dirPath) => getHiddenDir(dirPath, level + 1))
  )
  const dirListListFlat = dirListList.flat()

  return dirListListFlat
    .concat(hiddenDirList)
}

export async function delHiddenDirs(inFullPath) {
  const dirList = await getHiddenDir(inFullPath)
  console.log('hidden dirs:', dirList.length)

  await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: dirList,
    asyncOperation: ({ fullPath }) => rm(fullPath, { recursive: true }),
  })
  console.log('hidden dirs was deleted')
}
