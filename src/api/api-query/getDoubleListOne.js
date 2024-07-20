import { ExtraMap } from '../module/index.js';
import { getAllFiles, getFileByHashMD5Map, getFileBySizeAndFirstNBytesMap, getFileBySizeMap } from './getDoubleList.js';

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