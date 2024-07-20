import path from 'node:path';
import { isDirExist } from '../api/module/index.js';
import { getTheSameName } from '../api/api-query/getTheSameName.js';

const COMMAND = 'same-name'
const description = 'Search files with the same name but with different extension'
const usage = 'dirtool same-name dir'

async function commandRunner() {
  // eslint-disable-next-line no-unused-vars
  const [_, __, command] = process.argv.slice(0,3)
  const argumentsAfterCommand = process.argv.slice(3)
  const argumentsWithoutKeys = argumentsAfterCommand.filter((i) => !i.startsWith('-'))

  const [sourceDir] = argumentsWithoutKeys
  const isSourceDirExist = !!sourceDir && await isDirExist(sourceDir)

  if (command === COMMAND && isSourceDirExist) {
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
    console.log(description)
    console.log('usage: ')
    console.log(usage)
    process.exit(1)
  }
}

export default {
  cliname: COMMAND,
  commandRunner,
  description,
  usage
}