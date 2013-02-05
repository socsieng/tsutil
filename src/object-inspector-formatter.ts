module TypeScriptUtil {
    export class ObjectInspectorFormatter {
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

        isValidPropertyName(name: string): bool {
            var exp = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
            return exp.test(name);
        }

        isConstantPropertyName(name: string): bool {
            var exp = /^[A-Z$][A-Z_$0-9]*$/;
            return exp.test(name);
        }

        getLiteralValue(value: any): string {
            var type = typeof value;
            switch (type) {
                case 'string':
                    return '\'' + value.replace(/[\\\r\n\t']/g, function (s) {
                        switch (s) {
                            case '\\': return '\\\\';
                            case '\r': return '\\r';
                            case '\n': return '\\n';
                            case '\t': return '\\t';
                            case '\'': return '\\\'';
                        }
                        return '';
                    }) + '\'';
                case 'object':
                    if (value === null) {
                        return 'null';
                    }
                    if (value instanceof Date) {
                        return this.formatString('new Date({0})', value.valueOf());
                    }
                    return null;
                case 'number':
                case 'boolean':
                    return value.toString();
            }
            return null;
        }

        getIndent(level: number): string {
            var str = '';
            for (var i = 0; i < level; i++) { str += this.indent }
            return str;
        }
    }
}