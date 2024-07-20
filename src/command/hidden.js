import { rm } from 'node:fs/promises';
import path from 'node:path';
import { getHiddenDirs } from '../api/api-query/getHiddenDirs.js';
import { isDirExist, runOperationsWithConcurrencyLimit20 } from '../api/module/index.js';

const COMMAND = 'hidden'
const description = 'Search hidden subdirectories'
const usage = 'dirtool hidden dir [-R]'

async function commandRunner() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const keyList = argumentsAfterCommand.filter((i) => i.startsWith('-'))
  const keyMap = new Map(keyList.map((i) => i.split('=')))

  const [sourceDir] = argumentsWithoutKeys
  const isDelete = keyMap.has('-R')

  const isSourceDirExist = !!sourceDir && await isDirExist(sourceDir)

  if (command === COMMAND && isSourceDirExist) {
    const dirList = await getHiddenDirs(path.resolve(sourceDir))

    if (!isDelete) {
      // console.log('hidden dirs', dirList.length)
      
      dirList
        .sort((a,b) => a.localeCompare(b))
        .forEach((d) => {
          console.log(d)
        })
    }
   
    if (isDelete) {
      await runOperationsWithConcurrencyLimit20({
        operationArgumentsList: dirList,
        asyncOperation: (fullPath) => rm(fullPath, { recursive: true }),
      })
      console.log('hidden dirs was removed')
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