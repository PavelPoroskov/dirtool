
import { rm } from 'node:fs/promises';
import { runOperationsWithConcurrencyLimit20 } from '../../util/runOperationsWithConcurrencyLimit.js';
import { getEmptyDirs } from '../api-query/getEmptyDirs.js';

export async function delEmptyDirs(inFullPath) {
  const dirList = await getEmptyDirs(inFullPath)

  await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: dirList,
    asyncOperation: (fullPath) => rm(fullPath, { recursive: true }),
  })
}
