module TypeScriptUtil {
    class TypeInfo {
        id: string;
        name: string;
        type: string;
        value: any;
        ctor: Function;
        attributes: any;

        constructor(type: string, name: string, value?: any) {
            this.type = type;
            this.name = name;
            this.value = value;
        }

        toTypeString(): string {
            return this.type;
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
        static DEFAULT_MAX_DEPTH: number = 3;
        obj: any;
        maxDepth: number;
        allInstances: any[];
        allTypes: TypeInfo[];
        allClasses: any[];
        processedInstances: any[];
        itemIndex: number;

        constructor(obj: any, maxDepth?: number) {
            this.obj = obj;
            this.maxDepth = typeof maxDepth === 'undefined' ? ObjectInspector.DEFAULT_MAX_DEPTH : maxDepth;
            this.allInstances = [];
            this.allTypes = [];
            this.allClasses = [];
            this.processedInstances = [];
            this.itemIndex = 0;
        }

        getAllProperties(obj: any): string[] {
            if (obj && typeof obj === 'object') {
                return Object.getOwnPropertyNames(obj);
            }
            return [];
            //var arr: string[] = [];
            //for (var i in obj) {
            //    arr.push(i);
            //}
            //return arr;
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

        private isIgnored(obj: any): bool {
            var ignored: any[] = [Object, String, Number, Boolean, Function, Array, Window, window];
            return ignored.indexOf(obj) !== -1;
        }

        // find all unique object instances
        private extractInstances(obj: any, depth: number) {
            var self = this;
            if (!self.isIgnored(obj) && self.allInstances.indexOf(obj) === -1) {
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
                    if (obj.constructor !== Object && !self.isIgnored(obj.constructor)) {
                        if (self.allClasses.indexOf(obj.constructor) === -1) {
                            self.allClasses.push(obj.constructor);
                        }
                        self.extractInstances(obj.constructor, 0);
                    }
                    if (obj.__proto__ && obj.__proto__.constructor !== Object && !self.isIgnored(obj.__proto__.constructor)) {
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
            if (!self.isIgnored(obj) && self.processedInstances.indexOf(obj) === -1) {
                self.processedInstances.push(obj);

                if (obj) {
                    if (depth < self.maxDepth || self.maxDepth === 0) {
                        var props = self.getAllProperties(obj);

                        props.forEach(function (prop: string) {
                            var val = obj[prop];
                            var typeInfo = self.getTypeInfo(val);

                            infoContainer[prop] = typeInfo;

                            if (val && self.getAllProperties(val).length) {
                                typeInfo.attributes = {};
                                self.inspectInternal(val, depth + 1, typeInfo.attributes);
                            }
                        });
                    }

                    // inheritence
                    if (obj.constructor !== Object && !self.isIgnored(obj.constructor)) {
                        // obj is an instance of a class
                        var typeInfo: FunctionInfo = <FunctionInfo>self.getTypeInfo(obj.constructor);
                        typeInfo.isConstructor = true;
                    }
                    if (obj.__proto__ && obj.__proto__.constructor !== Object && !self.isIgnored(obj.__proto__.constructor)) {
                        //self.extractInstances(obj.__proto__, 0);
                    }
                }
            }
        }

        inspect(): any {
            var self = this;
            self.extractInstances(this.obj, 0);
            self.allTypes = self.allInstances.map(function(item) {
                return self.constructTypeInfo(item);
            });
            var structure = {};
            self.inspectInternal(self.obj, 0, structure);
            return {
                structure: structure,
                classes: <any[]>self.allClasses.map(function (item) {
                    return self.getTypeInfo(item);
                })
            };
        }
    }

    var defaults = {
        maxIterations: 3,
        indent: '  '
    }

    function getIndent(level: number, characters?: string) {
        characters = typeof characters === 'undefined' ? defaults.indent : characters;
        var str = '';
        for (var i = 0; i < level; i++) { str += characters }
        return str;
    }

    function getTypeString(value: any): string {
        if (value) {
            var type = typeof value;
            switch (type) {
                case 'object':
                    if (Array.isArray(value)) {
                        if (value.length == 0) {
                            return 'any[]';
                        }

                        // TODO: inspect all elements of the array
                        return getTypeString(value[0]) + '[]';
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

    export function inspect(obj: any, maxIterations?: number): any {
        var objectsDone = [];
        var typesDone = [];
        var classes: any = {};

        maxIterations = typeof maxIterations === 'undefined' ? defaults.maxIterations : maxIterations;

        function getAllProperties(obj: any): string[] {
            var arr = [];
            for (var i in obj) {
                arr.push(i);
            }

            return arr;
        }

        var anonCount = 0;
        function parseObject(obj: any, hierarchy: any, depth: number) {
            //var props = Object.getOwnPropertyNames(obj);
            var props = getAllProperties(obj);

            props.forEach(function (prop) {
                if (prop in obj) {
                    try {
                        var val = obj[prop];
                        var type = getTypeString(val);

                        if (typeof val === 'object' && val !== window) { // ignore the window object
                            if (val) {
                                var doneIndex = objectsDone.indexOf(val);
                                if (doneIndex === -1) {
                                    var ti = null;
                                    objectsDone.push(val);

                                    if (Array.isArray(val)) {
                                        if (val.length > 0) {
                                            ti = new ArrayInfo(getTypeString(val[0]), prop, val); // TODO: iterate through all items to infer type
                                            hierarchy[prop] = ti;
                                        } else {
                                            ti = new ArrayInfo('any', prop);
                                            hierarchy[prop] = ti;
                                        }
                                        
                                        typesDone.push(ti);
                                    } else {
                                        if (val.constructor && val.constructor.name !== 'Object') {
                                            // TODO: make sure names don't conflict
                                            if (!classes[val.constructor.toString()]) {
                                                ti = new ClassInfo(val.constructor, val.constructor.name);
                                                typesDone.push(ti);

                                                // handle anonymous constructors
                                                if (!(ti.name && ti.type)) {
                                                    var existingFunctionIndex = objectsDone.indexOf(val);
                                                    var existingFunction = typesDone[existingFunctionIndex];
                                                    ti.name = ti.type = existingFunction && existingFunction.name ? existingFunction.name : 'Anon_' + (++anonCount);
                                                }

                                                classes[val.constructor.toString()] = ti;
                                            } else {
                                                typesDone.push(null);
                                            }

                                            // TODO: traverse base classes
                                        } else {
                                            ti = new TypeInfo(type, prop, val);
                                            typesDone.push(ti);
                                        }

                                        hierarchy[prop] = ti;

                                        if (depth + 1 < maxIterations || maxIterations === 0) {
                                            var attr = {};
                                            parseObject(val, attr, depth + 1);

                                            if (Object.getOwnPropertyNames(attr).length) {
                                                ti.attributes = attr;
                                            }
                                        } else {
                                            // max depth exceeded
                                        }
                                    }
                                } else {
                                    // object instance already processed (prevents circular recursion)
                                    hierarchy[prop] = typesDone[doneIndex];
                                }
                            } else {
                                hierarchy[prop] = new TypeInfo(type, prop);
                            }
                        } else if (typeof val === 'function') {
                            var fInfo = new FunctionInfo(val);
                            fInfo.name = fInfo.name || prop;
                            hierarchy[prop] = fInfo;
                        } else if (typeof val === 'boolean') {
                            hierarchy[prop] = new TypeInfo(type, prop, val);
                        } else {
                            hierarchy[prop] = new TypeInfo(type, prop, val);
                        }
                    } catch (ex) {
                        console.log(ex);
                    }
                }
            });
        }

        if (obj) {
            var hier = {}
            parseObject(obj, hier, 0);
            //return hier;

            return {
                structure: hier,
                classes: classes
            };
        }
        return null;
    }

    function toTypeScriptDefinition(obj: any, depth: number, format: string, name: string) {
        if (obj) {
            var props = Object.getOwnPropertyNames(obj);
            var indent = '  ';
            var str = '';

            if (format === 'module') {
                str += getIndent(depth) + 'module ' + name + ' {\n';
            }

            props.forEach(function (prop) {
                if (obj[prop]) {
                    var infoType = obj[prop].constructor.name;
                    var isClass = obj[prop] instanceof ClassInfo;
                    str += getIndent(depth + 1);

                    if (format === 'module') {
                        if (infoType === 'FunctionInfo') {
                            str += 'export function ';
                            str += prop + obj[prop].toTypeString() + ' { }\n';
                        } else {
                            str += 'export var ';
                            str += prop + ': ' + obj[prop].toTypeString() + ';' + (obj[prop].value && infoType !== 'ArrayInfo' ? '\t// ' + obj[prop].value.toString() + '\n' : '\n');
                        }
                    } else if (format === 'class') {
                        if (infoType === 'FunctionInfo') {
                            str += prop + obj[prop].toTypeString() + ' { }\n';
                        } else {
                            str += prop + ': ' + obj[prop].toTypeString() + ';' + (obj[prop].value && infoType !== 'ArrayInfo' ? '\t// ' + obj[prop].value.toString() + '\n' : '\n');
                        }
                    }

                    if (obj[prop].attributes && !isClass) {
                        str += toTypeScriptDefinition(obj[prop].attributes, depth + 1, isClass ? 'class' : 'module', isClass ? obj[prop].type : prop);
                    }
                }
            });

            if (format === 'module') {
                str += getIndent(depth) + '}\n';
            }

            return str;
        }
        return '';
    }

    export function toTypeScript1(obj: any, maxIterations?: number): string {
        var str = '';
        var hier = inspect(obj, maxIterations);
        if (hier) {
            str = toTypeScriptDefinition(hier.structure, 0, 'module', 'MyModule');

            for (var c in hier.classes) {
                var cl = hier.classes[c];
                str += 'class ' + cl.type + ' {\n';
                str += getIndent(1) + 'constructor' + cl.toConstructorString() + ' { }\n';
                if (cl.attributes) {
                    str += toTypeScriptDefinition(cl.attributes, 0, 'class', '');
                }
                str += '}\n';
            }
        }
        return str;
    }

    export function toTypeScript2(obj: any, maxIterations?: number): string {
        var str = '';
        var insp = new ObjectInspector(obj, maxIterations);
        var hier = insp.inspect();
        if (hier) {
            str = toTypeScriptDefinition(hier.structure, 0, 'module', 'MyModule');

            hier.classes.forEach(function (cl) {
                str += 'class ' + cl.type + ' {\n';
                str += getIndent(1) + 'constructor' + cl.toConstructorString() + ' { }\n';
                if (cl.attributes) {
                    str += toTypeScriptDefinition(cl.attributes, 0, 'class', '');
                }
                str += '}\n';
            });
        }
        return str;
    }

    export var toTypeScript = toTypeScript2;
}