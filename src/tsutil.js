var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var TypeScriptUtil;
(function (TypeScriptUtil) {
    var TypeInfo = (function () {
        function TypeInfo(type, name, value) {
            this.type = type;
            this.name = name;
            this.value = value;
        }
        TypeInfo.prototype.toTypeString = function () {
            return this.type;
        };
        return TypeInfo;
    })();    
    var ArrayInfo = (function (_super) {
        __extends(ArrayInfo, _super);
        function ArrayInfo(type, name, value) {
                _super.call(this, type, null, value);
        }
        ArrayInfo.prototype.toTypeString = function () {
            return this.type + '[]';
        };
        return ArrayInfo;
    })(TypeInfo);    
    var FunctionInfo = (function (_super) {
        __extends(FunctionInfo, _super);
        function FunctionInfo(functionSource, name) {
                _super.call(this, 'function', name);
            if(typeof functionSource === 'function') {
                this.src = functionSource.toString();
            } else {
                this.src = functionSource;
            }
            this.parameters = [];
            this.parse();
        }
        FunctionInfo.prototype.parse = function () {
            var matches = /function ?(\w*)\(([^\)]*)\)/.exec(this.src);
            var hasReturn = !!/return\s/.exec(this.src);
            this.returnType = hasReturn ? 'any' : 'void';
            if(matches) {
                var name = matches[1];
                var params = matches[2].split(',');
                if(name) {
                    this.name = name;
                }
                if(params && params.length > 0 && params[0].length > 0) {
                    this.parameters = params.map(function (p) {
                        return new TypeInfo('any', p.trim());
                    });
                }
            }
        };
        FunctionInfo.parse = function parse(src) {
            return new FunctionInfo(src, '');
        }
        FunctionInfo.prototype.toTypeString = function () {
            return '(' + this.parameters.map(function (item) {
                return item.name + ': ' + item.type;
            }).join(', ') + '): ' + this.returnType;
        };
        return FunctionInfo;
    })(TypeInfo);    
    var ClassInfo = (function (_super) {
        __extends(ClassInfo, _super);
        function ClassInfo(ctor, name) {
                _super.call(this, ctor, ctor.name);
            this.ctor = ctor;
            this.type = ctor.name;
        }
        ClassInfo.prototype.toTypeString = function () {
            return this.type;
        };
        ClassInfo.prototype.toConstructorString = function () {
            return _super.prototype.toTypeString.call(this);
        };
        return ClassInfo;
    })(FunctionInfo);    
    var defaults = {
        maxIterations: 3,
        indent: '  '
    };
    function getIndent(level, characters) {
        characters = typeof characters === 'undefined' ? defaults.indent : characters;
        var str = '';
        for(var i = 0; i < level; i++) {
            str += characters;
        }
        return str;
    }
    function getTypeString(value) {
        if(value) {
            var type = typeof value;
            switch(type) {
                case 'object': {
                    if(Array.isArray(value)) {
                        if(value.length == 0) {
                            return 'any[]';
                        }
                        return getTypeString(value[0]) + '[]';
                    }
                    return 'any';

                }
                case 'boolean': {
                    return 'bool';

                }
                case 'function': {
                    return 'Function';

                }
                default: {
                    return type;

                }
            }
        }
        return 'any';
    }
    function inspect(obj, maxIterations) {
        var objectsDone = [];
        var typesDone = [];
        var classes = {
        };
        maxIterations = typeof maxIterations === 'undefined' ? defaults.maxIterations : maxIterations;
        function getAllProperties(obj) {
            var arr = [];
            for(var i in obj) {
                arr.push(i);
            }
            return arr;
        }
        var anonCount = 0;
        function parseObject(obj, hierarchy, depth) {
            var props = getAllProperties(obj);
            props.forEach(function (prop) {
                if(prop in obj) {
                    try  {
                        var val = obj[prop];
                        var type = getTypeString(val);
                        if(typeof val === 'object' && val !== window) {
                            if(val) {
                                var doneIndex = objectsDone.indexOf(val);
                                if(doneIndex === -1) {
                                    var ti = null;
                                    objectsDone.push(val);
                                    if(Array.isArray(val)) {
                                        if(val.length > 0) {
                                            ti = new ArrayInfo(getTypeString(val[0]), prop, val);
                                            hierarchy[prop] = ti;
                                        } else {
                                            ti = new ArrayInfo('any', prop);
                                            hierarchy[prop] = ti;
                                        }
                                        typesDone.push(ti);
                                    } else {
                                        if(val.constructor && val.constructor.name !== 'Object') {
                                            if(!classes[val.constructor.toString()]) {
                                                ti = new ClassInfo(val.constructor, val.constructor.name);
                                                typesDone.push(ti);
                                                if(!(ti.name && ti.type)) {
                                                    var existingFunctionIndex = objectsDone.indexOf(val);
                                                    var existingFunction = typesDone[existingFunctionIndex];
                                                    ti.name = ti.type = existingFunction && existingFunction.name ? existingFunction.name : 'Anon_' + (++anonCount);
                                                }
                                                classes[val.constructor.toString()] = ti;
                                            } else {
                                                typesDone.push(null);
                                            }
                                        } else {
                                            ti = new TypeInfo(type, prop, val);
                                            typesDone.push(ti);
                                        }
                                        hierarchy[prop] = ti;
                                        if(depth + 1 < maxIterations || maxIterations === 0) {
                                            var attr = {
                                            };
                                            parseObject(val, attr, depth + 1);
                                            if(Object.getOwnPropertyNames(attr).length) {
                                                ti.attributes = attr;
                                            }
                                        } else {
                                        }
                                    }
                                } else {
                                    hierarchy[prop] = typesDone[doneIndex];
                                }
                            } else {
                                hierarchy[prop] = new TypeInfo(type, prop);
                            }
                        } else {
                            if(typeof val === 'function') {
                                var fInfo = new FunctionInfo(val);
                                fInfo.name = fInfo.name || prop;
                                hierarchy[prop] = fInfo;
                            } else {
                                if(typeof val === 'boolean') {
                                    hierarchy[prop] = new TypeInfo(type, prop, val);
                                } else {
                                    hierarchy[prop] = new TypeInfo(type, prop, val);
                                }
                            }
                        }
                    } catch (ex) {
                        console.log(ex);
                    }
                }
            });
        }
        if(obj) {
            var hier = {
            };
            parseObject(obj, hier, 0);
            return {
                structure: hier,
                classes: classes
            };
        }
        return null;
    }
    TypeScriptUtil.inspect = inspect;
    function toTypeScriptDefinition(obj, depth, format, name) {
        if(obj) {
            var props = Object.getOwnPropertyNames(obj);
            var indent = '  ';
            var str = '';
            if(format === 'module') {
                str += getIndent(depth) + 'module ' + name + ' {\n';
            }
            props.forEach(function (prop) {
                if(obj[prop]) {
                    var infoType = obj[prop].constructor.name;
                    var isClass = obj[prop] instanceof ClassInfo;
                    str += getIndent(depth + 1);
                    if(format === 'module') {
                        if(infoType === 'FunctionInfo') {
                            str += 'export function ';
                            str += prop + obj[prop].toTypeString() + ' { }\n';
                        } else {
                            str += 'export var ';
                            str += prop + ': ' + obj[prop].toTypeString() + ';' + (obj[prop].value && infoType !== 'ArrayInfo' ? '\t// ' + obj[prop].value.toString() + '\n' : '\n');
                        }
                    } else {
                        if(format === 'class') {
                            if(infoType === 'FunctionInfo') {
                                str += prop + obj[prop].toTypeString() + ' { }\n';
                            } else {
                                str += prop + ': ' + obj[prop].toTypeString() + ';' + (obj[prop].value && infoType !== 'ArrayInfo' ? '\t// ' + obj[prop].value.toString() + '\n' : '\n');
                            }
                        }
                    }
                    if(obj[prop].attributes && !isClass) {
                        str += toTypeScriptDefinition(obj[prop].attributes, depth + 1, isClass ? 'class' : 'module', isClass ? obj[prop].type : prop);
                    }
                }
            });
            if(format === 'module') {
                str += getIndent(depth) + '}\n';
            }
            return str;
        }
        return '';
    }
    function toTypeScript(obj, maxIterations) {
        var str = '';
        var hier = inspect(obj, maxIterations);
        if(hier) {
            str = toTypeScriptDefinition(hier.structure, 0, 'module', 'MyModule');
            for(var c in hier.classes) {
                var cl = hier.classes[c];
                str += 'class ' + cl.type + ' {\n';
                str += getIndent(1) + 'constructor' + cl.toConstructorString() + ' { }\n';
                if(cl.attributes) {
                    str += toTypeScriptDefinition(cl.attributes, 0, 'class', '');
                }
                str += '}\n';
            }
        }
        return str;
    }
    TypeScriptUtil.toTypeScript = toTypeScript;
})(TypeScriptUtil || (TypeScriptUtil = {}));
