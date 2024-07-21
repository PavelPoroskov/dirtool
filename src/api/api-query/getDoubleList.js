import { ExtraMap, getFileHashMD5, getFileSize, getFirstNBytes, runOperationsWithConcurrencyLimit20 } from '../module/index.js';
import { getAllFiles } from './getAllFiles.js';

async function getFileBySizeMap(fullPathList, fileByFullPathMap) {
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

async function getFileBySizeAndFirstNBytesMap(fullPathList, fileByFullPathMap) {
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

async function getFileByHashMD5Map(fullPathList, fileByFullPathMap) {
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

export async function getDoubleListOne(sourceDir) {
  const fileList = await getAllFiles(sourceDir)
  // fileList.sort((a,b) => a.fullPath.localeCompare(b.fullPath))
  console.log('source dir: full path', sourceDir)
  console.log('source dir: all files', fileList.length)
  // console.log('source dir: all files', fileList)
  console.log()

  const fileByFullPathMap = new ExtraMap(
    fileList.map(({ fullPath, name }) => [fullPath, { name }])
  )

  const fileBySizeMap = await getFileBySizeMap(fileByFullPathMap.keys(), fileByFullPathMap)
  // Two file with size 0 will be double.
  // Remove files with size 0 from searching doubles. 
  fileBySizeMap.delete(0)

  const checkFirstNBytesList = []
  fileBySizeMap.forEach((fullPathList, size) => {
    if (fullPathList.length > 1) {
      checkFirstNBytesList.push({
        size,
        fullPathList,
      })
    }
  })
  
  const fileBySizeAndFirstNBytesMap = await getFileBySizeAndFirstNBytesMap(
    checkFirstNBytesList.flatMap(({ fullPathList }) => fullPathList),
    fileByFullPathMap,
  )

  const checkHashList = []
  fileBySizeAndFirstNBytesMap.forEach((fullPathList, key) => {
    if (fullPathList.length > 1) {
      checkHashList.push({
        key,
        fullPathList,
      })
    }
  })

  const fileByHashMap = await getFileByHashMD5Map(
    checkHashList.flatMap(({ fullPathList }) => fullPathList),
    fileByFullPathMap,
  )

  const doubleListList = []
  fileByHashMap.forEach((fullPathList) => {
    if (fullPathList.length > 1) {
      doubleListList.push(fullPathList)
    }
  })

  const originalAndDoubleList = doubleListList
    .map(
      (fullPathList) => fullPathList.sort((a,b) => a.localeCompare(b))
    ).map(
      (fullPathList) => ({ original: fullPathList[0], doubleList: fullPathList.slice(1) })
    ).sort((a,b) => a.original.localeCompare(b.original))

  return {
    fileListSize: fileList.length,
    originalAndDoubleList
  }
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

  const sourceFileBySizeMap = await getFileBySizeMap(sourceFileByFullPath.keys(), sourceFileByFullPath)
  // Two file with size 0 will be double.
  // Remove files with size 0 from searching doubles. 
  sourceFileBySizeMap.delete(0)

  const destFileBySizeMap = await getFileBySizeMap(destFileByFullPath.keys(), destFileByFullPath)

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
  
  const sourceFileBySizeAndFirstNBytesMap = await getFileBySizeAndFirstNBytesMap(
    checkFirstNBytesList.flatMap(({ sourceFullPathList }) => sourceFullPathList),
    sourceFileByFullPath,
  )
  const destFileBySizeAndFirstNBytesMap = await getFileBySizeAndFirstNBytesMap(
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

  const sourceFileByHashMap = await getFileByHashMD5Map(
    checkHashList.flatMap(({ sourceFullPathList }) => sourceFullPathList),
    sourceFileByFullPath,
  )
  const destFileByHashMap = await getFileByHashMD5Map(
    checkHashList.flatMap(({ destFullPathList }) => destFullPathList),
    destFileByFullPath,
  )

  sourceFileByHashMap.forEach((sourceFullPathList, hash) => {
    if (destFileByHashMap.has(hash)) {
      sourceFullPathList.forEach((sourceFullPath) => {
        sourceFileByFullPath.update( sourceFullPath, { isDouble: true })
      })
    }
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
