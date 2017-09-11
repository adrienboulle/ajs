import { Component, ElementRef, DOCUMENT } from '../ajs_module/lib/api';

@Component({
  selector: 'toto-cmp',
  template: `
    <div>
      <span>TOTO COMPONENT</span>
      <titi-cmp></titi-cmp>
      <br>
      <tata-cmp></tata-cmp>
      <br>
      <span ab-innertext="firstname"></span>
      <br>
      <span>{{firstname }} + {{lastname}}</span>
      <br>
      <br>
    </div>
  `,
})
export class TotoComp {
  public firstname: string;
  public lastname: string;

  constructor(public elementRef: ElementRef, public document: DOCUMENT) {
    this.firstname = 'Adrien';
    this.lastname = 'Boullé';
  }

  public onInit(): void {
    setTimeout(() => {
      const br = this.document.createElement('br');
      this.elementRef.nativeElement.appendChild(br);
      const span = this.document.createElement('span');
      span.innerText = 'Coucou from setTimeout :)';
      this.elementRef.nativeElement.appendChild(span);
    }, 200);

    Promise.resolve()
    .then(() => {
      const br = this.document.createElement('br');
      this.elementRef.nativeElement.appendChild(br);
      const span = this.document.createElement('span');
      span.innerText = 'Coucou from Promise :)';
      this.elementRef.nativeElement.appendChild(span);
    });
  }

  public firstnameChanged(val: string): void {
    const span = this.document.createElement('span');
    span.innerText = val;
    this.elementRef.nativeElement.appendChild(span);
  }
}
