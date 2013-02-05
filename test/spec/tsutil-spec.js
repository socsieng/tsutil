var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var isNode = typeof require === 'function';
if(isNode) {
    if(typeof TypeScriptUtil === 'undefined') {
        TypeScriptUtil = require('../../src/tsutil');
    }
    if(typeof expect === 'undefined') {
        expect = require('expect.js');
    }
}
var TestClasses;
(function (TestClasses) {
    var Vehicle = (function () {
        function Vehicle(name) {
            this.name = name;
        }
        Vehicle.prototype.move = function () {
        };
        return Vehicle;
    })();
    TestClasses.Vehicle = Vehicle;    
    var Car = (function (_super) {
        __extends(Car, _super);
        function Car(name) {
                _super.call(this, name);
        }
        Car.prototype.reverse = function () {
        };
        return Car;
    })(Vehicle);
    TestClasses.Car = Car;    
    var Boat = (function (_super) {
        __extends(Boat, _super);
        function Boat(name) {
                _super.call(this, name);
        }
        return Boat;
    })(Vehicle);
    TestClasses.Boat = Boat;    
})(TestClasses || (TestClasses = {}));
describe('TypeScriptUtil toTypeScript function', function () {
    describe('Primitives', function () {
        var primitives = {
            propString: 'string value',
            propNumber: 12,
            propBoolean: true,
            propDate: new Date(),
            propFunction: function customFunctionName(input1, input2) {
                return null;
            },
            propVoidFunction: function customVoidFunctionName(input1, input2) {
            },
            propNull: null
        };
        var output = TypeScriptUtil.toTypeScript(primitives, 'Primitives');
        it('Should correctly handle strings', function () {
            expect(output).to.contain('propString: string');
        });
        it('Should correctly handle numbers', function () {
            expect(output).to.contain('propNumber: number');
        });
        it('Should correctly handle booleans', function () {
            expect(output).to.contain('propBoolean: bool');
        });
        it('Should correctly handle dates', function () {
            expect(output).to.contain('propDate: Date');
        });
        it('Should correctly handle functions', function () {
            expect(output).to.contain('propFunction(input1: any, input2: any): any');
        });
        it('Should correctly handle functions with no return value', function () {
            expect(output).to.contain('propVoidFunction(input1: any, input2: any): void');
        });
        it('Should correctly handle nulls', function () {
            expect(output).to.contain('propNull: any');
        });
    });
    describe('Constants', function () {
        var constants = {
            CONST_STRING: 'string value',
            CONST_EMPTY_STRING: '',
            CONST_SPECIAL_STRING: 'line1\nline2\r\nline3\nand this one\'s backslash \\nothing here',
            CONST_NUMBER: 12,
            CONST_BOOLEAN: true,
            CONST_DATE: new Date(),
            CONST_NULL: null
        };
        var output = TypeScriptUtil.toTypeScript(constants, 'Constants');
        it('Should correctly handle normal string constants', function () {
            expect(output).to.contain('CONST_STRING: string = \'string value\';');
        });
        it('Should correctly handle empty string constants', function () {
            expect(output).to.contain('CONST_EMPTY_STRING: string = \'\';');
        });
        it('Should correctly handle special string constants', function () {
            expect(output).to.contain('CONST_SPECIAL_STRING: string = \'line1\\nline2\\r\\nline3\\nand this one\\\'s backslash \\\\nothing here\';');
        });
        it('Should correctly handle numeric constants', function () {
            expect(output).to.contain('CONST_NUMBER: number = 12;');
        });
        it('Should correctly handle boolean constants', function () {
            expect(output).to.contain('CONST_BOOLEAN: bool = true;');
        });
        it('Should correctly handle date constants', function () {
            expect(output).to.contain('CONST_DATE: Date = new Date(' + constants.CONST_DATE.valueOf() + ');');
        });
        it('Should correctly handle null constants', function () {
            expect(output).to.contain('CONST_NULL: any = null;');
        });
    });
    describe('Arrays', function () {
        var arrays = {
            propString: [
                'a', 
                'b', 
                'c'
            ],
            propNumber: [
                1, 
                2, 
                3
            ],
            propBoolean: [
                true, 
                false, 
                true
            ],
            propDate: [
                new Date()
            ],
            propObject: [
                {
                }
            ],
            propFunction: [
                function () {
                }            ],
            propEmpty: []
        };
        var output = TypeScriptUtil.toTypeScript(arrays, 'Arrays');
        it('Should correctly handle string arrays', function () {
            expect(output).to.contain('propString: string[]');
            expect(output).not.to.contain('module propString');
        });
        it('Should correctly handle number arrays', function () {
            expect(output).to.contain('propNumber: number[]');
        });
        it('Should correctly handle boolean arrays', function () {
            expect(output).to.contain('propBoolean: bool[]');
        });
        it('Should correctly handle object arrays', function () {
            expect(output).to.contain('propObject: any[]');
        });
        it('Should correctly handle date arrays', function () {
            expect(output).to.contain('propDate: Date[]');
        });
        it('Should correctly handle function arrays', function () {
            expect(output).to.contain('propFunction: Function[]');
        });
        it('Should correctly handle empty arrays', function () {
            expect(output).to.contain('propEmpty: any[]');
        });
    });
    describe('Nested objects', function () {
        var root = {
            rootProperty: 'value',
            level1Object: {
                level1Property: 'value',
                level2Object: {
                    level2Property: 'value',
                    level3Object: {
                        level3Property: 'value',
                        level4Object: {
                            level4Property: 'value',
                            level5Object: {
                                level5Property: 'value'
                            }
                        }
                    }
                }
            }
        };
        it('Should traverse the default depth of the object (3)', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root');
            expect(output).to.contain('rootProperty: string');
            expect(output).to.contain('level1Property: string');
            expect(output).to.contain('level2Property: string');
            expect(output).not.to.contain('level3Property: string');
        });
        it('Should traverse the entire object', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root', 0);
            expect(output).to.contain('level5Property: string');
        });
        it('Should traverse 1 level deep', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root', 1);
            expect(output).to.contain('rootProperty: string');
            expect(output).not.to.contain('level1Property: string');
        });
        it('Should traverse 2 levels deep', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root', 2);
            expect(output).to.contain('rootProperty: string');
            expect(output).to.contain('level1Property: string');
            expect(output).not.to.contain('level2Property: string');
        });
        it('Should traverse 3 levels deep', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root', 3);
            expect(output).to.contain('rootProperty: string');
            expect(output).to.contain('level1Property: string');
            expect(output).to.contain('level2Property: string');
            expect(output).not.to.contain('level3Property: string');
        });
        it('Should traverse 4 levels deep', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root', 4);
            expect(output).to.contain('rootProperty: string');
            expect(output).to.contain('level1Property: string');
            expect(output).to.contain('level2Property: string');
            expect(output).to.contain('level3Property: string');
            expect(output).not.to.contain('level4Property: string');
        });
    });
    describe('Circular references', function () {
        var parent = {
            parentProperty: 123,
            child: null
        };
        var child = {
            childProperty: 'abc',
            parent: parent
        };
        parent.child = child;
        it('Should correctly handle circular references', function () {
            var output = TypeScriptUtil.toTypeScript(parent, 'Parent');
            expect(output).to.contain('parentProperty: number');
            expect(output).to.contain('module child');
            expect(output).to.contain('childProperty: string');
            expect(output).to.contain('module parent');
        });
    });
    describe('Inheritence', function () {
        var stuff = {
            randomProperty: 'Something',
            car: new TestClasses.Car('My car'),
            boat: new TestClasses.Boat('My boat')
        };
        var output = TypeScriptUtil.toTypeScript(stuff, 'Stuff', 0);
        it('Should list classes', function () {
            expect(output).to.contain('class Car');
            expect(output).not.to.contain('module car');
            expect(output).to.contain('class Boat');
            expect(output).not.to.contain('module boat');
        });
        it('Should have class Vehicle', function () {
            expect(output).to.contain('class Vehicle');
        });
        it('Vehicle should have the method "move"', function () {
            expect(output).to.contain('move(): void { }');
        });
        it('car should be of type Car', function () {
            expect(output).to.contain('car: Car');
        });
        it('Car should have a reverse method', function () {
            expect(output).to.contain('reverse(): void { }');
        });
        it('boat should be of type Boat', function () {
            expect(output).to.contain('boat: Boat');
        });
        it('Car should extend Vehicle', function () {
            expect(output).to.contain('class Car extends Vehicle');
        });
        it('Boat should extend Vehicle', function () {
            expect(output).to.contain('class Boat extends Vehicle');
        });
    });
    describe('Anonymous Classes', function () {
        var anonClass = function (prop) {
            this.prop = prop;
        };
        var oldSchool = {
            OldSchoolClass: function (name) {
                this.name = name;
            },
            oldSchoolInstance: null,
            anotherInstance: null,
            anonInstance: new anonClass('anon')
        };
        oldSchool.OldSchoolClass.prototype.randomFunction = function (params) {
        };
        oldSchool.oldSchoolInstance = new oldSchool.OldSchoolClass('instance');
        oldSchool.anotherInstance = new oldSchool.OldSchoolClass('other');
        var output = TypeScriptUtil.toTypeScript(oldSchool, 'OldSchool', 0);
        if(isNode) {
            it('SKIPPED: Should resolve class name, not very compatible with NodeJS', function () {
            });
            it('SKIPPED: Should have instance of the class, not very compatible with NodeJS', function () {
            });
            it('SKIPPED: Should have an instance of anonymous class, not very compatible with NodeJS', function () {
            });
        } else {
            it('Should resolve class name', function () {
                expect(output).to.contain('class OldSchoolClass');
            });
            it('Should have instance of the class', function () {
                expect(output).to.contain('oldSchoolInstance: OldSchoolClass');
                expect(output).to.contain('anotherInstance: OldSchoolClass');
            });
            it('Should have an instance of anonymous class', function () {
                expect(output).to.contain('anonInstance: AnonymousType_1');
            });
        }
        it('OldSchoolClass should have method randomFunction', function () {
            expect(output).to.contain('randomFunction(params: any): void { }');
        });
        it('Should not contain an OldSchoolClass module', function () {
            expect(output).not.to.contain('module OldSchoolClass');
        });
        it('Should have anonymous class', function () {
            expect(output).to.contain('class AnonymousType_1');
        });
    });
});
//@ sourceMappingURL=tsutil-spec.js.map
