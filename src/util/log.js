let LOG = false
LOG = true

export const logDebug = LOG
  ? console.log
  : () => {}