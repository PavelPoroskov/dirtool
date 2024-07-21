import fsP, { opendir, readlink } from 'node:fs/promises';
import path from 'node:path';
import { isDirExist, runOperationsWithConcurrencyLimit20, isExist, ExtraMap, deleteFile } from '../api/module/index.js';
import { getAllFiles } from '../api/api-query/getAllFiles.js';

async function getSymbolicLinkList(dir) {
  const fileList = []

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
      } else if (dirent.isSymbolicLink()) {
        fileList.push({
          name: dirent.name,
          fullPath: path.join(dirent.parentPath, dirent.name),
        })
      }
    }

    await Promise.all(
      dirList.map(
        (fullPath) => traverseDir(fullPath)
      )
    )
  }

  await traverseDir(dir)

  return fileList
}

const COMMAND = 'link'
const description = 'Search broken symbolic links'
const usage = 'dirtool link dir [-F]'

async function commandRunner() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const keyList = argumentsAfterCommand.filter((i) => i.startsWith('-'))
  const keyMap = new Map(keyList.map((i) => i.split('=')))

  const [sourceDir] = argumentsWithoutKeys
  const isFix = keyMap.has('-F')

  const isSourceDirExist = !!sourceDir && await isDirExist(sourceDir)

  if (command === COMMAND && isSourceDirExist) {
    const linkList = await getSymbolicLinkList(path.resolve(sourceDir))

    const checkLinkResult = await runOperationsWithConcurrencyLimit20({
      operationArgumentsList: linkList,
      asyncOperation: async ({ name, fullPath }) => {
        const linkString = await readlink(fullPath)
        const isLinkActual = await isExist(linkString)
        // console.log('   linkString', linkString, isLinkActual)

        return {
          name,
          fullPath,
          isLinkActual
        }
      },
    })

    const brokenLinkList = checkLinkResult
      .filter(({ isLinkActual }) => !isLinkActual)
      .sort((a,b) => a.fullPath.localeCompare(b.fullPath))

    if (!isFix) {
      brokenLinkList
        .forEach((i) => {
          console.log(i.fullPath)
        })
    }
   
    if (isFix) {
      console.log('Broken symbolic links:', brokenLinkList.length)

      const fileList = await getAllFiles(path.resolve(sourceDir))
      const fileNameMap = new ExtraMap()
      fileList.forEach(({ name, fullPath }) => {
        fileNameMap.push(name, fullPath)
      })

      async function tryFixLink({ fullPath }) {
        let isFixed = false
        const linkString = await readlink(fullPath)
        const targetName = path.basename(linkString)
        const fullPathList = fileNameMap.get(targetName)
        // console.log('fullPath', fullPath)
        // console.log('linkString', linkString)
        // console.log('targetName', targetName)
        // console.log('fullPathList', fullPathList)

        if (fullPathList && fullPathList.length === 1) {
          const [newTargetFullPath] = fullPathList

          await deleteFile(fullPath)
          await fsP.symlink(newTargetFullPath, fullPath)
          isFixed = true
        }

        return {
          fullPath,
          isFixed
        }
      }
      const fixLinkResult = await runOperationsWithConcurrencyLimit20({
        operationArgumentsList: brokenLinkList,
        asyncOperation: tryFixLink,
      })
      const fixedCount = fixLinkResult.filter(({ isFixed }) => isFixed).length
      console.log('Broken symbolic link was fixed: ', fixedCount)
      console.log('Broken symbolic link was left unfixed: ', brokenLinkList.length - fixedCount)
    }
  } else {
    console.log(description)
    console.log('usage: ')
    console.log(usage)
    console.log(' -F -- try fix.')
    process.exit(1)
  }
}

export default {
  cliname: COMMAND,
  commandRunner,
  description,
  usage
}