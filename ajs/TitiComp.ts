import { Component, ElementRef, DOCUMENT } from '../ajs_module/lib/api';

@Component({
  selector: 'titi-cmp',
  template: `
    <div>TiTi OUECH</div>
  `,
})
export class TitiComp {
  public firstname: string;
  public lastname: string;

  constructor(public nativeElement: ElementRef, public document: DOCUMENT) {
    this.firstname = 'Adrien';
    this.lastname = 'Boullé';
  }
}
