import { opendir } from 'node:fs/promises';
import path from 'node:path';
import { logDebug } from '../util/log.js';
import { getFileSize, getFileHashMD5, deleteFile, isDirExist } from '../util/file-util.js';
import { delEmptyDirs } from '../util/delEmptyDirs.js';
import { delHiddenDirs } from '../util/delHiddenDirs.js';

import { runOperationsWithConcurrencyLimit20 } from '../util/runOperationsWithConcurrencyLimit.js';
import { ExtraSet } from '../util/extra-set.js';

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

async function findDoubles({ sourceDir, destDir }) {
  const sourceFileList = await getAllFiles(sourceDir)
  // fileList.sort((a,b) => a.fullPath.localeCompare(b.fullPath))
  console.log('source dir: full path', sourceDir)
  console.log('source dir: all files', sourceFileList.length)
  // console.log('source dir: all files', sourceFileList)
  console.log()

  const destFilList = await getAllFiles(destDir)
  // fileList.sort((a,b) => a.fullPath.localeCompare(b.fullPath))
  console.log('dest dir: full path', destDir)
  console.log('dest dir: all files', destFilList.length)
  console.log()
  // console.log('all files', fileList)

  const sourceFileByFullPath = Object.fromEntries(
    sourceFileList.map(({ fullPath, name }) => [fullPath, { name }])
  )
  const destFileByFullPath = Object.fromEntries(
    destFilList.map(({ fullPath, name }) => [fullPath, { name }])
  )

  let nTheSameFileByNameAndHash = 0

  const destFileByName = {}
  destFilList.forEach(({ fullPath, name }) => {
    if (destFileByName[name]) {
      destFileByName[name].push(fullPath)
    } else {
      destFileByName[name] = [fullPath]
    }
  })

  const sourceFileByName = {}
  sourceFileList.forEach(({ fullPath, name }) => {
    if (sourceFileByName[name]) {
      sourceFileByName[name].push(fullPath)
    } else {
      sourceFileByName[name] = [fullPath]
    }
  })

  const checkNameAndHashList = []
  const getHashSourceSet = new ExtraSet()
  const getHashDestSet = new ExtraSet()
  Object.entries(sourceFileByName).forEach(([name, sourceFullPathList]) => {
    if (destFileByName[name]) {
      getHashSourceSet.addList(sourceFullPathList)
      getHashDestSet.addList(destFileByName[name])
      checkNameAndHashList.push({
        name,
        sourceFullPathList,
        destFullPathList: destFileByName[name],
      })
    }
  })
  
  const getHashForSourceResultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: getHashSourceSet.values(),
    asyncOperation: async (fullPath) => {
      const hashMD5 = await getFileHashMD5(fullPath)

      return {
        fullPath,
        hashMD5,
      }
    },
  })
  getHashForSourceResultList.forEach(({ fullPath, hashMD5 }) => {
    sourceFileByFullPath[fullPath].hashMD5 = hashMD5
  })

  const getHashForDestResultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: getHashDestSet.values(),
    asyncOperation: async (fullPath) => {
      const hashMD5 = await getFileHashMD5(fullPath)

      return {
        fullPath,
        hashMD5,
      }
    },
  })
  getHashForDestResultList.forEach(({ fullPath, hashMD5 }) => {
    destFileByFullPath[fullPath].hashMD5 = hashMD5
  })
  // console.log('checkNameAndHashList', checkNameAndHashList)
  // console.log('sourceFileByFullPath', sourceFileByFullPath)
  // console.log('destFileByFullPath', destFileByFullPath)

  checkNameAndHashList.forEach(({ sourceFullPathList, destFullPathList, name }) => {
    // console.log('checkNameAndHashList name', name)
    const destHashSet = new Set(
      destFullPathList.map((destFullPath) => destFileByFullPath[destFullPath].hashMD5)
    )
    // console.log('checkNameAndHashList destFullPathList', destFullPathList)
    // console.log('checkNameAndHashList destHashSet', destHashSet)
    sourceFullPathList.forEach((sourceFullPath) => {
      // console.log('checkNameAndHashList sourceFullPath', sourceFullPath, sourceFileByFullPath[sourceFullPath].hashMD5)
      if (destHashSet.has(sourceFileByFullPath[sourceFullPath].hashMD5)) {
        sourceFileByFullPath[sourceFullPath].isDouble = true
        nTheSameFileByNameAndHash += 1
      }
    })
  })


  let nTheSameFileBySizeAndHash = 0
  const checkSizeAndHashSourceList = sourceFileList
    .filter(({ fullPath }) => !sourceFileByFullPath[fullPath].isDouble)

  const getSizeSourceResultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: checkSizeAndHashSourceList,
    asyncOperation: async ({ fullPath }) => {
      const size = await getFileSize(fullPath)

      return {
        fullPath,
        size,
      }
    },
  })
  getSizeSourceResultList.forEach(({ fullPath, size }) => {
    sourceFileByFullPath[fullPath].size = size
  })
  const sourceFileBySize = {}
  Object.entries(sourceFileByFullPath).forEach(([fullPath, { size }]) => {
    if (size) {
      if (sourceFileBySize[size]) {
        sourceFileBySize[size].push(fullPath)
      } else {
        sourceFileBySize[size] = [fullPath]
      }
    }
  })


  const getSizeDestResultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: destFilList,
    asyncOperation: async ({ fullPath }) => {
      const size = await getFileSize(fullPath)

      return {
        fullPath,
        size,
      }
    },
  })
  getSizeDestResultList.forEach(({ fullPath, size }) => {
    destFileByFullPath[fullPath].size = size
  })
  const destFileBySize = {}
  Object.entries(destFileByFullPath).forEach(([fullPath, { size }]) => {
    if (destFileBySize[size]) {
      destFileBySize[size].push(fullPath)
    } else {
      destFileBySize[size] = [fullPath]
    }
  })

  const checkSizeAndHashList = []
  const getHashSource2Set = new ExtraSet()
  const getHashDest2Set = new ExtraSet()
  Object.entries(sourceFileBySize).forEach(([size, sourceFullPathList]) => {
    if (destFileBySize[size]) {
      getHashSource2Set.addList(
        sourceFullPathList.filter((fullPath) => !sourceFileByFullPath[fullPath].hashMD5)
      )
      getHashDest2Set.addList(
        destFileBySize[size].filter((fullPath) => !destFileByFullPath[fullPath].hashMD5)
      )
      checkSizeAndHashList.push({
        size,
        sourceFullPathList,
        destFullPathList: destFileBySize[size],
      })
    }
  })

  const getHashSourceResultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: getHashSource2Set.values(),
    asyncOperation: async (fullPath) => {
      const hashMD5 = await getFileHashMD5(fullPath)

      return {
        fullPath,
        hashMD5,
      }
    },
  })
  getHashSourceResultList.forEach(({ fullPath, hashMD5 }) => {
    sourceFileByFullPath[fullPath].hashMD5 = hashMD5
  })

  const getHashDestResultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: getHashDest2Set.values(),
    asyncOperation: async (fullPath) => {
      const hashMD5 = await getFileHashMD5(fullPath)

      return {
        fullPath,
        hashMD5,
      }
    },
  })
  getHashDestResultList.forEach(({ fullPath, hashMD5 }) => {
    destFileByFullPath[fullPath].hashMD5 = hashMD5
  })

  checkSizeAndHashList.forEach(({ sourceFullPathList, destFullPathList, size }) => {
    const destHashSet = new Set(
      destFullPathList.map((destFullPath) => destFileByFullPath[destFullPath].hashMD5)
    )
    sourceFullPathList.forEach((sourceFullPath) => {
      if (destHashSet.has(sourceFileByFullPath[sourceFullPath].hashMD5)) {
        sourceFileByFullPath[sourceFullPath].isDouble = true
        nTheSameFileBySizeAndHash += 1
      }
    })
  })

  console.log(`The same files (by name and hash) were in source and dest dir ${nTheSameFileByNameAndHash}.`)
  console.log(`The same files (by size and hash) were in source and dest dir ${nTheSameFileBySizeAndHash}.`)
  console.log(`The same files total ${nTheSameFileByNameAndHash + nTheSameFileBySizeAndHash}.`)

  return {
    sourceFileListSize: sourceFileList.length,
    sourceDoubleList: Object.entries(sourceFileByFullPath)
      .filter(([, { isDouble }]) => isDouble)
      .map(([fullPath]) => fullPath)
  }
}

