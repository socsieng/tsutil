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

    export function inspect(obj: any, maxIterations?: number): any {
        var objectsDone = [];
        var typesDone = [];
        var classes: any = {};

        maxIterations = maxIterations || defaults.maxIterations;

        function getAllProperties(obj: any): string[] {
            var arr = [];
            for (var i in obj) {
                arr.push(i);
            }

            return arr;
        }

        function parseObject(obj: any, hierarchy: any, depth: number) {
            //var props = Object.getOwnPropertyNames(obj);
            var props = getAllProperties(obj);

            props.forEach(function (prop) {
                if (prop in obj) {
                    try {
                        var val = obj[prop];

                        if (typeof val === 'object') {
                            if (val) {
                                var doneIndex = objectsDone.indexOf(val);
                                if (doneIndex === -1) {
                                    var ti = null;
                                    objectsDone.push(val);

                                    if (Array.isArray(val)) {
                                        if (val.length > 0) {
                                            ti = new ArrayInfo(typeof val[0], prop, val); // TODO: iterate through all items to infer type
                                            hierarchy[prop] = ti;
                                        } else {
                                            ti = new ArrayInfo('any', prop);
                                            hierarchy[prop] = ti;
                                        }
                                        
                                        typesDone.push(ti);
                                    } else {
                                        if (val.constructor && val.constructor.name !== 'Object') {
                                            // TODO: make sure names don't conflict
                                            ti = new ClassInfo(val.constructor, val.constructor.name);
                                            if (!classes[val.constructor.toString()]) {
                                                classes[val.constructor.toString()] = ti;
                                            }

                                            // TODO: traverse base classes
                                        } else {
                                            ti = new TypeInfo('any', prop, val);
                                        }

                                        typesDone.push(ti);
                                        hierarchy[prop] = ti;

                                        if (depth < maxIterations) {
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
                                hierarchy[prop] = new TypeInfo('any', prop);
                            }
                        } else if (typeof val === 'function') {
                            var fInfo = new FunctionInfo(val);
                            fInfo.name = fInfo.name || prop;
                            hierarchy[prop] = fInfo;
                        } else if (typeof val === 'boolean') {
                            hierarchy[prop] = new TypeInfo('bool', prop, val);
                        } else {
                            hierarchy[prop] = new TypeInfo(typeof val, prop, val);
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
                var infoType = obj[prop].constructor.name;
                var isClass = obj[prop] instanceof ClassInfo;
                str += getIndent(depth + 1);

                if (format === 'module') {
                    if (infoType === 'FunctionInfo') {
                        str += 'export function ';
                        str += prop + obj[prop].toTypeString() + ' { }\n';
                    } else {
                        str += 'export var ';
                        str += prop + ': ' + obj[prop].toTypeString() + ';' + (obj[prop].value ? '\t// ' + obj[prop].value.toString() + '\n' : '\n');
                    }
                } else if (format === 'class') {
                    if (infoType === 'FunctionInfo') {
                        str += prop + obj[prop].toTypeString() + ' { }\n';
                    } else {
                        str += prop + ': ' + obj[prop].toTypeString() + ';' + (obj[prop].value ? '\t// ' + obj[prop].value.toString() + '\n' : '\n');
                    }
                }

                if (obj[prop].attributes && !isClass) {
                    str += toTypeScriptDefinition(obj[prop].attributes, depth + 1, isClass ? 'class' : 'module', isClass ? obj[prop].type : prop);
                }
            });

            if (format === 'module') {
                str += getIndent(depth) + '}\n';
            }

            return str;
        }
        return '';
    }

    export function toTypeScript(obj: any, maxIterations?: number): string {
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
}