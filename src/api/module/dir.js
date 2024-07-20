import fsP from 'node:fs/promises';

export async function isDirExist(inFullPath) {
  let result = false

  try {
    await fsP.access(inFullPath, fsP.constants.R_OK | fsP.constants.W_OK);
    const stats = await fsP.stat(inFullPath)

    result = stats.isDirectory()
  } catch {
    result = false
  } 

  if (!result) {
    console.log('Error Not is Directory:', inFullPath)
  }
  
  return result
}