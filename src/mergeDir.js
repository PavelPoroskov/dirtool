
import {} from 'node:fs/promises'

export async function mergeDir({ sourceDir, destDir }) {
  let nMovedFile = 0
  let nRestFile = 0


  console.log(`dirtool merge. Moved ${nMovedFile} files`)
  console.log(`${nRestFile} files are left in source directory.`)
}