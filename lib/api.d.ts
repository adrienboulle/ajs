export declare const serviceMap: Map<any, any>;
export declare function Component(opts: any): (target: any) => void;
export declare function Service(): (a: any) => void;
export declare function Input(val?: string): any;
export declare function Output(val?: string): any;
export declare class ElementRef {
    nativeElement: Element;
    constructor(nativeElement: Element);
}
export declare class DOCUMENT {
    createElement: any;
}
