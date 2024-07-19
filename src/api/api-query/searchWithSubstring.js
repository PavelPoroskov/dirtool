import { opendir } from 'node:fs/promises';
import path from 'node:path';
import { ignoreExtSet } from '../constant.js';
import { getExtname } from '../module/index.js';

export async function searchWithSubstring({ dir, substring, regexp }) {
  const fullPathList = []

  const regexpObj = regexp ? new RegExp(regexp) : undefined

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

        } else {
        /* eslint-enable no-empty */
          let isAdd = false
          if (substring) {
            if (dirent.name.includes(substring)) {
              isAdd = true
            }
          } else if (regexpObj) {
            if (regexpObj.test(dirent.name)) {
              isAdd = true
            }
          }

          if (isAdd) {
            fullPathList.push(
              path.join(dirent.parentPath, dirent.name)
            )
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

  await traverseDir(dir)

  return fullPathList
    .sort((a,b) => a.localeCompare(b))
}
