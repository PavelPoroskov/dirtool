import path from 'node:path';
import { deleteFile } from '../api/module/index.js';
import { getDoubleListOne } from '../api/api-query/getDoubleListOne.js';
import { isDirExist, runOperationsWithConcurrencyLimit20 } from '../api/module/index.js';

const COMMAND = 'double'
const description = 'Find doubles'
const usage = 'dirtool double dir [-R]'

async function commandRunner() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const keyList = argumentsAfterCommand.filter((i) => i.startsWith('-'))
  const keyMap = new Map(keyList.map((i) => i.split('=')))

  const [sourceDir] = argumentsWithoutKeys
  const isDelete = keyMap.has('-R')

  const isSourceDirExist = !!sourceDir && isDirExist(sourceDir)

  if (command === COMMAND && isSourceDirExist) {
    const { originalAndDoubleList } = await getDoubleListOne(path.resolve(sourceDir))
    const fullDoubleList = originalAndDoubleList.flatMap(({ doubleList }) => doubleList) 
    console.log('Found double:', fullDoubleList.length)

    if (!isDelete) {
      originalAndDoubleList.forEach(({ original, doubleList }) => {
        console.log()
        console.log('original:', original)

        doubleList.forEach((d) => {
          console.log(' double:', d)
        })
      })
    }
   
    if (isDelete) {
      await runOperationsWithConcurrencyLimit20({
        operationArgumentsList: fullDoubleList,
        asyncOperation: deleteFile,
      })
      console.log('doubles was removed')
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