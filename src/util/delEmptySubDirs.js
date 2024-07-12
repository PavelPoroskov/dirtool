import { opendir, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { runOperationsWithConcurrencyLimit20 } from './runOperationsWithConcurrencyLimit.js';

async function getDirs(inDir, level=0) {
  const dirIter = await opendir(inDir);
  const dirList = []
  const isHasFiles = false

  for await (const dirent of dirIter) {
    if (dirent.isDirectory()) {
      dirList.push(
        path.join(dirent.parentPath, dirent.name)
      )
    } else if (dirent.isFile()) {
      isHasFiles = true
    }
  }

  const dirListList = await Promise.all(
    dirList.map((dirPath) => getDirs(dirPath, level + 1))
  )

  return dirListList
    .flat()
    .concat({
      fullPath: inDir,
      isHasFiles: isHasFiles || dirListList.some(({ isHasFiles }) => isHasFiles === true),
      level,
    })
}

export async function delEmptySubDirs(inFullPath) {
  const dirList = await getDirs(sourceDir)
  const deleteList = dirList
    .filter((i) => !i.isHasFiles && i.level > 0)
    // .toSorted((a,b) => -(a.level - b.level))

  const groupedObj = Object.groupBy(deleteList, ({ level }) => level);

  const keysDesc = Object.keys(groupedObj).toSorted((a,b) => -(+a -b))

  for (const level of keysDesc) {
    await runOperationsWithConcurrencyLimit20({
      operationArgumentsList: groupedObj[level],
      asyncOperation: ({ fullPath }) => rmdir(fullPath),
    })
  }

  // sort desc by level
  // remove dirs without files

  // fileList.sort((a,b) => a.fullPath.localeCompare(b.fullPath))
  // console.log('subdirectories: full path', path.resolve(inFullPath))
  console.log('subdirectories: all', dirList.length - 1)
  console.log('subdirectories, can delete:', deleteList.length)
  console.log()

  const nRestDirs = dirList.length - 1 - deleteList.length
  console.log(`${nRestDirs} dirs are left in source directory.`)
}
