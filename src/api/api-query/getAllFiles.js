import { opendir } from 'node:fs/promises';
import path from 'node:path';
import { ignoreExtSet, ignoreFileSet } from '../constant.js';
import { getExtname } from '../module/index.js';

export async function getAllFiles(inDir) {
  const dirIter = await opendir(inDir);
  const fileList = []
  const dirList = []

  for await (const dirent of dirIter) {
    //console.log(' '.repeat(), dirent.name)

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
        fileList.push({
          name: dirent.name,
          fullPath: path.join(dirent.parentPath, dirent.name),
        })
      }
      
    }
  }

  const fileListList = await Promise.all(
    dirList.map((dirPath) => getAllFiles(dirPath))
  )

  return fileListList.flat().concat(fileList)
}
