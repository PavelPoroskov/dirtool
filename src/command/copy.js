
import { copyFile, mkdir, opendir, readlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ExtraMap, formatSize, getExtname, getFileSize, isDirExist, runOperationsWithConcurrencyLimit20, isExist } from '../api/module/index.js';

function makeFnIsFileNameFit({ filterExtList, filterNameList, filterNameRegExpList }) {
  const extList0 = filterExtList.flatMap((i) => i.split(','))
    .filter(Boolean)
  const extList = extList0.map((ext) => ext.startsWith('.') ? ext : `.${ext}`)
  const extSet = new Set(extList)

  let regExpObList = []
  try {
    regExpObList = filterNameRegExpList.map((regexp) => new RegExp(regexp, 'i'))
  } catch (er) {
    console.log('Error Wrong Regular Expression:', er)
  }
  
  const isExtFit = (name) => {
    const ext = getExtname(name)

    return extSet.has(ext)
  }

  const isNameFit = (name) => {
    return filterNameList.every((substring) => name.includes(substring))
  }

  const isNameFitRegExp = (name) => {
    return regExpObList.every((regexpObj) => regexpObj.test(name))
  }

  let result = () => false

  switch (true) {
    case extList.length === 0 && filterNameList.length === 0 && regExpObList.length === 0: {
      result = () => true
      break
    }
    case extList.length === 0 && filterNameList.length === 0 && regExpObList.length > 0: {
      result = isNameFitRegExp
      break
    }
    case extList.length === 0 && filterNameList.length > 0 && regExpObList.length === 0: {
      result = isNameFit
      break
    }
    case extList.length === 0 && filterNameList.length > 0 && regExpObList.length > 0: {
      result = (name) => isNameFit(name) && isNameFitRegExp(name)
      break
    }
    case extList.length > 0 && filterNameList.length === 0 && regExpObList.length === 0: {
      result = isExtFit
      break
    }
    case extList.length > 0 && filterNameList.length === 0 && regExpObList.length > 0: {
      result = (name) => isExtFit(name) && isNameFitRegExp(name)
      break
    }
    case extList.length > 0 && filterNameList.length > 0 && regExpObList.length === 0: {
      result = (name) => isExtFit(name) && isNameFit(name)
      break
    }
    case extList.length > 0 && filterNameList.length > 0 && regExpObList.length > 0: {
      result = (name) => isExtFit(name) && isNameFit(name) && isNameFitRegExp(name)
      break
    }
  }

  return result
}

async function getFileList({ dir, filterExtList, filterNameList, filterNameRegExpList }) {
  const resultList = []
  const fnIsFileNameFit = makeFnIsFileNameFit({ filterExtList, filterNameList, filterNameRegExpList })

  async function traverseDir(inDir) {
    const dirIter = await opendir(inDir);
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
      } else if (dirent.isFile() || dirent.isSymbolicLink()) {
        if (fnIsFileNameFit(dirent.name)) {
          resultList.push({
            name: dirent.name,
            fullPath: path.join(dirent.parentPath, dirent.name),
            isSymbolicLink: dirent.isSymbolicLink()
          })
        }
      }
    }

    await Promise.all(
      dirList.map(
        (fullPath) => traverseDir(fullPath)
      )
    )
  }

  await traverseDir(dir)

  return resultList
}

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
    const list = await getFileList({ dir: fullSourceDir, filterExtList, filterNameList, filterNameRegExpList })

    const fullSourceDir2 = fullSourceDir.endsWith(path.sep) ? fullSourceDir : `${fullSourceDir}${path.sep}`
    const fullSourceDir2Length = fullSourceDir2.length
    const fullDestDir = path.resolve(destDir)
    const fullDestDir2 = fullDestDir.endsWith(path.sep) ? fullDestDir : `${fullDestDir}${path.sep}`

    let copyList = []
    if (isOneDir) {
      copyList = list
        .sort((a,b) => a.name.localeCompare(b.name))
        .map(({ name, fullPath, isSymbolicLink }) => ({
          fromFullPath: fullPath,
          toFullPath: path.join(fullDestDir, name),
          isSymbolicLink
        }))
    } else {
      copyList = list
        .sort((a,b) => a.fullPath.localeCompare(b.fullPath))
        .map(({ fullPath, isSymbolicLink }) => ({
          fromFullPath: fullPath,
          toFullPath: `${fullDestDir2}${fullPath.slice(fullSourceDir2Length)}`,
          isSymbolicLink
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
      operationArgumentsList: copyList.filter(({ isSymbolicLink }) => !isSymbolicLink),
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

    const getSizeResultList = await runOperationsWithConcurrencyLimit20({
      operationArgumentsList: copyList,
      asyncOperation: async ({ fromFullPath, isSymbolicLink }) => {
        let isCanRead = true
        let size = 0

        if (isSymbolicLink) {
          const linkString = await readlink(fromFullPath)
          isCanRead = await isExist(linkString)
        }

        if (isCanRead) {
          size = await getFileSize(fromFullPath)
        }
        
        return size
      },
    })
    const totalSize = getSizeResultList.reduce((acc, item) => acc + item, 0)

    console.log('Copied files:', list.length)
    console.log('Total size:', formatSize(totalSize))
    console.log('Created dirs:', newDirList.length)
  } else {
    console.log(description)
    console.log('usage: ')
    console.log(usage)
    const usage = 'dirtool copy source-dir dest-dir [-ext=pdf,epub] [-name=substring] [-name-rx="regexp"] [-one-dir]'
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