import { Component, Input, Output} from '../ajs_module/lib/api';
import { MyService } from './MyService';

@Component({
  selector: 'tata-cmp',
  template: `
    <div>
      <span>TATA COMPONENT {{firstname}} {{service.name}} {{service.secondService.value}} coucoudsqdqskdjqs</span>
      <lolo-cmp></lolo-cmp>
    </div>
  `,
})
export class TataComp {
  @Input()
  public firstname: any;

  @Output()
  public firstnameChanged: Function;

  constructor(public service: MyService) {}

  public onInit(): void {
    this.firstnameChanged('Coucou :D');
  }
}
