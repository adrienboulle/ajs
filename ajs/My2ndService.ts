import { Service } from '../ajs_module/lib/api';

@Service()
export class My2ndService {
  public value: string;

  constructor() {
    this.value = 'SECOND SERVICE YOLO';
  }
}
