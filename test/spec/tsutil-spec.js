var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
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
            propFunction: function customFunctionName(input1, input2) {
                return null;
            },
            propNull: null
        };
        var output = TypeScriptUtil.toTypeScript(primitives, 'Primitives');
        it('Should correctly handle strings', function () {
            expect(output).toContain('propString: string');
        });
        it('Should correctly handle numbers', function () {
            expect(output).toContain('propNumber: number');
        });
        it('Should correctly handle booleans', function () {
            expect(output).toContain('propBoolean: bool');
        });
        it('Should correctly handle functions', function () {
            expect(output).toContain('propFunction(input1: any, input2: any): any');
        });
        it('Should correctly handle nulls', function () {
            expect(output).toContain('propNull: any');
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
            expect(output).toContain('rootProperty: string');
            expect(output).toContain('level1Property: string');
            expect(output).toContain('level2Property: string');
            expect(output).not.toContain('level3Property: string');
        });
        it('Should traverse the entire object', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root', 0);
            console.log(output);
            expect(output).toContain('level5Property: string');
        });
        it('Should traverse 1 level deep', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root', 1);
            expect(output).toContain('rootProperty: string');
            expect(output).not.toContain('level1Property: string');
        });
        it('Should traverse 2 levels deep', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root', 2);
            expect(output).toContain('rootProperty: string');
            expect(output).toContain('level1Property: string');
            expect(output).not.toContain('level2Property: string');
        });
        it('Should traverse 3 levels deep', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root', 3);
            expect(output).toContain('rootProperty: string');
            expect(output).toContain('level1Property: string');
            expect(output).toContain('level2Property: string');
            expect(output).not.toContain('level3Property: string');
        });
        it('Should traverse 4 levels deep', function () {
            var output = TypeScriptUtil.toTypeScript(root, 'Root', 4);
            expect(output).toContain('rootProperty: string');
            expect(output).toContain('level1Property: string');
            expect(output).toContain('level2Property: string');
            expect(output).toContain('level3Property: string');
            expect(output).not.toContain('level4Property: string');
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
            expect(output).toContain('parentProperty: number');
            expect(output).toContain('child: any');
            expect(output).toContain('childProperty: string');
            expect(output).toContain('parent: any');
        });
    });
    describe('Inheritence', function () {
        var stuff = {
            randomProperty: 'Something',
            car: new TestClasses.Car('My car'),
            boat: new TestClasses.Boat('My boat')
        };
        var output = TypeScriptUtil.toTypeScript(stuff, 'Stuff', 0);
        console.log(output);
        it('Should list classes', function () {
            expect(output).toContain('class Car');
            expect(output).toContain('class Boat');
        });
        it('Should have class Vehicle', function () {
            expect(output).toContain('class Vehicle');
        });
        it('Vehicle should have the method "move"', function () {
            expect(output).toContain('move(): void { }');
        });
        it('car should be of type Car', function () {
            expect(output).toContain('car: Car');
        });
        it('boat should be of type Boat', function () {
            expect(output).toContain('boat: Boat');
        });
        it('Car should extend Vehicle', function () {
            expect(output).toContain('class Car extends Vehicle');
        });
        it('Boat should extend Vehicle', function () {
            expect(output).toContain('class Boat extends Vehicle');
        });
    });
});
