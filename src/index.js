import copyCommand from './command/copy.js'
import doubleCommand from './command/double.js'
import emptyCommand from './command/empty.js'
import extensionCommand from './command/extension.js'
import hiddenCommand from './command/hidden.js'
import linkCommand from './command/link.js'
import mergeCommand from './command/merge.js';
import sameNameCommand from './command/same-name.js'
import searchCommand from './command/search.js'

const commandList = [
  copyCommand,
  doubleCommand,
  emptyCommand,
  extensionCommand,
  hiddenCommand,
  linkCommand,
  mergeCommand,
  sameNameCommand,
  searchCommand,
]

const commandMap = Object.fromEntries(
  commandList.map((commandObj) => [commandObj.cliname, commandObj])
)

// eslint-disable-next-line no-unused-vars
const [_, __, command] = process.argv

const commandObj = commandMap[command]

if (commandObj) {
  await commandObj.commandRunner()
} else {
  console.log('usage: ')
  commandList.forEach((commandObj) => {
    console.log(commandObj.usage)
    console.log(' ', commandObj.description)
  })

  process.exit(1)
}
