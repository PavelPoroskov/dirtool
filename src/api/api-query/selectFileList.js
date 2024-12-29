import { opendir } from 'node:fs/promises';
import path from 'node:path';
import { getExtname, getNameWithoutExt } from '../module/index.js';

function makeFnIsFileNameFit({ filterExtList, filterNameList, filterNameRegExpList }) {
  const extList0 = filterExtList.flatMap((i) => i.split(','))
    .filter(Boolean)
  const extList = extList0.map((ext) => ext.startsWith('.') ? ext : `.${ext}`)
  const extSet = new Set(extList)

  let regExpObList = []
  try {
    regExpObList = filterNameRegExpList.map((regexp) => new RegExp(regexp, 'i'))
  } catch (er) {
    console.log('Error Wrong Regular Expression:', er)
  }
  
  const isExtFit = (name) => {
    const ext = getExtname(name)

    return extSet.has(ext)
  }

  const isNameFit = (name) => {
    const onlyName = getNameWithoutExt(name)

    return filterNameList.every((substring) => onlyName.includes(substring))
  }

  const isNameFitRegExp = (name) => {
    const onlyName = getNameWithoutExt(name)

    return regExpObList.every((regexpObj) => regexpObj.test(onlyName))
  }

  let result = () => false

  switch (true) {
    case extList.length === 0 && filterNameList.length === 0 && regExpObList.length === 0: {
      result = () => true
      break
    }
    case extList.length === 0 && filterNameList.length === 0 && regExpObList.length > 0: {
      result = isNameFitRegExp
      break
    }
    case extList.length === 0 && filterNameList.length > 0 && regExpObList.length === 0: {
      result = isNameFit
      break
    }
    case extList.length === 0 && filterNameList.length > 0 && regExpObList.length > 0: {
      result = (name) => isNameFit(name) && isNameFitRegExp(name)
      break
    }
    case extList.length > 0 && filterNameList.length === 0 && regExpObList.length === 0: {
      result = isExtFit
      break
    }
    case extList.length > 0 && filterNameList.length === 0 && regExpObList.length > 0: {
      result = (name) => isExtFit(name) && isNameFitRegExp(name)
      break
    }
    case extList.length > 0 && filterNameList.length > 0 && regExpObList.length === 0: {
      result = (name) => isExtFit(name) && isNameFit(name)
      break
    }
    case extList.length > 0 && filterNameList.length > 0 && regExpObList.length > 0: {
      result = (name) => isExtFit(name) && isNameFit(name) && isNameFitRegExp(name)
      break
    }
  }

  return result
}

export async function selectFileList({ dir, filterExtList, filterNameList, filterNameRegExpList }) {
  const resultList = []
  const fnIsFileNameFit = makeFnIsFileNameFit({ filterExtList, filterNameList, filterNameRegExpList })

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
          if (fnIsFileNameFit(dirent.name)) {
            resultList.push({
              name: dirent.name,
              fullPath: path.join(dirent.parentPath, dirent.name),
              isDirectory: true,
            })
          }
        }
      } else if (dirent.isFile() || dirent.isSymbolicLink()) {
        if (fnIsFileNameFit(dirent.name)) {
          resultList.push({
            name: dirent.name,
            fullPath: path.join(dirent.parentPath, dirent.name),
            isSymbolicLink: dirent.isSymbolicLink(),
          })
        }
      }
    }

    await Promise.all(
      dirList.map(
        (fullPath) => traverseDir(fullPath)
      )
    )
  }

  await traverseDir(dir)

  return resultList
}
