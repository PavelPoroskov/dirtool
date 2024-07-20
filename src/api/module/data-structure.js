export class ExtraSet extends Set {
  addList(list) {
    list.forEach((i) => {
      super.add(i);
    })
  }
}

export class ExtraMap extends Map {
  sum(key, addValue) {
    super.set(key, (super.get(key) || 0) + addValue)
  }
  update(key, updateObj) {
    super.set(key, {
      ...super.get(key),
      ...updateObj,
    })
  }
  push(key, item) {
    if (super.has(key)) {
      const ar = super.get(key)
      super.set(key, ar.concat(item))
    } else {
      super.set(key, [item])
    }
  }
}