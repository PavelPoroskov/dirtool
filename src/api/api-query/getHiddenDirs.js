import { opendir } from 'node:fs/promises';
import path from 'node:path';

export async function getHiddenDirs(inDir) {
  const dirIter = await opendir(inDir);
  const dirList = []
  const hiddenDirList = []

  for await (const dirent of dirIter) {
    if (dirent.isDirectory()) {
      if (dirent.name.startsWith('.') || dirent.name === '__MACOSX' || dirent.name === 'node_modules') {
        hiddenDirList.push(
          path.join(dirent.parentPath, dirent.name),
        )
      } else {
        dirList.push(
          path.join(dirent.parentPath, dirent.name)
        )
      }
    }
  }

  const dirListList = await Promise.all(
    dirList.map((dirPath) => getHiddenDirs(dirPath))
  )
  const dirListListFlat = dirListList.flat()

  return dirListListFlat
    .concat(hiddenDirList)
}
