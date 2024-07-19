import { opendir } from 'node:fs/promises';
import path from 'node:path';

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
      // console.log(dirent.parentPath, dirent.name)
      fileList.push({
        // parentPath: dirent.parentPath,
        name: dirent.name,
        fullPath: path.join(dirent.parentPath, dirent.name),
      })
    }
  }

  const fileListList = await Promise.all(
    dirList.map((dirPath) => getAllFiles(dirPath))
  )

  return fileListList.concat(fileList)
    .flat()
}
