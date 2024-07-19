import { mergeCommand } from './command/merge.js';
import { copyCommand } from './command/copy.js'
import { extensionCommand } from './command/extension.js'
import { emptyCommand } from './command/empty.js'
import { hiddenCommand } from './command/hidden.js'
import { nameCommand } from './command/name.js'
import { searchCommand } from './command/search.js'

// eslint-disable-next-line no-unused-vars
const [_, __, command] = process.argv

switch (command) {
  case 'merge': {
    await mergeCommand()
    break
  }
  case 'copy': {
    await copyCommand()
    break;
  }
  case 'extension': {
    await extensionCommand()
    break;
  }  
  case 'empty': {
    await emptyCommand()
    break;
  } 
  case 'hidden': {
    await hiddenCommand()
    break;
  } 
  case 'name': {
    // the same name but different extension
    await nameCommand()
    break;
  } 
  case 'search': {
    await searchCommand()
    break;
  } 
  // case 'double': {
  //   await doubleCommand()
  //   break;
  // } 
  default: {
    console.log('usage: ')
    console.log(' dirtool copy source-dir dest-dir filter')
    console.log(' dirtool empty dir [-R]')
    console.log(' dirtool extension dir')
    console.log(' dirtool hidden dir [-R]')
    console.log(' dirtool merge source-dir dest-dir [-R]')
    console.log(' dirtool name dir')
    console.log(' dirtool search dir (substring|-rx=regexp)')

    process.exit(1)
  }
}