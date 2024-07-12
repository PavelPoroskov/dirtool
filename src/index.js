import { mergeCommand } from './command/merge.js';
import { filterCommand } from './command/filter.js'

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
  default: {
    console.log('usage: ')
    console.log(' dirtool merge source-dir dest-dir')
    console.log(' dirtool filter source-dir dest-dir filter')
    console.log('   filter is list of file extensions with comma. e.i pdf,epub,fb')

    process.exit(1)
  }
}