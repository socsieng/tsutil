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
            return this.instanceOf ? this.instanceOf.type : this.type;
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
    var ObjectInspector = (function () {
        function ObjectInspector(obj, maxDepth) {
            this.obj = obj;
            this.maxDepth = typeof maxDepth === 'undefined' ? ObjectInspector.DEFAULT_MAX_DEPTH : maxDepth;
            this.allInstances = [];
            this.allTypes = [];
            this.allClasses = [];
            this.processedInstances = [];
            this.itemIndex = 0;
            this.structure = {
            };
            this.structure = [];
        }
        ObjectInspector.DEFAULT_MAX_DEPTH = 3;
        ObjectInspector.prototype.getAllProperties = function (obj) {
            var self = this;
            if(obj && typeof obj === 'object') {
                var props = Object.getOwnPropertyNames(obj);
                return props.filter(function (item) {
                    return !self.isIgnoredProperty(item);
                });
            }
            return [];
        };
        ObjectInspector.prototype.getItemId = function () {
            return 'i' + (++this.itemIndex);
        };
        ObjectInspector.prototype.getTypeString = function (value, isArray) {
            if(value) {
                var type = typeof value;
                switch(type) {
                    case 'object': {
                        if(Array.isArray(value)) {
                            return 'any[]';
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
        };
        ObjectInspector.prototype.isIgnoredProperty = function (prop) {
            var ignored = [
                'constructor'
            ];
            return ignored.indexOf(prop) !== -1;
        };
        ObjectInspector.prototype.isIgnoredValue = function (obj) {
            var ignored = [
                Object, 
                String, 
                Number, 
                Boolean, 
                Function, 
                Array, 
                Window, 
                window
            ];
            return ignored.indexOf(obj) !== -1;
        };
        ObjectInspector.prototype.extractInstances = function (obj, depth) {
            var self = this;
            if(!self.isIgnoredValue(obj) && self.allInstances.indexOf(obj) === -1) {
                self.allInstances.push(obj);
                if(obj) {
                    if(depth < self.maxDepth || self.maxDepth === 0) {
                        var props = self.getAllProperties(obj);
                        props.forEach(function (prop) {
                            var val = obj[prop];
                            self.extractInstances(val, depth + 1);
                        });
                    }
                    var instanceOf = self.getConstructor(obj);
                    if(instanceOf) {
                        if(self.allClasses.indexOf(instanceOf) === -1) {
                            self.allClasses.push(instanceOf);
                        }
                        self.extractInstances(instanceOf, 0);
                    }
                    if(obj.__proto__ && obj.__proto__.constructor !== Object && !self.isIgnoredValue(obj.__proto__.constructor)) {
                        self.extractInstances(obj.__proto__, 0);
                    }
                }
            }
        };
        ObjectInspector.prototype.constructTypeInfo = function (obj) {
            if(obj) {
                var type = this.getTypeString(obj);
                switch(type) {
                    case 'any[]': {
                        if(obj.length == 0) {
                            return new ArrayInfo('any', null, obj);
                        }
                        return new ArrayInfo(this.getTypeString(obj[0]), null, obj);

                    }
                    case 'object': {
                        return new TypeInfo('any', null, obj);

                    }
                    case 'Function': {
                        if(this.allClasses.indexOf(obj) !== -1) {
                            return new ClassInfo(obj, obj.name);
                        }
                        return new FunctionInfo(obj, null);

                    }
                    default: {
                        return new TypeInfo(type, null, obj);

                    }
                }
            }
            return new TypeInfo('any', null, obj);
        };
        ObjectInspector.prototype.getTypeInfo = function (obj) {
            var index = this.allInstances.indexOf(obj);
            if(index != -1) {
                return this.allTypes[index];
            }
            throw new Error('object couldn\'t be found for type: ' + typeof (obj));
        };
        ObjectInspector.prototype.inspectInternal = function (obj, depth, infoContainer) {
            var self = this;
            if(!self.isIgnoredValue(obj) && self.processedInstances.indexOf(obj) === -1) {
                self.processedInstances.push(obj);
                if(obj) {
                    if(depth < self.maxDepth || self.maxDepth === 0) {
                        var props = self.getAllProperties(obj);
                        props.forEach(function (prop) {
                            var val = obj[prop];
                            var typeInfo = self.getTypeInfo(val);
                            var ctor = self.getConstructor(val);
                            if(ctor) {
                                typeInfo.instanceOf = self.getTypeInfo(ctor);
                                typeInfo = typeInfo.instanceOf;
                            }
                            infoContainer[prop] = typeInfo;
                            if(val && self.getAllProperties(val).length) {
                                typeInfo.attributes = typeInfo.attributes || {
                                };
                                self.inspectInternal(val, depth + 1, typeInfo.attributes);
                            }
                        });
                    }
                    var objTypeInfo = self.getTypeInfo(obj);
                    var ctor = self.getConstructor(obj);
                    if(ctor) {
                        var ctorTypeInfo = self.getTypeInfo(ctor);
                        ctorTypeInfo.isConstructor = true;
                        objTypeInfo.instanceOf = self.getTypeInfo(ctor);
                        var baseCtor = self.getConstructor(obj.__proto__);
                        var base = obj.__proto__;
                        if(baseCtor === ctor) {
                            baseCtor = self.getConstructor(obj.__proto__.__proto__);
                            base = obj.__proto__.__proto__;
                        }
                        if(baseCtor) {
                            var baseTypeInfo = ctorTypeInfo.instanceOf = self.getTypeInfo(baseCtor);
                            if(base && self.getAllProperties(base).length) {
                                baseTypeInfo.attributes = baseTypeInfo.attributes || {
                                };
                                self.inspectInternal(base, depth + 1, baseTypeInfo.attributes);
                            }
                        }
                    }
                }
            }
        };
        ObjectInspector.prototype.getConstructor = function (obj) {
            if(obj && obj.constructor !== Object && !this.isIgnoredValue(obj.constructor)) {
                return obj.constructor;
            }
            return null;
        };
        ObjectInspector.prototype.inspect = function () {
            var self = this;
            self.extractInstances(this.obj, 0);
            self.allTypes = self.allInstances.map(function (item) {
                return self.constructTypeInfo(item);
            });
            var structure = this.structure = {
            };
            self.inspectInternal(self.obj, 0, structure);
            var classes = this.classes = self.allClasses.map(function (item) {
                return self.getTypeInfo(item);
            });
            return {
                structure: structure,
                classes: classes
            };
        };
        return ObjectInspector;
    })();    
    var ObjectInspectorFormatter = (function () {
        function ObjectInspectorFormatter(inspector, indent) {
            this.inspector = inspector;
            this.indent = indent || '  ';
        }
        ObjectInspectorFormatter.prototype.format = function (rootName) {
            throw new Error('format method not implemented');
        };
        ObjectInspectorFormatter.prototype.formatString = function (format, params) {
            var args = Array.prototype.slice.call(arguments, 1);
            var result = format;
            if(args) {
                args.forEach(function (arg, index) {
                    var exp = new RegExp('\\{' + index + ':?([^\\}]*)\\}', 'g');
                    result = result.replace(exp, arg);
                });
            }
            return result;
        };
        ObjectInspectorFormatter.prototype.getIndent = function (level) {
            var str = '';
            for(var i = 0; i < level; i++) {
                str += this.indent;
            }
            return str;
        };
        return ObjectInspectorFormatter;
    })();    
    var TypeScriptFormatter = (function (_super) {
        __extends(TypeScriptFormatter, _super);
        function TypeScriptFormatter(inspector, indent) {
                _super.call(this, inspector, indent);
        }
        TypeScriptFormatter.prototype.format = function (rootName) {
            var str = this.formatClasses();
            str += this.formatModule(rootName, this.inspector.structure, 0);
            return str;
        };
        TypeScriptFormatter.prototype.formatClasses = function () {
            var self = this;
            var str = '';
            self.inspector.classes.forEach(function (cl) {
                str += self.formatString('class {0}', cl.name);
                if(cl.instanceOf) {
                    str += self.formatString(' extends {0}', cl.instanceOf.name);
                }
                str += ' {\n';
                str += self.formatString('{0}constructor {1} { }\n', self.indent, cl.toConstructorString());
                if(cl.attributes) {
                    str += self.formatClassMembers(cl.attributes);
                }
                str += '}\n';
            });
            return str;
        };
        TypeScriptFormatter.prototype.formatModule = function (name, attributes, depth) {
            var self = this;
            var str = '';
            str += self.formatString('{0}module {1} {\n', self.getIndent(depth), name);
            if(attributes) {
                str += self.formatModuleMembers(attributes, depth);
            }
            str += self.getIndent(depth);
            str += '}\n';
            return str;
        };
        TypeScriptFormatter.prototype.formatModuleMembers = function (obj, depth) {
            var self = this;
            var props = Object.getOwnPropertyNames(obj);
            var str = '';
            props.forEach(function (prop) {
                if(obj[prop]) {
                    var infoType = obj[prop].constructor.name;
                    if(infoType === 'FunctionInfo') {
                        str += self.formatString('{0}export function{1}{2} { }\n', self.getIndent(depth + 1), prop, obj[prop].toTypeString());
                    } else {
                        str += self.formatString('{0}export var {1}: {2};\n', self.getIndent(depth + 1), prop, obj[prop].toTypeString());
                    }
                    if(obj[prop].attributes && !obj[prop].instanceOf) {
                        str += self.formatModule(prop, obj[prop].attributes, depth + 1);
                    }
                }
            });
            return str;
        };
        TypeScriptFormatter.prototype.formatClassMembers = function (obj) {
            var self = this;
            var props = Object.getOwnPropertyNames(obj);
            var str = '';
            props.forEach(function (prop) {
                if(obj[prop]) {
                    var infoType = obj[prop].constructor.name;
                    if(infoType === 'FunctionInfo') {
                        str += self.formatString('{0}{1}{2} { }\n', self.indent, prop, obj[prop].toTypeString());
                    } else {
                        str += self.formatString('{0}{1}: {2};\n', self.indent, prop, obj[prop].toTypeString());
                    }
                    if(obj[prop].attributes && !obj[prop].instanceOf) {
                    }
                }
            });
            return str;
        };
        return TypeScriptFormatter;
    })(ObjectInspectorFormatter);    
    function toTypeScript(obj, name, maxIterations) {
        var str = '';
        var insp = new ObjectInspector(obj, maxIterations);
        var hier = insp.inspect();
        var formatter = new TypeScriptFormatter(insp);
        if(hier) {
            str += formatter.format(name);
        }
        return str;
    }
    TypeScriptUtil.toTypeScript = toTypeScript;
})(TypeScriptUtil || (TypeScriptUtil = {}));
