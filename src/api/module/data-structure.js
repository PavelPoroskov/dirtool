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
}