import path from 'node:path';
import { isDirExist } from '../api/module/index.js';
import { searchWithSubstring } from '../api/api-query/searchWithSubstring.js';

const COMMAND = 'search'
const description = 'Search files with substring in name or with regexp'
const usage = 'dirtool search dir (substring|-rx=regexp)'

async function commandRunner() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const keyList = argumentsAfterCommand.filter((i) => i.startsWith('-'))
  const keyMap = new Map(keyList.map((i) => i.split('=')))

  const [sourceDir, substring] = argumentsWithoutKeys
  const isSourceDirExist = !!sourceDir && isDirExist(sourceDir)

  const regexp = keyMap.get('-rx')

  if (command === COMMAND && isSourceDirExist && (!!substring || !!regexp)) {
    const fullPathList = await searchWithSubstring({
      dir: path.resolve(sourceDir),
      substring,
      regexp,
    })

    fullPathList.forEach((d) => {
      console.log(d)
    })
  } else {
    console.log(description)
    console.log('usage: ')
    console.log(usage)
    // eslint-disable-next-line no-useless-escape
    console.log('dirtool search dir -rx="^\d\d\d\d\s"')

    process.exit(1)
  }
}

export default {
  cliname: COMMAND,
  commandRunner,
  description,
  usage
}