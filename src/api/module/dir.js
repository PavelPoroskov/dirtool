import fsP from 'node:fs/promises';
import path from 'node:path';
import { getFileSize  } from './file.js';

export async function isDirExist(inFullPath) {
  let result = false

  try {
    await fsP.access(inFullPath, fsP.constants.R_OK | fsP.constants.W_OK);
    const stats = await fsP.stat(inFullPath)

    result = stats.isDirectory()
  } catch {
    result = false
  } 

  if (!result) {
    console.log('Error Not is Directory:', inFullPath)
  }
  
  return result
}


async function getAllFiles(inDir) {
  const dirIter = await fsP.opendir(inDir);
  const fileList = []
  const dirList = []

  for await (const dirent of dirIter) {
    if (dirent.isDirectory()) {
      dirList.push(
        path.join(dirent.parentPath, dirent.name)
      )
    } else if (dirent.isFile()) {
      fileList.push(
        path.join(dirent.parentPath, dirent.name),
      )
    }
  }

  const fileListList = await Promise.all(
    dirList.map((dirPath) => getAllFiles(dirPath))
  )

  return fileListList.flat().concat(fileList)
}

export async function getDirSize(inDir) {
  const fileList = await getAllFiles(inDir)
  // console.log('getAllFiles fileList.length', fileList.length)
  // console.log(fileList)

  const fileSizeList = await Promise.all(
    fileList.map(
      (fullPath) => getFileSize(fullPath)
    )
  )
  const totalSize = fileSizeList.reduce((acc, item) => acc + item, 0)

  return totalSize
}