/// <reference path="../lib/node.d.ts" />
/// <reference path="javascript-info.ts" />
/// <reference path="object-inspector.ts" />
/// <reference path="object-inspector-formatter.ts" />

module TypeScriptUtil {
    export class TypeScriptFormatter extends ObjectInspectorFormatter {
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
                str += self.formatString('class {0}', cl.type);
                if (cl.inherits) {
                    str += self.formatString(' extends {0}', cl.inherits.type);
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

        private formatClassMembers(obj: any) {
            var self = this;
            var props = Object.getOwnPropertyNames(obj);
            var str = '';

            props.forEach(function (prop) {
                if (obj[prop]) {
                    var infoType = obj[prop].constructor.name;

                    if (obj[prop] instanceof FunctionInfo) {
                        str += self.formatString('{0}{1}{2} { }\n', self.indent, prop, obj[prop].toTypeString());
                    } else {
                        str += self.formatString('{0}{1}: {2}', self.indent, prop, obj[prop].toTypeString());
                        if (self.isConstantPropertyName(prop)) {
                            var valueLiteral = self.getLiteralValue(obj[prop].value);
                            if (valueLiteral) {
                                str += self.formatString(' = {0}', valueLiteral);
                            }
                        }
                        str += ';\n';
                    }
                }
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
                    if (obj[prop] instanceof ClassInfo) {
                        // ignore class constructors in modules, assume that this will be represented as a class
                        //str += self.formatString('{0}export function {1}{2} { }\n', self.getIndent(depth + 1), prop, obj[prop].toConstructorString());
                    } else if (obj[prop] instanceof FunctionInfo) {
                        str += self.formatString('{0}export function {1}{2} { }\n', self.getIndent(depth + 1), prop, obj[prop].toTypeString());
                    } else if (obj[prop].attributes && !obj[prop].instanceOf && !(obj[prop] instanceof ClassInfo)) {
                        str += self.formatModule(prop, obj[prop].attributes, depth + 1);
                    } else {
                        str += self.formatString('{0}export var {1}: {2}', self.getIndent(depth + 1), prop, obj[prop].toTypeString());
                        if (self.isConstantPropertyName(prop)) {
                            var valueLiteral = self.getLiteralValue(obj[prop].value);
                            if (valueLiteral) {
                                str += self.formatString(' = {0}', valueLiteral);
                            }
                        }
                        str += ';\n';
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

if (typeof exports !== 'undefined') {
    exports.toTypeScript = TypeScriptUtil.toTypeScript;
}