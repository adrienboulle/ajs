import { Service } from '../ajs_module/lib/api';

import { My2ndService } from './My2ndService';

@Service()
export class MyService {
  public name: string;

  constructor(public secondService: My2ndService) {
    this.name = 'Coucou from Sercice';
  }
}
