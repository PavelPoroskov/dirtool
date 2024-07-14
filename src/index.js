import { mergeCommand } from './command/merge.js';
import { filterCommand } from './command/filter.js'
import { extensionCommand } from './command/extension.js'

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
  default: {
    console.log('usage: ')
    console.log(' dirtool merge source-dir dest-dir')
    console.log(' dirtool filter source-dir dest-dir filter')
    console.log(' dirtool extension source-dir')

    process.exit(1)
  }
}