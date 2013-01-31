/// <reference path="../lib/jasmine.d.ts" />
/// <reference path="../../src/tsutil.ts" />

describe('TypeScriptUtil toTypeScript function', function () {
    describe('Primitives', function () {
        var primitives = {
            propString: 'string value',
            propNumber: 12,
            propBoolean: true,
            propNull: null
        }

        var output = TypeScriptUtil.toTypeScript(primitives);
        it('Should correctly handle strings', function () {
            expect(output).toContain('propString: string');
        });

        it('Should correctly handle numbers', function () {
            expect(output).toContain('propNumber: number');
        });

        it('Should correctly handle booleans', function () {
            expect(output).toContain('propBoolean: bool');
        });

        it('Should correctly handle nulls', function () {
            expect(output).toContain('propNull: any');
        });
    });

    describe('Arrays', function () {
        var arrays = {
            propString: ['a', 'b', 'c'],
            propNumber: [1, 2, 3],
            propBoolean: [true, false, true],
            propObject: [{}],
            propFunction: [function () { }],
            propEmpty: []
        }

        var output = TypeScriptUtil.toTypeScript(arrays);
        it('Should correctly handle string arrays', function () {
            expect(output).toContain('propString: string[]');
        });

        it('Should correctly handle number arrays', function () {
            expect(output).toContain('propNumber: number[]');
        });

        it('Should correctly handle boolean arrays', function () {
            expect(output).toContain('propBoolean: bool[]');
        });

        it('Should correctly handle object arrays', function () {
            expect(output).toContain('propObject: any[]');
        });

        it('Should correctly handle function arrays', function () {
            expect(output).toContain('propFunction: Function[]');
        });

        it('Should correctly handle empty arrays', function () {
            expect(output).toContain('propEmpty: any[]');
        });
    });
});