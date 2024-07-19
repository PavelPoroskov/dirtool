
export const runOperationsWithConcurrencyLimit = async ({
  operationArgumentsList = [],
  asyncOperation,
  concurrencyLimit = 0,
}) => {
  let argumentsIterator = Array.isArray(operationArgumentsList)
    ? operationArgumentsList[Symbol.iterator]()
    : operationArgumentsList


  let resultIndexGlobal = 0;

  const resultMap = new Map()
  let concurrentPromiseList

  if (concurrencyLimit) {
    concurrentPromiseList = new Array(concurrencyLimit)
      .fill(Promise.resolve());
  } else {
    const operationArgumentsList2 = Array.from(argumentsIterator)
    concurrentPromiseList = new Array(operationArgumentsList2.length)
      .fill(Promise.resolve());

    argumentsIterator = operationArgumentsList2[Symbol.iterator]()
  }

  const chainNext = inPromise => inPromise.then(() => {
    // after inPromise resolved get next argument
    const resultIndex = resultIndexGlobal++
    const argumentsIteratorResult = argumentsIterator.next();

    if (!argumentsIteratorResult.done) {
      const operationArguments = argumentsIteratorResult.value;

      return chainNext(
        // start next operation
        asyncOperation(operationArguments)
          .then((operationResult) => {
            resultMap.set(resultIndex, operationResult)
          })
      );
    }
  });

  await Promise.all(
    concurrentPromiseList.map(chainNext)
  );

  /* eslint-disable no-unused-vars */
  return Array.from(resultMap.entries())
    .sort((a,b) => a[0] - b[0])
    .map(([_,v]) => v)
  /* eslint-enable no-unused-vars */
};

export const runOperationsWithConcurrencyLimit20 = async (ops) => runOperationsWithConcurrencyLimit({
  ...ops,
  concurrencyLimit: 20,
})