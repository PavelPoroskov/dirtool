import { existsSync } from 'node:fs';
import { opendir } from 'node:fs/promises';
import path from 'node:path';

async function getAllFiles(inDir, level=0) {
  const dirIter = await opendir(inDir);
  const fileList = []
  const dirList = []

  for await (const dirent of dirIter) {
    //console.log(' '.repeat(), dirent.name)

    if (dirent.isDirectory()) {
      if (dirent.name.startsWith('.')) {
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
        level
      })
    }
  }

  const fileListList = await Promise.all(
    dirList.map((dirPath) => getAllFiles(dirPath, level + 1))
  )

  return fileListList.concat(fileList)
    .flat()
}

export async function delEmptySubDirs(inFullPath) {
  const sourceFilList = await getAllFiles(sourceDir)
  // fileList.sort((a,b) => a.fullPath.localeCompare(b.fullPath))
  console.log('source dir: full path', path.resolve(sourceDir))
  console.log('source dir: all files', sourceFilList.length)
  console.log()


  let nTheSameFile = 0

  const nRestFile = sourceFilList.length - nTheSameFile
  console.log(`The same files were in source and dest dir ${nTheSameFile}. They were removed from source directory`)
  console.log(`${nRestFile} files are left in source directory.`)
}