export async function mergeCommand() {
  // console.log('process.argv', process.argv)
  const [_, __, command] = process.argv.slice(0,3)
  // console.log('process.argv.slice(0,3)', process.argv.slice(0,3))
  const argumentsAfterCommand = process.argv.slice(3)
  // console.log('argumentsAfterCommand', argumentsAfterCommand)
  const isDelete = !!(argumentsAfterCommand.find((arg) => arg === '-R'))
  // console.log('isDelete', isDelete)
  // const isDelete = true
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const [sourceDir, destDir] = argumentsWithoutKeys

  const isSourceDirExist = !!sourceDir && isDirExist(sourceDir)
  const isDestDirExist = !!destDir && isDirExist(destDir)

  if (command === 'merge' && isSourceDirExist && isDestDirExist) {
    const { sourceFileListSize, sourceDoubleList } = await findDoubles({
      sourceDir: path.resolve(sourceDir),
      destDir: path.resolve(destDir),
    })
    console.log(`To remove files from source dir ${sourceDoubleList.length}`)

    if (isDelete) {
      await runOperationsWithConcurrencyLimit20({
        operationArgumentsList: sourceDoubleList,
        asyncOperation: deleteFile,
      })
      console.log('The same files were removed from source directory')
    }  

    const nRestFile = sourceFileListSize - sourceDoubleList.length
    console.log()
    console.log(`${nRestFile} files are left in source directory.`)

    if (isDelete) {
      await delHiddenDirs(sourceDir)
      await delEmptyDirs(sourceDir)
    }  
  
  } else {
    console.log('usage: ')
    console.log(' dirtool merge [-R] source-dir dest-dir')
    console.log('   -R -- Delete files in source directory that exist in dest directory. Delete empty subdirectories in source directory.')

    process.exit(1)
  }
}
