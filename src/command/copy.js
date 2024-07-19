
import { copyFile, mkdir, opendir, readlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { formatSize, getExtname, getFileSize, isDirExist, runOperationsWithConcurrencyLimit20, isExist } from '../api/module/index.js';

async function getFileList({ dir, filterList }) {
  const fileList = []
  const extList = filterList.map((ext) => ext.startsWith('.') ? ext : `.${ext}`)
  const filterSet = new Set(extList)

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
        const ext = getExtname(dirent.name)

        if (filterSet.has(ext)) {
          fileList.push({
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

  return fileList
}

const COMMAND = 'copy'
const description = 'Copy with subdirectories'
const usage = 'dirtool copy source-dir dest-dir filter'

async function commandRunner() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command, sourceDir, destDir, filter] = process.argv

  const isSourceDirExist = !!sourceDir && isDirExist(sourceDir)
  const isDestDirExist = !!destDir && isDirExist(destDir)

  const filterList = filter
    ? filter.split(',').filter(Boolean)
    : []

  if (command === COMMAND && isSourceDirExist && isDestDirExist && filterList.length > 0) {
    const fullSourceDir = path.resolve(sourceDir)
    const list = await getFileList({ dir: fullSourceDir, filterList })

    const fullDestDir = path.resolve(destDir)
    const fullSourceDir2 = fullSourceDir.endsWith(path.sep) ? fullSourceDir : `${fullSourceDir}${path.sep}`
    const fullSourceDir2Length = fullSourceDir2.length
    const fullDestDir2 = fullDestDir.endsWith(path.sep) ? fullDestDir : `${fullDestDir}${path.sep}`

    const copyList = list
      .sort((a,b) => a.fullPath.localeCompare(b.fullPath))
      .map(({ fullPath, isSymbolicLink }) => ({
        fromFullPath: fullPath,
        toFullPath: `${fullDestDir2}${fullPath.slice(fullSourceDir2Length)}`,
        isSymbolicLink
      }))

    const newDirSet = new Set()
    copyList.forEach(({ toFullPath }) => {
      newDirSet.add(path.dirname(toFullPath))
    })
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
    console.log(' filter is list of file extensions with comma. e.i pdf,epub,fb2')

    process.exit(1)
  }
}

export default {
  cliname: COMMAND,
  commandRunner,
  description,
  usage
}