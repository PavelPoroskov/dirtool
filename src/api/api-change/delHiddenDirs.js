import { rm } from 'node:fs/promises';
import { runOperationsWithConcurrencyLimit20 } from '../module/index.js';
import { getHiddenDirs } from '../api-query/getHiddenDirs.js';

export async function delHiddenDirs(inFullPath) {
  const dirList = await getHiddenDirs(inFullPath)

  await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: dirList,
    asyncOperation: (fullPath) => rm(fullPath, { recursive: true }),
  })
}
