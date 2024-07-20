const SIZE = {
  T: 1099511627776,
  G: 1073741824,
  M: 1048576,
  K: 1024,
}

export const floorN = (n) => {
  return Math.floor(n * 100) / 100
}

export const floorPercent = (n) => {
  return Math.floor(n * 10000) / 100
}

export function formatSize(n) {
  let result

  switch (true) {
    case n > SIZE.T: {
      let m = floorN(n / SIZE.T)
      result = `${m} Tb`
      break
    }
    case n > SIZE.G: {
      let m = floorN(n / SIZE.G)
      result = `${m} Gb`
      break
    }
    case n > SIZE.M: {
      let m = floorN(n / SIZE.M)
      result = `${m} Mb`
      break
    }
    case n > SIZE.K: {
      let m = floorN(n / SIZE.K)
      result = `${m} Kb`
      break
    }
    default: {
      result = `${n} bytes`
    }
  }

  return result
}
