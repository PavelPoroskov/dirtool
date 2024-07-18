import path from 'node:path';
import { isDirExist } from '../util/file-util.js';
import { searchWithSubstring } from '../api/api-query/searchWithSubstring.js';

export async function searchCommand() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))
  const keyList = argumentsAfterCommand.filter((i) => i.startsWith('-'))
  const keyMap = new Map(keyList.map((i) => i.split('=')))

  const [sourceDir, substring] = argumentsWithoutKeys
  const isSourceDirExist = !!sourceDir && isDirExist(sourceDir)

  const regexp = keyMap.get('-rx')
  console.log('sourceDir', sourceDir)
  console.log('substring', substring)
  console.log('regexp', keyList)

  if (command === 'search' && isSourceDirExist && (!!substring || !!regexp)) {
    const fullPathList = await searchWithSubstring({
      dir: path.resolve(sourceDir),
      substring,
      regexp,
    })

    fullPathList.forEach((d) => {
      console.log(d)
    })
  } else {
    console.log('usage: ')
    console.log(' dirtool serach dir (substring|-rx=regexp)')
    // eslint-disable-next-line no-useless-escape
    console.log(' dirtool serach dir -rx="^\d\d\d\d\s"')
    process.exit(1)
  }
}
