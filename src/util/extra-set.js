export class ExtraSet extends Set {
  addList(list) {
    list.forEach((i) => {
      super.add(i);
    })
  }
}