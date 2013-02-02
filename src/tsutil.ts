module TypeScriptUtil {
    class TypeInfo {
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

    class ArrayInfo extends TypeInfo {
        constructor(type: string, name: string, value?: any) {
            super(type, null, value);
        }

        toTypeString(): string {
            return this.type + '[]';
        }
    }

    class FunctionInfo extends TypeInfo {
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

    class ClassInfo extends FunctionInfo {
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

    class ObjectInspector {
        private static DEFAULT_MAX_DEPTH: number = 3;
        private obj: any;
        private maxDepth: number;
        private allInstances: any[];
        private allTypes: TypeInfo[];
        private allClasses: any[];
        private processedInstances: any[];
        private itemIndex: number;
        structure: any;
        classes: ClassInfo[];

        constructor(obj: any, maxDepth?: number) {
            this.obj = obj;
            this.maxDepth = typeof maxDepth === 'undefined' ? ObjectInspector.DEFAULT_MAX_DEPTH : maxDepth;
            this.allInstances = [];
            this.allTypes = [];
            this.allClasses = [];
            this.processedInstances = [];
            this.itemIndex = 0;
            this.structure = {};
            this.structure = [];
        }

        private getAllProperties(obj: any): string[] {
            var self = this;
            if (obj && typeof obj === 'object') {
                var props = Object.getOwnPropertyNames(obj);
                return props.filter(function (item) { return !self.isIgnoredProperty(item) });
            }
            return [];
        }

        private getItemId(): string {
            return 'i' + (++this.itemIndex);
        }

        private getTypeString(value: any, isArray?: bool): string {
            if (value) {
                var type = typeof value;
                switch (type) {
                    case 'object':
                        if (Array.isArray(value)) {
                            return 'any[]';
                        } else if (value instanceof Date) {
                            return 'Date';
                        }
                        return 'any';
                    case 'boolean':
                        return 'bool';
                    case 'function':
                        return 'Function';
                    default:
                        return type;
                }
            }
            return 'any';
        }

        private isIgnoredProperty(prop: string): bool {
            var ignored: string[] = ['constructor'];
            return ignored.indexOf(prop) !== -1;
        }

        private isIgnoredValue(obj: any): bool {
            var ignored: any[] = [Object, String, Number, Boolean, Date, Function, Array, Window, window];
            return ignored.indexOf(obj) !== -1;
        }

        // find all unique object instances
        private extractInstances(obj: any, depth: number) {
            var self = this;
            if (!self.isIgnoredValue(obj) && self.allInstances.indexOf(obj) === -1) {
                self.allInstances.push(obj);

                if (obj) {
                    if (depth < self.maxDepth || self.maxDepth === 0) {
                        var props = self.getAllProperties(obj);

                        props.forEach(function (prop: string) {
                            var val = obj[prop];
                            self.extractInstances(val, depth + 1);
                        });
                    }

                    // inheritence
                    var instanceOf = self.getConstructor(obj);
                    if (instanceOf) {
                        if (self.allClasses.indexOf(instanceOf) === -1) {
                            self.allClasses.push(instanceOf);
                        }
                        self.extractInstances(instanceOf, 0);
                    }
                    if (obj.__proto__ && obj.__proto__.constructor !== Object && !self.isIgnoredValue(obj.__proto__.constructor)) {
                        self.extractInstances(obj.__proto__, 0);
                    }
                }
            }
        }

        private constructTypeInfo(obj: any): TypeInfo {
            if (obj) {
                var type = this.getTypeString(obj);
                switch (type) {
                    case 'any[]':
                        if (obj.length == 0) {
                            return new ArrayInfo('any', null, obj);
                        }
                        // TODO: iterate through array to identify all types
                        return new ArrayInfo(this.getTypeString(obj[0]), null, obj);
                    case 'object':
                        return new TypeInfo('any', null, obj);
                    case 'Function':
                        if (this.allClasses.indexOf(obj) !== -1) {
                            return new ClassInfo(obj, obj.name);
                        }
                        return new FunctionInfo(obj, null);
                    default:
                        return new TypeInfo(type, null, obj);
                }
            }
            return new TypeInfo('any', null, obj);
        }

        private getTypeInfo(obj: any): TypeInfo {
            var index = this.allInstances.indexOf(obj);
            if (index != -1) {
                return this.allTypes[index];
            }
            throw new Error('object couldn\'t be found for type: ' + typeof(obj));
        }

        private inspectInternal(obj: any, depth: number, infoContainer: any) {
            var self = this;
            if (!self.isIgnoredValue(obj) && self.processedInstances.indexOf(obj) === -1) {
                self.processedInstances.push(obj);

                if (obj) {
                    if (depth < self.maxDepth || self.maxDepth === 0) {
                        var props = self.getAllProperties(obj);

                        props.forEach(function (prop: string) {
                            var val = obj[prop];
                            var typeInfo = self.getTypeInfo(val);
                            var ctor = self.getConstructor(val);

                            if (ctor) {
                                typeInfo.instanceOf = self.getTypeInfo(ctor);
                                typeInfo = typeInfo.instanceOf;
                            }

                            infoContainer[prop] = typeInfo;

                            if (val && self.getAllProperties(val).length) {
                                typeInfo.attributes = typeInfo.attributes || {};
                                self.inspectInternal(val, depth + 1, typeInfo.attributes);
                            }
                        });
                    }

                    // inheritence
                    var objTypeInfo = self.getTypeInfo(obj);
                    var ctor = self.getConstructor(obj);
                    if (ctor) {
                        // obj is an instance of a class
                        var ctorTypeInfo: FunctionInfo = <FunctionInfo>self.getTypeInfo(ctor);
                        ctorTypeInfo.isConstructor = true;

                        objTypeInfo.instanceOf = self.getTypeInfo(ctor);

                        var baseCtor = self.getConstructor(obj.__proto__);
                        var base = obj.__proto__;
                        if (baseCtor === ctor) {
                            baseCtor = self.getConstructor(obj.__proto__.__proto__);
                            base = obj.__proto__.__proto__;
                        }

                        if (baseCtor) {
                            var baseTypeInfo = ctorTypeInfo.instanceOf = self.getTypeInfo(baseCtor);

                            if (base && self.getAllProperties(base).length) {
                                baseTypeInfo.attributes = baseTypeInfo.attributes || {};
                                self.inspectInternal(base, depth + 1, baseTypeInfo.attributes);
                            }
                        }
                    }
                }
            }
        }

        private getConstructor(obj: any): Function {
            if (obj && obj.constructor !== Object && !this.isIgnoredValue(obj.constructor)) {
                return obj.constructor;
            }
            return null;
        }

        inspect(): any {
            var self = this;
            self.extractInstances(this.obj, 0);
            self.allTypes = self.allInstances.map(function(item) {
                return self.constructTypeInfo(item);
            });
            var structure = this.structure = {};
            self.inspectInternal(self.obj, 0, structure);

            var classes = this.classes = self.allClasses.map(function (item) {
                return self.getTypeInfo(item);
            });
            return {
                structure: structure,
                classes: classes
            };
        }
    }

    class ObjectInspectorFormatter {
        inspector: ObjectInspector;
        indent: string;
        constructor(inspector: ObjectInspector, indent?: string) {
            this.inspector = inspector;
            this.indent = indent || '  ';
        }

        format(rootName: string): string {
            throw new Error('format method not implemented');
        }

        formatString(format: string, ...params: any[]);
        formatString(format: string, params?: any) {
            var args: any[] = Array.prototype.slice.call(arguments, 1);
            var result = format;
            if (args) {
                args.forEach(function (arg, index) {
                    var exp = new RegExp('\\{' + index + ':?([^\\}]*)\\}', 'g');
                    result = result.replace(exp, arg);
                });
            }
            return result;
        }

        getIndent(level: number): string {
            var str = '';
            for (var i = 0; i < level; i++) { str += this.indent }
            return str;
        }
    }

    class TypeScriptFormatter extends ObjectInspectorFormatter {
        constructor(inspector: ObjectInspector, indent?: string) {
            super(inspector, indent);
        }

        format(rootName: string): string {
            var str = this.formatClasses();
            str += this.formatModule(rootName, this.inspector.structure, 0);
            return str;
        }

        private formatClasses(): string {
            var self = this;
            var str = '';

            self.inspector.classes.forEach(function (cl) {
                str += self.formatString('class {0}', cl.name);
                if (cl.instanceOf) {
                    str += self.formatString(' extends {0}', cl.instanceOf.name);
                }
                str += ' {\n';

                str += self.formatString('{0}constructor {1} { }\n', self.indent, cl.toConstructorString());
                if (cl.attributes) {
                    str += self.formatClassMembers(cl.attributes);
                }

                str += '}\n';
            });

            return str;
        }

        private formatModule(name: string, attributes: any, depth: number): string {
            var self = this;
            var str = '';

            str += self.formatString('{0}module {1} {\n', self.getIndent(depth), name);

            if (attributes) {
                str += self.formatModuleMembers(attributes, depth);
            }

            str += self.getIndent(depth);
            str += '}\n';

            return str;
        }

        private formatModuleMembers(obj: any, depth: number) {
            var self = this;
            var props = Object.getOwnPropertyNames(obj);
            var str = '';

            props.forEach(function (prop) {
                if (obj[prop]) {
                    var infoType = obj[prop].constructor.name;

                    if (infoType === 'FunctionInfo') {
                        str += self.formatString('{0}export function{1}{2} { }\n', self.getIndent(depth + 1), prop, obj[prop].toTypeString());
                    } else {
                        str += self.formatString('{0}export var {1}: {2};\n', self.getIndent(depth + 1), prop, obj[prop].toTypeString());
                        //str += prop + ': ' + obj[prop].toTypeString() + ';' + (obj[prop].value && infoType !== 'ArrayInfo' ? '\t// ' + obj[prop].value.toString() + '\n' : '\n');
                    }

                    if (obj[prop].attributes && !obj[prop].instanceOf) {
                        str += self.formatModule(prop, obj[prop].attributes, depth + 1);
                    }
                }
            });

            return str;
        }

        private formatClassMembers(obj: any) {
            var self = this;
            var props = Object.getOwnPropertyNames(obj);
            var str = '';

            props.forEach(function (prop) {
                if (obj[prop]) {
                    var infoType = obj[prop].constructor.name;

                    if (infoType === 'FunctionInfo') {
                        str += self.formatString('{0}{1}{2} { }\n', self.indent, prop, obj[prop].toTypeString());
                    } else {
                        str += self.formatString('{0}{1}: {2};\n', self.indent, prop, obj[prop].toTypeString());
                        //str += prop + ': ' + obj[prop].toTypeString() + ';' + (obj[prop].value && infoType !== 'ArrayInfo' ? '\t// ' + obj[prop].value.toString() + '\n' : '\n');
                    }

                    if (obj[prop].attributes && !obj[prop].instanceOf) {
                        //str += toTypeScriptDefinition(obj[prop].attributes, depth + 1, isClass ? 'class' : 'module', isClass ? obj[prop].type : prop);
                    }
                }
            });

            return str;
        }
    }

    export function toTypeScript(obj: any, name: string, maxIterations?: number): string {
        var str = '';
        var insp = new ObjectInspector(obj, maxIterations);
        var hier = insp.inspect();
        var formatter = new TypeScriptFormatter(insp);
        if (hier) {
            str += formatter.format(name);
        }
        return str;
    }
}