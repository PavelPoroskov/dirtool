
import { copyFile, cp, mkdir, readlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { selectFileList } from '../api/api-query/selectFileList.js';
import { ExtraMap, formatSize, getDirSize, getFileSize, isDirExist, isExist, runOperationsWithConcurrencyLimit20 } from '../api/module/index.js';

const COMMAND = 'copy'
const description = 'Copy with subdirectories and filter'
const usage = 'dirtool copy source-dir dest-dir [-ext=pdf,epub] [-name=substring] [-name-rx="regexp"] [-one-dir]'

async function commandRunner() {
    // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const keyList = argumentsAfterCommand.filter((i) => i.startsWith('-'))
  const keyMap = new ExtraMap()
  keyList.forEach((i) => {
    const [key, value] = i.split('=')

    keyMap.concat( key, value )
  })

  const [sourceDir, destDir] = argumentsWithoutKeys
  const isSourceDirExist = !!sourceDir && await isDirExist(sourceDir)
  const isDestDirExist = !!destDir && await isDirExist(destDir)

  const filterExtList = keyMap.get('-ext') || []
  const filterNameList = keyMap.get('-name') || []
  const filterNameRegExpList = keyMap.get('-name-rx') || []
  const isOneDir = keyMap.has('-one-dir')

  if (command === COMMAND && isSourceDirExist && isDestDirExist) {
    if (filterExtList.length) {
      console.log('filter ext', filterExtList)
    }
    if (filterNameList.length || filterNameRegExpList.length)  {
      console.log('filter name', filterNameList.concat(filterNameRegExpList))
    }

    const fullSourceDir = path.resolve(sourceDir)
    const list = await selectFileList({ dir: fullSourceDir, filterExtList, filterNameList, filterNameRegExpList })

    const fullSourceDir2 = fullSourceDir.endsWith(path.sep) ? fullSourceDir : `${fullSourceDir}${path.sep}`
    const fullSourceDir2Length = fullSourceDir2.length
    const fullDestDir = path.resolve(destDir)
    const fullDestDir2 = fullDestDir.endsWith(path.sep) ? fullDestDir : `${fullDestDir}${path.sep}`

    let copyList = []
    if (isOneDir) {
      copyList = list
        .sort((a,b) => a.name.localeCompare(b.name))
        .map(({ name, fullPath, isSymbolicLink, isDirectory }) => ({
          fromFullPath: fullPath,
          toFullPath: path.join(fullDestDir, name),
          isSymbolicLink,
          isDirectory,
        }))
    } else {
      copyList = list
        .sort((a,b) => a.fullPath.localeCompare(b.fullPath))
        .map(({ fullPath, isSymbolicLink, isDirectory }) => ({
          fromFullPath: fullPath,
          toFullPath: `${fullDestDir2}${fullPath.slice(fullSourceDir2Length)}`,
          isSymbolicLink,
          isDirectory,
        }))
    }

    const newDirSet = new Set()
    copyList.forEach(({ toFullPath }) => {
      newDirSet.add(path.dirname(toFullPath))
    })
    newDirSet.delete(fullDestDir)
    const newDirList = Array.from(newDirSet.keys()).sort((a,b) => a.localeCompare(b))
    // console.log('newDirList')
    // console.log(newDirList)
    await runOperationsWithConcurrencyLimit20({
      operationArgumentsList: newDirList,
      asyncOperation: async (fullPath) => {
        await mkdir(fullPath, { recursive: true })
      },
    })

    await runOperationsWithConcurrencyLimit20({
      operationArgumentsList: copyList.filter(({ isSymbolicLink, isDirectory }) => !isSymbolicLink && !isDirectory),
      asyncOperation: async ({ fromFullPath, toFullPath }) => {
        await copyFile(fromFullPath, toFullPath)
      },
    })
    await runOperationsWithConcurrencyLimit20({
      operationArgumentsList: copyList.filter(({ isSymbolicLink }) => isSymbolicLink),
      asyncOperation: async ({ fromFullPath, toFullPath }) => {
        const linkString = await readlink(fromFullPath)
        const isLinkActual = await isExist(linkString)
        // console.log('   linkString', linkString, isLinkActual)

        if (isLinkActual) {
          await copyFile(fromFullPath, toFullPath)
        } else {
          await writeFile(`${toFullPath}.link.txt`, `was link: ${linkString}`)
          // console.log(`${toFullPath}.link.txt`)
        }
      },
    })
    await runOperationsWithConcurrencyLimit20({
      operationArgumentsList: copyList.filter(({ isDirectory }) => isDirectory),
      asyncOperation: async ({ fromFullPath, toFullPath }) => {
        await cp(fromFullPath, toFullPath, { recursive: true })
      },
    })

    const getSizeResultList = await runOperationsWithConcurrencyLimit20({
      operationArgumentsList: copyList,
      asyncOperation: async ({ toFullPath, isSymbolicLink, isDirectory }) => {
        let size = 0

        if (isDirectory) {
          size = await getDirSize(toFullPath)
        } else if (isSymbolicLink) {
          const isExistLinkFile = await isExist(toFullPath)

          if (isExistLinkFile) {
            const linkString = await readlink(toFullPath)
            const isCanRead = await isExist(linkString)
            if (isCanRead) {
              size = await getFileSize(toFullPath)
            }  
          }
        } else {
          size = await getFileSize(toFullPath)
        }

        return size
      },
    })
    const totalSize = getSizeResultList.reduce((acc, item) => acc + item, 0)
    copyList.forEach(({ toFullPath, isDirectory }) => {
      console.log(toFullPath, isDirectory ? 'DIR' : '')
    })

    console.log()
    console.log('Copied files:', list.length)
    console.log('Total size:', formatSize(totalSize))
    console.log('Created dirs:', newDirList.length)
  } else {
    console.log(description)
    console.log('usage: ')
    console.log(usage)
    console.log(' -ext=pdf,epub,fb2')
    console.log(' -name=substring')
    console.log(' -name-rx="regexp"')
    console.log(' -one-dir     Do not create subdirectories. All files are in root dest-dir')

    process.exit(1)
  }
}

export default {
  cliname: COMMAND,
  commandRunner,
  description,
  usage
}