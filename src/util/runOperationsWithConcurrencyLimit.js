const runOperationsWithConcurrencyLimit = async ({
  operationArgumentsList = [],
  asyncOperation,
  concurrencyLimit = 0,
}) => {
  const inOperationArgumentsList = operationArgumentsList?.[Symbol.iterator]
    ? Array.from(operationArgumentsList)
    : operationArgumentsList
  
  const innerArguments = inOperationArgumentsList.map((operationArguments, index) => ({
    operationArguments,
    resultIndex: index,
  }));

  const arResults = new Array(innerArguments.length);
  const concurrentPromises = new Array(concurrencyLimit || innerArguments.length)
    .fill(Promise.resolve());

  const chainNext = inPromise => inPromise.then(() => {
    // after inPromise resolved get next argument
    const nextArguments = innerArguments.shift();

    if (nextArguments) {
      const { operationArguments, resultIndex } = nextArguments;

      return chainNext(
        // start next operation
        asyncOperation(operationArguments)
          .then((operationResult) => {
            arResults[resultIndex] = operationResult;
          })
      );
    }
  });

  await Promise.all(concurrentPromises.map(chainNext));

  return arResults;
};

export const runOperationsWithConcurrencyLimit20 = async (ops) => runOperationsWithConcurrencyLimit({
  ...ops,
  concurrencyLimit: 20,
})