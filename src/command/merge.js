import { existsSync } from 'node:fs';
import { opendir } from 'node:fs/promises';
import path from 'node:path';
import { logDebug } from '../util/log.js';
import { getFileSize, getFileHashMD5, deleteFile } from '../util/file-util.js';
import { delEmptySubDirs } from '../util/delEmptySubDirs.js';
import { runOperationsWithConcurrencyLimit } from '../util/runOperationsWithConcurrencyLimit.js';

const CONCURRENCY_LIMIT = 20

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

async function mergeDir({ sourceDir, destDir, isDelete }) {
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
      destFileByName[name].push({ fullPath, level })
    } else {
      destFileByName[name] = [{ fullPath, level }]
    }
  })

  const checkSizeList = []
  sourceFilList.forEach(({ fullPath: sourceFullPath, name, level }) => {
    if (destFileByName[name]) {
      const [{ fullPath: destFullPath }] = destFileByName[name]
      
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

      return {
        sourceFullPath,
        sourceFileSize, 
        destFullPath, 
        destFileSize,
      }
    },
    concurrencyLimit: CONCURRENCY_LIMIT,
  })

  checkSizeResultList.forEach(({ sourceFullPath, sourceFileSize, destFullPath, destFileSize }) => {
    if (sourceFileSize === destFileSize) {
      // logDebug('EXIST', sourceFullPath, sourceFileSize, destFileSize)
      sourceFileByFullPath[sourceFullPath].isDouble = true
      nTheSameFileByNameAndSize += 1
    }

    sourceFileByFullPath[sourceFullPath].size = sourceFileSize
    destFileByFullPath[destFullPath].size = destFileSize
  })

  const getSizeAndHashSourceList = sourceFilList
    .filter(({ fullPath }) => !sourceFileByFullPath[fullPath].isDouble)
  const getSizeSourceResultList = await runOperationsWithConcurrencyLimit({
    arOperationArguments: getSizeAndHashSourceList,
    asyncOperation: async ({ fullPath }) => {
      const size = await getFileSize(fullPath)

      return {
        fullPath,
        size,
      }
    },
    concurrencyLimit: CONCURRENCY_LIMIT,
  })
  getSizeSourceResultList.forEach(({ fullPath, size }) => {
    sourceFileByFullPath[fullPath].size = size
  })

  const getHashSourceResultList = await runOperationsWithConcurrencyLimit({
    arOperationArguments: getSizeAndHashSourceList,
    asyncOperation: async ({ fullPath }) => {
      const hashMD5 = await getFileHashMD5(fullPath)

      return {
        fullPath,
        hashMD5,
      }
    },
    concurrencyLimit: CONCURRENCY_LIMIT,
  })
  getHashSourceResultList.forEach(({ fullPath, hashMD5 }) => {
    sourceFileByFullPath[fullPath].hashMD5 = hashMD5
  })  

  const getSizeDestResultList = await runOperationsWithConcurrencyLimit({
    arOperationArguments: destFilList,
    asyncOperation: async ({ fullPath }) => {
      const size = await getFileSize(fullPath)

      return {
        fullPath,
        size,
      }
    },
    concurrencyLimit: CONCURRENCY_LIMIT,
  })
  getSizeDestResultList.forEach(({ fullPath, size }) => {
    destFileByFullPath[fullPath].size = size
  })

  // const getHashDestResultList = await runOperationsWithConcurrencyLimit({
  //   arOperationArguments: destFilList,
  //   asyncOperation: async ({ fullPath }) => {
  //     const hashMD5 = await getFileHashMD5(fullPath)

  //     return {
  //       fullPath,
  //       hashMD5,
  //     }
  //   },
  //   concurrencyLimit: CONCURRENCY_LIMIT,
  // })
  // getHashDestResultList.forEach(({ fullPath, hashMD5 }) => {
  //   destFileByFullPath[fullPath].hashMD5 = hashMD5
  // })  
  const destFileBySize = {}
  Object.entries(destFileByFullPath).forEach(([fullPath, { size }]) => {
    if (destFileBySize[size]) {
      destFileBySize[size].push(fullPath)
    } else {
      destFileBySize[size] = [fullPath]
    }
  })

  const getHashDestObj = {}
  getSizeAndHashSourceList.forEach(({ fullPath }) => {
    const { size } = sourceFileByFullPath[fullPath]

    if (destFileBySize[size]) {
      destFileBySize[size].forEach((destFullPath) => {
        getHashDestObj[destFullPath] = true
      })
    }
  })
  const getHashDestResultList = await runOperationsWithConcurrencyLimit({
    arOperationArguments: Object.keys(getHashDestObj),
    asyncOperation: async (fullPath) => {
      const hashMD5 = await getFileHashMD5(fullPath)

      return {
        fullPath,
        hashMD5,
      }
    },
    concurrencyLimit: CONCURRENCY_LIMIT,
  })
  getHashDestResultList.forEach(({ fullPath, hashMD5 }) => {
    destFileByFullPath[fullPath].hashMD5 = hashMD5
  })

  const destFileByHash = Object.fromEntries(
    Object.entries(destFileByFullPath)
      .filter(([_, { hashMD5 }]) => hashMD5)
      .map(([fullPath, { name, size, hashMD5 }]) => [hashMD5, { name, size, fullPath }])
  )

  getSizeAndHashSourceList.forEach(({ fullPath }) => {
    const { hashMD5 } = sourceFileByFullPath[fullPath]

    if (destFileByHash[hashMD5]) {
      sourceFileByFullPath[fullPath].isDouble = true
      nTheSameFileByHash += 1
    }
  })

  const nRestFile = sourceFilList.length - nTheSameFileByNameAndSize - nTheSameFileByHash
  console.log(`The same files (by name and size) were in source and dest dir ${nTheSameFileByNameAndSize}.`)
  console.log(`The same files (by size and hash) were in source and dest dir ${nTheSameFileByHash}.`)
  console.log(`The same files total ${nTheSameFileByNameAndSize + nTheSameFileByHash}.`)

  // TODO remove files
  
  if (isDelete) {
    const removeFileList = Object.entries(sourceFileByFullPath)
      .filter(([fullPath, { isDouble }]) => isDouble)
      .map(([fullPath]) => fullPath)
    console.log(`To remove files from source dir ${removeFileList.size}`)

    await runOperationsWithConcurrencyLimit({
      arOperationArguments: removeFileList,
      asyncOperation: deleteFile,
      concurrencyLimit: CONCURRENCY_LIMIT,
    })
    console.log('The same files were removed from source directory')

    // TODO remove empty subdirs in source dir
    // await delEmptySubDirs(sourceDir)
    console.log('Empty subdirectories was removed from source dir.')
  }

  console.log()
  console.log(`${nRestFile} files are left in source directory.`)
}

export async function mergeCommand() {
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  // const isDelete = !!(argumentsAfterCommand.find((arg) => arg === '-R'))
  const isDelete = true
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const [sourceDir, destDir] = argumentsWithoutKeys

  const isSourceDirExist = !!sourceDir && existsSync(sourceDir)
  const isDestDirExist = !!destDir && existsSync(destDir)

  if (command === 'merge' && isSourceDirExist && isDestDirExist) {
    await mergeDir({ sourceDir, destDir, isDelete })
  } else {
    console.log('usage: ')
    console.log(' dirtool merge [-R] source-dir dest-dir')
    console.log('   -R -- Delete files in source directory that exist in dest directory. Delete empty subdirectories in source directory.')

    process.exit(1)
  }
}
