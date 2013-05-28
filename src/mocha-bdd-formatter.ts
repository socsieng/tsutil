/// <reference path="../lib/node.d.ts" />
/// <reference path="javascript-info.ts" />
/// <reference path="object-inspector.ts" />
/// <reference path="object-inspector-formatter.ts" />

module TypeScriptUtil {
    export class MochaBddFormatter extends ObjectInspectorFormatter {
        constructor(inspector: ObjectInspector, indent?: string) {
            super(inspector, indent);
        }

        format(rootName: string): string {
            var str = this.formatClasses();
            str += this.formatModule(rootName, this.inspector.structure, 0, '');
            return str;
        }

        private formatClasses(): string {
            var self = this;
            var str = '';

            self.inspector.classes.forEach(function (cl) {
                str += self.formatString('describe("{0}", function() {\n', self.encodeString(cl.type));
                if (cl.inherits) {
                    str += self.formatString('\n// extends {0}', cl.inherits.type);
                }

                str += self.formatString('{0}it.skip("Should instantiate {1}{2}", function() { });\n', self.indent, self.encodeString(cl.type), cl.toConstructorString());
                if (cl.attributes) {
                    str += self.formatClassMembers(cl.attributes);
                }

                str += '});\n';
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
                        str += self.formatString('{0}describe("{1}", function() {\n', self.getIndent(1), self.encodeString(prop));
                        str += self.formatString('{0}it.skip("Should invoke {1}", function(done) { });\n', self.getIndent(2), self.encodeString(prop));
                        str += self.formatString('{0}});\n', self.getIndent(1));
                    }
                }
            });

            return str;
        }

        private encodeString(str: string): string {
            return str.replace(/'/g, '\'').replace(/"/g, '"');
        }

        private formatModule(name: string, attributes: any, depth: number, ancestors: string): string {
            var self = this;
            var str = '';

            str += self.formatString('{0}describe("{1}", function() {\n', self.getIndent(depth), self.encodeString(ancestors ? ancestors : name));

            if (attributes) {
                str += self.formatModuleMembers(attributes, depth, ancestors ? ancestors : name);
            }

            str += self.getIndent(depth);
            str += '});\n';

            return str;
        }

        private formatModuleMembers(obj: any, depth: number, ancestors: string) {
            var self = this;
            var props = Object.getOwnPropertyNames(obj);
            var str = '';

            props.forEach(function (prop) {
                if (obj[prop]) {
                    if (obj[prop] instanceof ClassInfo) {
                        // ignore class constructors in modules, assume that this will be represented as a class
                        //str += self.formatString('{0}export function {1}{2} { }\n', self.getIndent(depth + 1), prop, obj[prop].toConstructorString());
                    } else if (obj[prop] instanceof FunctionInfo) {
                        str += self.formatString('{0}describe("{1}", function() {\n', self.getIndent(depth + 1), self.encodeString(ancestors + '.' + prop));
                        str += self.formatString('{0}it.skip("Should invoke {1}", function(done) { });\n', self.getIndent(depth + 2), self.encodeString(ancestors + '.' + prop));
                        str += self.formatString('{0}});\n', self.getIndent(depth + 1));
                    } else if (obj[prop].attributes && !obj[prop].instanceOf && !(obj[prop] instanceof ClassInfo)) {
                        str += self.formatModule(prop, obj[prop].attributes, depth + 1, ancestors + '.' + prop);
                    }

                }
            });

            return str;
        }
    }

    export function toMochaBdd(obj: any, name: string, maxIterations?: number): string {
        var str = '';
        var insp = new ObjectInspector(obj, maxIterations);
        var hier = insp.inspect();
        var formatter = new MochaBddFormatter(insp, '    ');
        if (hier) {
            str += formatter.format(name);
        }
        return str;
    }
}

if (typeof exports !== 'undefined') {
    exports.toMochaBdd = TypeScriptUtil.toMochaBdd;
}