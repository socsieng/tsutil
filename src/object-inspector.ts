/// <reference path="javascript-info.ts" />

module TypeScriptUtil {
    export class ObjectInspector {
        private static DEFAULT_MAX_DEPTH: number = 3;
        private obj: any;
        private maxDepth: number;
        private allInstances: any[];
        private allTypes: TypeInfo[];
        private allClasses: any[];
        private processedInstances: any[];
        structure: any;
        classes: ClassInfo[];
        private anonymousCount: number;

        constructor(obj: any, maxDepth?: number) {
            this.obj = obj;
            this.maxDepth = typeof maxDepth === 'undefined' ? ObjectInspector.DEFAULT_MAX_DEPTH : maxDepth;
            this.allInstances = [];
            this.allTypes = [];
            this.allClasses = [];
            this.processedInstances = [];
            this.structure = {};
            this.classes = [];
            this.anonymousCount = 0;
        }

        private getAllProperties(obj: any): string[] {
            var self = this;
            if (obj && typeof obj === 'object') {
                var props = Object.getOwnPropertyNames(obj);
                return props.filter(function (item) { return !self.isIgnoredProperty(item) });
            }
            return [];
        }

        private getTypeString(value: any, isArray?: bool): string {
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
            return 'any';
        }

        private isIgnoredProperty(prop: string): bool {
            var ignored: string[] = ['constructor'];
            return ignored.indexOf(prop) !== -1;
        }

        private isIgnoredValue(obj: any): bool {
            var ignored: any[] = [Object, String, Number, Boolean, Date, Function, Array];
            if (typeof Window !== 'undefined') {
                ignored.push(Window);
            }
            if (typeof window !== 'undefined') {
                ignored.push(window);
            }
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

                    // inheritance
                    var instanceOf = self.getConstructor(obj);
                    if (instanceOf) {
                        if (self.allClasses.indexOf(instanceOf) === -1) {
                            self.allClasses.push(instanceOf);
                        }
                        self.extractInstances(instanceOf, 0);
                    }
                    if (obj['__proto__'] && obj['__proto__'].constructor !== Object && !self.isIgnoredValue(obj['__proto__'].constructor)) {
                        self.extractInstances(obj['__proto__'], 0);
                    }
                }
            }
        }

        private constructTypeInfo(obj: any): TypeInfo {
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

                            typeInfo.type = typeInfo.type || prop;
                            infoContainer[prop] = typeInfo;

                            if (ctor) {
                                typeInfo.instanceOf = self.getTypeInfo(ctor);
                                typeInfo = typeInfo.instanceOf;
                            }

                            if (val && self.getAllProperties(val).length && !Array.isArray(val)) {
                                typeInfo.attributes = typeInfo.attributes || {};
                                self.inspectInternal(val, depth + 1, typeInfo.attributes);
                            }
                        });
                    }

                    // inheritance
                    var objTypeInfo = self.getTypeInfo(obj);
                    var ctor = self.getConstructor(obj);
                    if (ctor) {
                        // obj is an instance of a class
                        var ctorTypeInfo: FunctionInfo = <FunctionInfo>self.getTypeInfo(ctor);
                        ctorTypeInfo.isConstructor = true;
                        ctorTypeInfo.type = ctorTypeInfo.type || 'AnonymousType_' + (++self.anonymousCount);

                        objTypeInfo.instanceOf = self.getTypeInfo(ctor);

                        var baseCtor = self.getConstructor(obj['__proto__']);
                        var base = obj['__proto__'];

                        if (baseCtor === ctor) {
                            if (base && self.getAllProperties(base).length && !self.isIgnoredValue(base.constructor)) {
                                ctorTypeInfo.attributes = ctorTypeInfo.attributes || {};
                                self.inspectInternal(base, depth + 1, ctorTypeInfo.attributes);
                            }

                            baseCtor = self.getConstructor(obj['__proto__']['__proto__']);
                            base = obj['__proto__']['__proto__'];
                        }

                        if (baseCtor) {
                            var baseTypeInfo = (<ClassInfo>ctorTypeInfo).inherits = <ClassInfo>self.getTypeInfo(baseCtor);

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
}