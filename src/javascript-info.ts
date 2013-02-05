module TypeScriptUtil {
    export class TypeInfo {
        id: string;
        name: string;
        type: string;
        value: any;
        ctor: Function;
        attributes: any;
        instanceOf: TypeInfo;

        constructor(type: string, name: string, value?: any) {
            this.type = type;
            this.name = name;
            this.value = value;
        }

        toTypeString(): string {
            return this.instanceOf ? this.instanceOf.type : this.type;
        }
    }

    export class ArrayInfo extends TypeInfo {
        constructor(type: string, name: string, value?: any) {
            super(type, null, value);
        }

        toTypeString(): string {
            return this.type + '[]';
        }
    }

    export class FunctionInfo extends TypeInfo {
        src: string;
        name: string;
        parameters: TypeInfo[];
        returnType: string;
        isConstructor: bool;

        constructor(fn: Function, name?: string);
        constructor(functionSource: string, name?: string);
        constructor(functionSource: any, name?: string) {
            super('function', name);

            if (typeof functionSource === 'function') {
                this.src = functionSource.toString();
            } else {
                this.src = functionSource
            }

            this.parameters = [];

            this.parse();
        }

        private parse() {
            var matches = /function ?(\w*)\(([^\)]*)\)/.exec(this.src);
            var hasReturn = !!/return\s/.exec(this.src);

            this.returnType = hasReturn ? 'any' : 'void'; // TODO: try and infer type

            if (matches) {
                var name = matches[1];
                var params = matches[2].split(',');

                if (name) {
                    this.name = name;
                }

                if (params && params.length > 0 && params[0].length > 0) {
                    // TODO: try and infer parameter type from function body
                    this.parameters = params.map(function (p: string) { return new TypeInfo('any', p.trim()) });
                }
            }
        }

        static parse(src: string): FunctionInfo {
            return new FunctionInfo(src, '');
        }

        toTypeString(): string {
            return '(' + this.parameters.map(function (item) { return item.name + ': ' + item.type; }).join(', ') + '): ' + this.returnType;
        }
    }

    export class ClassInfo extends FunctionInfo {
        inherits: ClassInfo;

        constructor(ctor: any, name: string) {
            super(ctor, ctor.name);

            this.ctor = ctor;
            this.type = ctor.name;
        }

        toTypeString(): string {
            return this.type;
        }

        toConstructorString(): string {
            return super.toTypeString();
        }
    }
}