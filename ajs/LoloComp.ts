import { Component } from '../ajs_module/lib/api';

@Component({
  selector: 'lolo-cmp',
  template: '<div>LOLO {{lolo}}</div>',
})
export class LoloComp {
  public lolo: string;

  constructor() {
    this.lolo = 'trololo';
  }
}
