
import { ExtraMap, getFileHashMD5, getFileSize, getFirstNBytes, runOperationsWithConcurrencyLimit20 } from '../module/index.js';
import { getAllFiles } from './getAllFiles.js';

async function getFileBySize(fullPathList, fileByFullPathMap) {
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

async function getFileBySizeAndFirstNBytes(fullPathList, fileByFullPathMap) {
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

async function getHashMD5ForList(fullPathList, fileByFullPathMap) {
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

  resultList.forEach(({ fullPath, hashMD5 }) => {
    fileByFullPathMap.update( fullPath, { hashMD5 })
  })
}

export async function getDoubleListTwo({ sourceDir, destDir }) {
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

  const sourceFileByFullPath = new ExtraMap(
    sourceFileList.map(({ fullPath, name }) => [fullPath, { name }])
  )
  const destFileByFullPath = new ExtraMap(
    destFilList.map(({ fullPath, name }) => [fullPath, { name }])
  )

  const sourceFileBySizeMap = await getFileBySize(sourceFileByFullPath.keys(), sourceFileByFullPath)
  // Two file with size 0 will be double.
  // Remove files with size 0 from searching doubles. 
  sourceFileBySizeMap.delete(0)

  const destFileBySizeMap = await getFileBySize(destFileByFullPath.keys(), destFileByFullPath)

  const checkFirstNBytesList = []
  sourceFileBySizeMap.forEach((sourceFullPathList, size) => {
    if (destFileBySizeMap.has(size)) {
      checkFirstNBytesList.push({
        size,
        sourceFullPathList,
        destFullPathList: destFileBySizeMap.get(size),
      })
    }
  })
  
  const sourceFileBySizeAndFirstNBytesMap = await getFileBySizeAndFirstNBytes(
    checkFirstNBytesList.flatMap(({ sourceFullPathList }) => sourceFullPathList),
    sourceFileByFullPath,
  )
  const destFileBySizeAndFirstNBytesMap = await getFileBySizeAndFirstNBytes(
    checkFirstNBytesList.flatMap(({ destFullPathList }) => destFullPathList),
    destFileByFullPath,
  )

  const checkHashList = []
  sourceFileBySizeAndFirstNBytesMap.forEach((sourceFullPathList, key) => {
    if (destFileBySizeAndFirstNBytesMap.has(key)) {
      checkHashList.push({
        key,
        sourceFullPathList,
        destFullPathList: destFileBySizeAndFirstNBytesMap.get(key),
      })
    }
  })

  await getHashMD5ForList(
    checkHashList.flatMap(({ sourceFullPathList }) => sourceFullPathList),
    sourceFileByFullPath,
  )
  await getHashMD5ForList(
    checkHashList.flatMap(({ destFullPathList }) => destFullPathList),
    destFileByFullPath,
  )

  checkHashList.forEach(({ sourceFullPathList, destFullPathList }) => {
    const destHashSet = new Set(
      destFullPathList.map((destFullPath) => destFileByFullPath.get(destFullPath).hashMD5)
    )
    sourceFullPathList.forEach((sourceFullPath) => {
      if (destHashSet.has(sourceFileByFullPath.get(sourceFullPath).hashMD5)) {
        sourceFileByFullPath.update( sourceFullPath, { isDouble: true })
      }
    })
  })

  const sourceDoubleList = []
  sourceFileByFullPath.forEach(({ isDouble }, fullPath) => {
    if (isDouble) {
      sourceDoubleList.push(fullPath)
    }
  })

  return {
    sourceFileListSize: sourceFileList.length,
    sourceDoubleList
  }
}
