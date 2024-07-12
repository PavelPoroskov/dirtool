import { existsSync } from 'node:fs';
import { opendir } from 'node:fs/promises';
import path from 'node:path';
import { logDebug } from '../util/log.js';
import { getFileSize } from '../util/file-util.js';
import { delEmptySubDirs } from '../util/delEmptySubDirs.js';
import { runOperationsWithConcurrencyLimit } from '../util/runOperationsWithConcurrencyLimit.js';

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

async function mergeDir({ sourceDir, destDir }) {
  const sourceFilList = await getAllFiles(sourceDir)
  // fileList.sort((a,b) => a.fullPath.localeCompare(b.fullPath))
  console.log('source dir: full path', path.resolve(sourceDir))
  console.log('source dir: all files', sourceFilList.length)
  console.log()

  const destFilList = await getAllFiles(destDir)
  // fileList.sort((a,b) => a.fullPath.localeCompare(b.fullPath))
  console.log('dest dir: full path', path.resolve(destDir))
  console.log('dest dir: all files', destFilList.length)
  console.log()
  // console.log('all files', fileList)

  const sourceFileByFullPath = Object.fromEntries(
    sourceFilList.map(({ fullPath, name, level }) => [fullPath, { name, level }])
  )

  let nTheSameFileByNameAndSize = 0
  let nTheSameFileByHash = 0

  const destFileByFullPath = Object.fromEntries(
    destFilList.map(({ fullPath, name, level }) => [fullPath, { name, level }])
  )
  const destFileByName = {}
  destFilList.forEach(({ fullPath, name, level }) => {
    if (destFileByName[name]) {
      destFileByName[name] = [].concat(destFileByName[name], { fullPath, level })
    } else {
      destFileByName[name] = { fullPath, level }
    }
  })

  const checkSizeList = []
  sourceFilList.forEach(({ fullPath: sourceFullPath, name, level }) => {
    if (destFileByName[name]) {
      const destFile = destFileByName[name]
      const { fullPath: destFullPath } = Array.isArray(destFile)
        ? destFile[0]
        : destFile
      
      checkSizeList.push({
        name,
        sourceFullPath,
        destFullPath,
      })
    }
  })

  const checkSizeResultList = await runOperationsWithConcurrencyLimit({
    arOperationArguments: checkSizeList,
    asyncOperation: async ({ sourceFullPath, destFullPath }) => {
      const [sourceFileSize, destFileSize] = await Promise.all([
        getFileSize(sourceFullPath),
        getFileSize(destFullPath)
      ])

      if (sourceFileSize === destFileSize) {
        logDebug('EXIST', sourceFullPath, sourceFileSize, destFileSize)
        return { sourceFullPath }
      }
    },
    concurrencyLimit: 20,
  })

  checkSizeResultList.filter(Boolean).forEach(({ sourceFullPath }) => {
    sourceFileByFullPath[sourceFullPath].isDouble = true
    nTheSameFileByNameAndSize += 1
  })

  const nRestFile = sourceFilList.length - nTheSameFileByNameAndSize - nTheSameFileByHash
  console.log(`The same files (by name and size) were in source and dest dir ${nTheSameFileByNameAndSize}.`)
  console.log(`The same files (by size and hash) were in source and dest dir ${nTheSameFileByHash}.`)
  console.log(`The same files total ${nTheSameFileByNameAndSize + nTheSameFileByHash}.`)

  // TODO remove files
  console.log('The same files were removed from source directory')

  // TODO remove empty subdirs in source dir
  // await delEmptySubDirs(sourceDir)
  console.log('Empty subdirectories was removed from source dir.')
  console.log()

  console.log(`${nRestFile} files are left in source directory.`)
}

export async function mergeCommand() {
  const [_, __, command, sourceDir, destDir, filter] = process.argv

  const isSourceDirExist = !!sourceDir && existsSync(sourceDir)
  const isDestDirExist = !!destDir && existsSync(destDir)

  if (command === 'merge' && isSourceDirExist && isDestDirExist) {
    await mergeDir({ sourceDir, destDir })
  } else {
    console.log('usage: ')
    console.log(' dirtool merge source-dir dest-dir')

    process.exit(1)
  }
}
