import path from 'node:path';
import { rm } from 'node:fs/promises';
import { runOperationsWithConcurrencyLimit20 } from '../util/runOperationsWithConcurrencyLimit.js';
import { isDirExist } from '../util/file-util.js';
import { getHiddenDirs } from '../api/api-query/getHiddenDirs.js';

export async function hiddenCommand() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const keyList = argumentsAfterCommand.filter((i) => i.startsWith('-'))
  const keyMap = new Map(keyList.map((i) => i.split('=')))

  const [sourceDir] = argumentsWithoutKeys
  const isDelete = keyMap.has('-R')

  const isSourceDirExist = !!sourceDir && isDirExist(sourceDir)

  if (command === 'hidden' && isSourceDirExist) {
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
    console.log('usage: ')
    console.log(' dirtool hidden dir [-R]')
    console.log('   -R -- remove.')
    process.exit(1)
  }
}
