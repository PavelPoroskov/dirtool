import { opendir } from 'node:fs/promises';
import path from 'node:path';
import { ignoreExtSet, ignoreFileSet } from '../constant.js';
import { getExtname, getNameWithoutExt } from '../module/index.js';

export async function getTheSameName(inFullPath) {
  const nameList = {}

  async function traverseDir(inDir) {
    const dirIter = await opendir(inDir);
    const dirList = []
  
    for await (const dirent of dirIter) {
      if (dirent.isDirectory()) {
        if (dirent.name.startsWith('.') || dirent.name === '__MACOSX') {
          // console.log('IGNORING DIR', path.join(dirent.parentPath, dirent.name))
        } else {
          dirList.push(
            path.join(dirent.parentPath, dirent.name)
          )
        }
      } else if (dirent.isFile()) {
        const ext = getExtname(dirent.name)

        /* eslint-disable no-empty */
        if (ignoreExtSet.has(ext)) {

        } else if (ignoreFileSet.has(dirent.name)) {

        } else if (dirent.name.startsWith('.')) {

        } else {
        /* eslint-enable no-empty */
          const name = getNameWithoutExt(dirent.name)

          if (nameList[name]) {
            nameList[name].push(path.join(dirent.parentPath, dirent.name))
          } else {
            nameList[name] = [path.join(dirent.parentPath, dirent.name)]
          }
        }
      }
    }

    await Promise.all(
      dirList.map(
        (fullPath) => traverseDir(fullPath)
      )
    )
  }

  await traverseDir(inFullPath)

  return Object.entries(nameList)
    .filter(([, list]) => list.length > 1)
    .map(([name, fullPathList]) => {
      const sorted = fullPathList.sort((a,b) => a.localeCompare(b))

      return {
        name,
        first: sorted[0],
        fullPathList: sorted,
      }
    })
    .sort((a,b) => a.first.localeCompare(b.first))
  
}
