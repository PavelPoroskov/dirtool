


import { existsSync } from 'node:fs';

import { filterDir } from 'filterDir'
import { mergeDir } from 'mergeDir'

const argumentList = process.argv

const [_, __, command, sourceDir, destDir, filter] = process.argv

const printUsage = () => {
  console.log('usage: ')
  console.log(' dirtool merge source-dir dest-dir')
  console.log(' dirtool filter source-dir dest-dir filter')
  console.log('   filter is list of file extensions with comma. e.i pdf,epub,fb')
}

const isSourceDirExist = !!sourceDir && existsSync(sourceDir)
const isDestDirExist = !!destDir && existsSync(destDir)

switch (true) {
  case command === 'merge': {
    if (isSourceDirExist && isDestDirExist) {
      await mergeDir({ sourceDir, destDir })
    } else {
      printUsage()
      process.exit(1)
    }

    break
  }
  case command === 'filter': {
    const filterList = filter
      ? filter.split(',')
      : []

    if (isSourceDirExist && isDestDirExist && filterList.length > 0 ) {
      await filterDir({ sourceDir, destDir, filterList })
    } else {
      printUsage()
      process.exit(1)
    }

    break;
  }
  default: {
    printUsage()
    process.exit(1)
  }
}