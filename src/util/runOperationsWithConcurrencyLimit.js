
export const runOperationsWithConcurrencyLimit = async ({
  operationArgumentsList = [],
  asyncOperation,
  concurrencyLimit = 0,
}) => {
  let argumentsIterator = Array.isArray(operationArgumentsList)
    ? operationArgumentsList[Symbol.iterator]()
    : operationArgumentsList

  function* makeArgumentsIndex() {
    let index = 0;
    while (true) {
      yield index++;
    }
  }

  const argumentsIndexIterator = makeArgumentsIndex()
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
    const { value: resultIndex } = argumentsIndexIterator.next()
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

  return Array.from(resultMap.entries())
    .sort((a,b) => a[0] - b[0])
    .map(([i,v]) => v)
};

export const runOperationsWithConcurrencyLimit20 = async (ops) => runOperationsWithConcurrencyLimit({
  ...ops,
  concurrencyLimit: 20,
})