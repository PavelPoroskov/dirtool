import { mergeCommand } from './command/merge.js';
import { filterCommand } from './command/filter.js'
import { extensionCommand } from './command/extension.js'
import { emptyCommand } from './command/empty.js'
import { hiddenCommand } from './command/hidden.js'
import { nameCommand } from './command/name.js'
import { searchCommand } from './command/search.js'

// eslint-disable-next-line no-unused-vars
const [_, __, command] = process.argv

switch (true) {
  case command === 'merge': {
    await mergeCommand()
    break
  }
  case command === 'filter': {
    await filterCommand()
    break;
  }
  case command === 'extension': {
    await extensionCommand()
    break;
  }  
  case command === 'empty': {
    await emptyCommand()
    break;
  } 
  case command === 'hidden': {
    await hiddenCommand()
    break;
  } 
  case command === 'name': {
    // the same name but different extension
    await nameCommand()
    break;
  } 
  case command === 'search': {
    // the same name but different extension
    await searchCommand()
    break;
  } 
  // case command === 'double': {
  //   await doubleCommand()
  //   break;
  // } 
  default: {
    console.log('usage: ')
    console.log(' dirtool merge source-dir dest-dir')
    console.log(' dirtool filter source-dir dest-dir filter')
    console.log(' dirtool extension source-dir')

    process.exit(1)
  }
}