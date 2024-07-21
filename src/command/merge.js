
import path from 'node:path';
import { getDoubleListTwo } from '../api/api-query/getDoubleList.js';
import { delEmptyDirs } from '../api/api-change/delEmptyDirs.js';
import { delHiddenDirs } from '../api/api-change/delHiddenDirs.js';
import { deleteFile, isDirExist, runOperationsWithConcurrencyLimit20 } from '../api/module/index.js';

const COMMAND = 'merge'
const description = 'Delete files in source directory that exist in dest directory'
const usage = 'dirtool merge source-dir dest-dir [-R]'

async function commandRunner() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const keyList = argumentsAfterCommand.filter((i) => i.startsWith('-'))
  const keyMap = new Map(keyList.map((i) => i.split('=')))

  const [sourceDir, destDir] = argumentsWithoutKeys
  const isDelete = keyMap.has('-R')

  const isSourceDirExist = !!sourceDir && await isDirExist(sourceDir)
  const isDestDirExist = !!destDir && await isDirExist(destDir)

  if (command === COMMAND && isSourceDirExist && isDestDirExist) {
    if (isDelete) {
      await delHiddenDirs(sourceDir)
    }  

    const { sourceFileListSize, sourceDoubleList } = await getDoubleListTwo({
      sourceDir: path.resolve(sourceDir),
      destDir: path.resolve(destDir),
    })
    console.log('The same files were in source and dest dir', sourceDoubleList.length)
    let nRestFile = sourceFileListSize

    if (isDelete) {
      await runOperationsWithConcurrencyLimit20({
        operationArgumentsList: sourceDoubleList,
        asyncOperation: deleteFile,
      })
      console.log('The same files were removed from source directory')
      nRestFile -= sourceDoubleList.length
    }  

    console.log()
    console.log(`${nRestFile} files are left in source directory.`)

    if (isDelete) {
      await delEmptyDirs(sourceDir)
    }  
  } else {
    console.log(description)
    console.log('usage: ')
    console.log(usage)
    console.log(' -R -- remove.')

    process.exit(1)
  }
}

export default {
  cliname: COMMAND,
  commandRunner,
  description,
  usage
}