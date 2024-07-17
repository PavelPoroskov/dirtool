import path from 'node:path';
import { isDirExist } from '../util/file-util.js';
import { getTheSameName } from '../api/api-query/getTheSameName.js';

export async function nameCommand() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))

  const [sourceDir] = argumentsWithoutKeys
  const isSourceDirExist = !!sourceDir && isDirExist(sourceDir)

  if (command === 'name' && isSourceDirExist) {
    const nameList = await getTheSameName(path.resolve(sourceDir))

    nameList
      .forEach(({ name, fullPathList }) => {

        console.log()
        console.log('Name:', name)
        fullPathList
          .forEach((d) => {
            console.log(d)
          })
    })
  } else {
    console.log('usage: ')
    console.log(' dirtool name dir')
    process.exit(1)
  }
}
