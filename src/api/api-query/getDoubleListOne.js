import { getAllFiles } from './getAllFiles.js';
import { runOperationsWithConcurrencyLimit20, getFileSize, getFirstNBytes, getFileHashMD5 } from '../module/index.js';

export async function getDoubleListOne(sourceDir) {
  const fileList = await getAllFiles(sourceDir)
  // fileList.sort((a,b) => a.fullPath.localeCompare(b.fullPath))
  console.log('source dir: full path', sourceDir)
  console.log('source dir: all files', fileList.length)
  // console.log('source dir: all files', fileList)
  console.log()

  const fileByFullPath = Object.fromEntries(
    fileList.map(({ fullPath, name }) => [fullPath, { name }])
  )

  const getSizeResultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: fileList,
    asyncOperation: async ({ fullPath }) => {
      const size = await getFileSize(fullPath)

      return {
        fullPath,
        size,
      }
    },
  })
  getSizeResultList.forEach(({ fullPath, size }) => {
    fileByFullPath[fullPath].size = size
  })

  const fileBySize = {}
  fileList.forEach(({ fullPath }) => {
    const key = fileByFullPath[fullPath].size

    if (fileBySize[key]) {
      fileBySize[key].push(fullPath)
    } else {
      fileBySize[key] = [fullPath]
    }
  })

  const checkFirstNBytesList = []
  Object.entries(fileBySize).forEach(([size, fullPathList]) => {
    if (fullPathList.length > 0) {
      checkFirstNBytesList.push({
        size,
        fullPathList,
      })
    }
  })
  
  const getFirstNBytesResultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: checkFirstNBytesList.flatMap(({ fullPathList }) => fullPathList),
    asyncOperation: async (fullPath) => {
      const firstNBytes = await getFirstNBytes(fullPath)

      return {
        fullPath,
        firstNBytes,
      }
    },
  })
  getFirstNBytesResultList.forEach(({ fullPath, firstNBytes }) => {
    fileByFullPath[fullPath].firstNBytes = firstNBytes
  })

  const fileBySizeAndFirstNBytes = {}
  checkFirstNBytesList.forEach(({ size, fullPathList }) => {
    fullPathList.forEach((fullPath) => {
      const { firstNBytes } = fileByFullPath[fullPath]
      const key = `${size}#${firstNBytes}`

      if (fileBySizeAndFirstNBytes[key]) {
        fileBySizeAndFirstNBytes[key].push(fullPath)
      } else {
        fileBySizeAndFirstNBytes[key] = [fullPath]
      }
    })
  })

  const checkHashList = []
  Object.entries(fileBySizeAndFirstNBytes).forEach(([key, fullPathList]) => {
    if (fullPathList.length > 0) {
      checkHashList.push({
        key,
        fullPathList,
      })
    }
  })

  const getHashResultList = await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: checkHashList.flatMap(({ fullPathList }) => fullPathList),
    asyncOperation: async (fullPath) => {
      const hashMD5 = await getFileHashMD5(fullPath)

      return {
        fullPath,
        hashMD5,
      }
    },
  })
  getHashResultList.forEach(({ fullPath, hashMD5 }) => {
    fileByFullPath[fullPath].hashMD5 = hashMD5
  })

  const doubleListList = []
  checkHashList.forEach(({ fullPathList }) => {
    const fileByHash = {}

    fullPathList.forEach((fullPath) => {
      const key = fileByFullPath[fullPath].hashMD5

      if (fileByHash[key]) {
        fileByHash[key].push(fullPath)
      } else {
        fileByHash[key] = [fullPath]
      }
    })

    Object.entries(fileByHash)
      .filter(([key, fullPathList]) => fullPathList.length > 1)
      .forEach(([key, fullPathList]) => {
        doubleListList.push(fullPathList)
      })
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