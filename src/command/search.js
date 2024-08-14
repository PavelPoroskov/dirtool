import path from 'node:path';
import { ExtraMap, isDirExist } from '../api/module/index.js';
import { selectFileList } from '../api/api-query/selectFileList.js';

const COMMAND = 'search'
const description = 'Search files with substring in name or with regexp'
const usage = 'dirtool search <dir> [-ext=pdf,epub] [-name=substring] [-name-rx="regexp"]'

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

  const [sourceDir] = argumentsWithoutKeys
  const isSourceDirExist = !!sourceDir && await isDirExist(sourceDir)

  const filterExtList = keyMap.get('-ext') || []
  const filterNameList = keyMap.get('-name') || []
  const filterNameRegExpList = keyMap.get('-name-rx') || []

  if (command === COMMAND && isSourceDirExist) {
    if (filterExtList.length) {
      console.log('filter ext', filterExtList)
    }
    if (filterNameList.length || filterNameRegExpList.length)  {
      console.log('filter name', filterNameList.concat(filterNameRegExpList))
    }

    const fullSourceDir = path.resolve(sourceDir)
    const fileList = await selectFileList({ dir: fullSourceDir, filterExtList, filterNameList, filterNameRegExpList })
    fileList
      .sort(({ fullPath: a }, { fullPath: b } ) => a.localeCompare(b))

    fileList.forEach(({ fullPath }) => {
      console.log(fullPath)
    })
  } else {
    console.log(description)
    console.log('usage: ')
    console.log(usage)
    console.log(' -ext=pdf,epub,fb2')
    console.log(' -name=substring')
    console.log(' -name-rx="regexp"')

    process.exit(1)
  }
}

export default {
  cliname: COMMAND,
  commandRunner,
  description,
  usage
}