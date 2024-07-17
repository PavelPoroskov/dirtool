import { rm } from 'node:fs/promises';
import { runOperationsWithConcurrencyLimit20 } from '../../util/runOperationsWithConcurrencyLimit.js';

export async function delHiddenDirs(inFullPath) {
  const dirList = await getHiddenDirs(inFullPath)

  await runOperationsWithConcurrencyLimit20({
    operationArgumentsList: dirList,
    asyncOperation: (fullPath) => rm(fullPath, { recursive: true }),
  })
}
