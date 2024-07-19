import path from 'node:path';
import { rm } from 'node:fs/promises';
import { runOperationsWithConcurrencyLimit20 } from '../util/runOperationsWithConcurrencyLimit.js';
import { isDirExist } from '../util/file-util.js';
import { getEmptyDirs } from '../api/api-query/getEmptyDirs.js';

export async function emptyCommand() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const keyList = argumentsAfterCommand.filter((i) => i.startsWith('-'))
  const keyMap = new Map(keyList.map((i) => i.split('=')))

  const [sourceDir] = argumentsWithoutKeys
  const isDelete = keyMap.has('-R')

  const isSourceDirExist = !!sourceDir && isDirExist(sourceDir)

  if (command === 'empty' && isSourceDirExist) {
    const dirList = await getEmptyDirs(path.resolve(sourceDir))

    if (!isDelete) {
      // console.log('empty dirs', dirList.length)
      
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
      console.log('empty dirs was removed')
    }
  } else {
    console.log('usage: ')
    console.log(' dirtool empty dir [-R]')
    console.log('   Search empty subdirectories')
    console.log('   -R -- remove.')
    process.exit(1)
  }
}
