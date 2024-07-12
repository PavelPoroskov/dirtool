
import { existsSync } from 'node:fs';

async function filterDir({ sourceDir, destDir, filterList }) {
  let nCopiedFile = 0


  console.log(`dirtool filter. Copied ${nCopiedFile} files`)

  console.log(`filtered dir size ${555} `)
}

export async function filterCommand() {
  const [_, __, command, sourceDir, destDir, filter] = process.argv

  const isSourceDirExist = !!sourceDir && existsSync(sourceDir)
  const isDestDirExist = !!destDir && existsSync(destDir)

  const filterList = filter
    ? filter.split(',')
    : []

  if (command === 'filter' && isSourceDirExist && isDestDirExist && filterList.length > 0) {
    await filterDir({ sourceDir, destDir, filterList })
  } else {
    console.log('usage: ')
    console.log(' dirtool filter source-dir dest-dir filter')
    console.log('   filter is list of file extensions with comma. e.i pdf,epub,fb')

    process.exit(1)
  }
}
