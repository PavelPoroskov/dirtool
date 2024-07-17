import { opendir } from 'node:fs/promises';
import path from 'node:path';

async function getDirs(inDir, level=0) {
    const dirIter = await opendir(inDir);
    const dirList = []
    let isEmpty = true
  
    for await (const dirent of dirIter) {
      if (dirent.isDirectory()) {
        dirList.push(
          path.join(dirent.parentPath, dirent.name)
        )
      } else if (dirent.isFile()) {
        isEmpty = false
      }
    }
  
    const dirListList = await Promise.all(
      dirList.map((dirPath) => getDirs(dirPath, level + 1))
    )
    const dirListListFlat = dirListList.flat()
    const isAllSubDirsEmpty = dirListListFlat.every(({ isEmpty }) => isEmpty)
  
  
    if (isAllSubDirsEmpty && isEmpty) {
      return [{ fullPath: inDir, level, isEmpty: true }]
    } else {
      return [{ fullPath: inDir, level, isEmpty: false }].concat(
        dirListListFlat.filter(({ isEmpty }) => isEmpty)
      )
    }
  }
  
  export async function getEmptyDirs(inDir) {
    const dirList = await getDirs(inDir)
  
    return dirList
      .filter(({ isEmpty }) => isEmpty)
      .map(({ fullPath }) => fullPath)
  }