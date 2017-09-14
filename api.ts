declare let Reflect: any;

export function Component(opts: any) {
  return function (target: any) {
    let annotations: any = {};

    if (!Reflect.hasMetadata('annotations', target)) {
      Reflect.defineMetadata('annotations', annotations, target);
    } else {
      annotations = Reflect.getMetadata('annotations', target);
    }

    opts.inputs = [...annotations.inputs || [], ...opts.inputs || []];
    opts.outputs = [...annotations.outputs || [], ...opts.outputs || []];

    Object.assign(annotations, opts);
  };
}

export function Service() {
  return function (target: any) {
    Reflect.defineMetadata('service', true, target);
  };
}

export function Input(val?: string): any {
  return function (target: any, propertyKey: string) {
    let annotations: any = {};

    if (!Reflect.hasMetadata('annotations', target.constructor)) {
      Reflect.defineMetadata('annotations', annotations, target.constructor);
    } else {
      annotations = Reflect.getMetadata('annotations', target.constructor);
    }

    annotations.inputs = annotations.inputs || [];
    annotations.inputs.push(val || propertyKey);
  };
}

export function Output(val?: string): any {
  return function (target: any, propertyKey: string) {
    let annotations: any = {};

    if (!Reflect.hasMetadata('annotations', target.constructor)) {
      Reflect.defineMetadata('annotations', annotations, target.constructor);
    } else {
      annotations = Reflect.getMetadata('annotations', target.constructor);
    }

    annotations.outputs = annotations.outputs || [];
    annotations.outputs.push(val || propertyKey);
  };
}

export class ElementRef {
  constructor(public nativeElement: Element) {}
}

export class DOCUMENT {
  public createElement: any;
}
