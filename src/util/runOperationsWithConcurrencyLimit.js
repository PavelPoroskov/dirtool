export const runOperationsWithConcurrencyLimit = async ({
  arOperationArguments = [],
  asyncOperation,
  concurrencyLimit = 0,
}) => {
  const innerArguments = arOperationArguments.map((operationArguments, index) => ({
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


