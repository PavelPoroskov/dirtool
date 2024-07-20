import { opendir } from 'node:fs/promises';
import path from 'node:path';
import { ignoreExtSet, ignoreFileSet } from '../constant.js';
import { ExtraMap, getExtname, getFileHashMD5, getFileSize, getFirstNBytes, runOperationsWithConcurrencyLimit20 } from '../module/index.js';

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

export async function getFileBySizeMap(fullPathList, fileByFullPathMap) {
  const resultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: fullPathList,
    asyncOperation: async (fullPath) => {
      const size = await getFileSize(fullPath)

      return {
        fullPath,
        size,
      }
    },
  })

  const fileByKey = new ExtraMap()
  resultList.forEach(({ fullPath, size }) => {
    fileByFullPathMap.update( fullPath, { size })

    fileByKey.push(size, fullPath)
  })

  return fileByKey
}

export async function getFileBySizeAndFirstNBytesMap(fullPathList, fileByFullPathMap) {
  const resultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: fullPathList,
    asyncOperation: async (fullPath) => {
      const firstNBytes = await getFirstNBytes(fullPath)

      return {
        fullPath,
        firstNBytes,
      }
    },
  })

  const fileByKey = new ExtraMap()
  resultList.forEach(({ fullPath, firstNBytes }) => {
    fileByFullPathMap.update( fullPath, { firstNBytes })

    const { size } = fileByFullPathMap.get(fullPath)
    const key = `${size}#${firstNBytes}`
    fileByKey.push(key, fullPath)
  })

  return fileByKey
}

export async function getFileByHashMD5Map(fullPathList, fileByFullPathMap) {
  const resultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: fullPathList,
    asyncOperation: async (fullPath) => {
      const hashMD5 = await getFileHashMD5(fullPath)

      return {
        fullPath,
        hashMD5,
      }
    },
  })

  const fileByKey = new ExtraMap()
  resultList.forEach(({ fullPath, hashMD5 }) => {
    fileByFullPathMap.update( fullPath, { hashMD5 })

    fileByKey.push(hashMD5, fullPath)
  })

  return fileByKey
}
