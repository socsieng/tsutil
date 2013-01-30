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
        maxIterations: 3
    };
    function toTypeScript(obj, maxIterations) {
        var objectsDone = [];
        var typesDone = [];
        var classes = {
        };
        maxIterations = maxIterations || defaults.maxIterations;
        function getAllProperties(obj) {
            var arr = [];
            for(var i in obj) {
                arr.push(i);
            }
            return arr;
        }
        function parseObject(obj, hierarchy, depth) {
            var props = getAllProperties(obj);
            props.forEach(function (prop) {
                if(prop in obj) {
                    try  {
                        var val = obj[prop];
                        if(typeof val === 'object') {
                            if(val) {
                                var doneIndex = objectsDone.indexOf(val);
                                if(doneIndex === -1) {
                                    var ti = null;
                                    objectsDone.push(val);
                                    if(Array.isArray(val)) {
                                        if(val.length > 0) {
                                            ti = new ArrayInfo(typeof val[0], prop, val);
                                            hierarchy[prop] = ti;
                                        } else {
                                            ti = new ArrayInfo('any', prop);
                                            hierarchy[prop] = ti;
                                        }
                                        typesDone.push(ti);
                                    } else {
                                        if(val.constructor && val.constructor.name !== 'Object') {
                                            ti = new ClassInfo(val.constructor, val.constructor.name);
                                            if(!classes[val.constructor.toString()]) {
                                                classes[val.constructor.toString()] = ti;
                                            }
                                        } else {
                                            ti = new TypeInfo('any', prop, val);
                                        }
                                        typesDone.push(ti);
                                        hierarchy[prop] = ti;
                                        if(depth < maxIterations) {
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
                                hierarchy[prop] = new TypeInfo('any', prop);
                            }
                        } else {
                            if(typeof val === 'function') {
                                var fInfo = new FunctionInfo(val);
                                fInfo.name = fInfo.name || prop;
                                hierarchy[prop] = fInfo;
                            } else {
                                if(typeof val === 'boolean') {
                                    hierarchy[prop] = new TypeInfo('bool', prop, val);
                                } else {
                                    hierarchy[prop] = new TypeInfo(typeof val, prop, val);
                                }
                            }
                        }
                    } catch (ex) {
                        console.log(ex);
                    }
                }
            });
        }
        function toTypeScriptDefinition(obj, depth, format, name) {
            if(obj) {
                var props = Object.getOwnPropertyNames(obj);
                var indent = '  ';
                var str = '';
                if(format === 'module') {
                    for(var i = 0; i < depth; i++) {
                        str += indent;
                    }
                    str += 'module ' + name + ' {\n';
                }
                props.forEach(function (prop) {
                    var infoType = obj[prop].constructor.name;
                    var isClass = obj[prop] instanceof ClassInfo;
                    for(var i = 0; i <= depth; i++) {
                        str += indent;
                    }
                    if(format === 'module') {
                        if(infoType === 'FunctionInfo') {
                            str += 'export function ';
                            str += prop + obj[prop].toTypeString() + ' { }\n';
                        } else {
                            str += 'export var ';
                            str += prop + ': ' + obj[prop].toTypeString() + ';' + (obj[prop].value ? '\t// ' + obj[prop].value.toString() + '\n' : '\n');
                        }
                    } else {
                        if(format === 'class') {
                            if(infoType === 'FunctionInfo') {
                                str += prop + obj[prop].toTypeString() + ' { }\n';
                            } else {
                                str += prop + ': ' + obj[prop].toTypeString() + ';' + (obj[prop].value ? '\t// ' + obj[prop].value.toString() + '\n' : '\n');
                            }
                        }
                    }
                    if(obj[prop].attributes && !isClass) {
                        str += toTypeScriptDefinition(obj[prop].attributes, depth + 1, isClass ? 'class' : 'module', isClass ? obj[prop].type : prop);
                    }
                });
                if(format === 'module') {
                    for(var i = 0; i < depth; i++) {
                        str += indent;
                    }
                    str += '}\n';
                }
                return str;
            }
            return '';
        }
        if(obj) {
            var hier = {
            };
            parseObject(obj, hier, 0);
            var str = toTypeScriptDefinition(hier, 0, 'module', 'MyModule');
            for(var c in classes) {
                var cl = classes[c];
                str += 'class ' + cl.type + ' {\n';
                str += '  constructor' + cl.toConstructorString() + ' { }\n';
                if(cl.attributes) {
                    str += toTypeScriptDefinition(cl.attributes, 0, 'class', '');
                }
                str += '}\n';
            }
            return str;
        }
        return null;
    }
    TypeScriptUtil.toTypeScript = toTypeScript;
})(TypeScriptUtil || (TypeScriptUtil = {}));