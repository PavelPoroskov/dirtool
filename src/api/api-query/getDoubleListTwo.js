
import { ExtraMap } from '../module/index.js';
import { getAllFiles, getFileBySizeMap, getFileBySizeAndFirstNBytesMap, getFileByHashMD5Map } from './getDoubleList.js';

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
