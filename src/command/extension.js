import { opendir } from 'node:fs/promises';
import path from 'node:path';
import { ExtraMap, floorN, formatSize, getExtname, getFileSize, isDirExist, runOperationsWithConcurrencyLimit20 } from '../api/module/index.js';

async function getExtStatistics(inDir) {
  const sizeMap = new ExtraMap()
  const countMap = new ExtraMap()
  let totalCountDir = 0

  async function traverseDir(inDir) {
    const dirIter = await opendir(inDir);
    const fileList = []
    const dirList = []
  
    for await (const dirent of dirIter) {
      if (dirent.isDirectory()) {
        if (dirent.name.startsWith('.') || dirent.name === '__MACOSX') {
          // console.log('IGNORING DIR', path.join(dirent.parentPath, dirent.name))
        } else {
          dirList.push(
            path.join(dirent.parentPath, dirent.name)
          )
        }
      } else if (dirent.isFile()) {
        fileList.push({
          name: dirent.name,
          fullPath: path.join(dirent.parentPath, dirent.name),
        })
      }
    }

    const getSizeResultList = await runOperationsWithConcurrencyLimit20({
      operationArgumentsList: fileList,
      asyncOperation: async ({ fullPath, name }) => {
        const size = await getFileSize(fullPath)
  
        return {
          fullPath,
          name,
          size,
        }
      },
    })
    getSizeResultList.forEach(({ name, size }) => {
      // const ext = path.extname(fullPath)
      const ext = getExtname(name)
      sizeMap.sum(ext, size)
      countMap.sum(ext, 1)
    })
  
    totalCountDir += dirList.length
    await Promise.all(
      dirList.map(
        (fullPath) => traverseDir(fullPath)
      )
    )
  }

  await traverseDir(inDir)

  // console.log('countMap', countMap)
  // console.log('sizeMap', sizeMap)

  const totalCountFile = Array.from(countMap.values()).reduce((acc,add) => acc + add, 0)
  const totalSize = Array.from(sizeMap.values()).reduce((acc,add) => acc + add, 0)

  const list = Array.from(countMap.entries())
    .map(([ext, count]) => {
      const size = sizeMap.get(ext) 
      const countPercent = floorN(count/totalCountFile)
      const sizePercent = floorN(size/totalSize)

      return { ext, count, countPercent, size, sizePercent }
    })

  return {
    list,
    totalCountFile,
    totalCountDir,
    totalSize,
  }
}

const COMMAND = 'extension'
const description = 'Statistics by file extensions'
const usage = 'dirtool extension dir [-sn|-sz]'

async function commandRunner() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const keyList = argumentsAfterCommand.filter((i) => i.startsWith('-'))
  const keyMap = new Map(keyList.map((i) => i.split('=')))

  const [sourceDir] = argumentsWithoutKeys
  const isSortName = keyMap.has('-sn')
  const isSortSize = keyMap.has('-sz')

  const isSourceDirExist = !!sourceDir && isDirExist(sourceDir)

  if (command === COMMAND && isSourceDirExist) {
    const { list, totalCountFile, totalSize, totalCountDir } = await getExtStatistics(path.resolve(sourceDir))

    if (isSortName) {
      list.sort((a,b) => (a.ext || '').localeCompare((b.ext || '')))
    } else if (isSortSize) {
      list.sort((a,b) => -(a.size - b.size))
    } else {
      list.sort((a,b) => -(a.count - b.count))
    }

    const listFormatted = list.map((all) => ({
      ...all,
      size: formatSize(all.size)
    }))
    
    console.table(listFormatted)
    // console.log('list: ', list)
    console.log(`Total files ${totalCountFile}. Total dirs ${totalCountDir}. Total ${totalCountFile + totalCountDir}.`)
    console.log('Total size: ', formatSize(totalSize))

  } else {
    console.log(description)
    console.log('usage: ')
    console.log(usage)
    console.log(' Default descending sort by quantity.')
    console.log(' -sn -- sort by extension name.')
    console.log(' -sz -- sort by size. descending')
    process.exit(1)
  }
}

export default {
  cliname: COMMAND,
  commandRunner,
  description,
  usage
}