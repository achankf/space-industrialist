export default class Bug extends Error {
  constructor(msg = "") {
    super(msg);
    this.name = this.constructor.name;
  }
}
