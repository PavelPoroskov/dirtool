import { opendir } from 'node:fs/promises';
import path from 'node:path';

import { getExtname, getNameWithoutExt } from '../../util/file-util.js';

const ignoreExtSet = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.png',
  '.rb',
  '.rs.txt',
  '.rs',
  '.svg',
  '.txt',
  '.mp4',
  '.hbs',
  '.tla',
  '.dot',
  '.jpg',
  '.srt',
  '.lock',
])
const ignoreFileSet = new Set([
  'Rakefile',
  'rustfmt-ignore',
  'Dockerfile',
  'yarn.lock',
  'README',
  'Cargo.toml',
  'embeddings.zip',
  'LICENSE-APACHE',
  'LICENSE-MIT',
  'code.zip',
])
export async function getTheSameName(inFullPath) {
  const nameList = {}

  async function traverseDir(inDir) {
    const dirIter = await opendir(inDir);
    const dirList = []
  
    for await (const dirent of dirIter) {
      if (dirent.isDirectory()) {
        if (dirent.name.startsWith('.') || dirent.name === '__MACOSX') {
          // console.log('IGNORING DIR', path.join(dirent.parentPath, dirent.name))
        } else {
          dirList.push(
            path.join(dirent.parentPath, dirent.name)
          )
        }
      } else if (dirent.isFile()) {
        const ext = getExtname(dirent.name)

        if (ignoreExtSet.has(ext)) {

        } else if (ignoreFileSet.has(dirent.name)) {

        } else if (dirent.name.startsWith('.')) {

        } else {
          const name = getNameWithoutExt(dirent.name)

          if (nameList[name]) {
            nameList[name].push(path.join(dirent.parentPath, dirent.name))
          } else {
            nameList[name] = [path.join(dirent.parentPath, dirent.name)]
          }
        }
      }
    }

    await Promise.all(
      dirList.map(
        (fullPath) => traverseDir(fullPath)
      )
    )
  }

  await traverseDir(inFullPath)

  return Object.entries(nameList)
    .filter(([name, list]) => list.length > 1)
    .map(([name, fullPathList]) => {
      const sorted = fullPathList.sort((a,b) => a.localeCompare(b))

      return {
        name,
        first: sorted[0],
        fullPathList: sorted,
      }
    })
    .sort((a,b) => a.first.localeCompare(b.first))
  
}
