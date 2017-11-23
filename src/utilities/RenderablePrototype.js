/**
 * Created by lundfall on 16/02/2017.
 */

/**
 * Used internally as a return from with() statements that data bind the contents
 */
export class RenderablePrototype {
  _decoratorFunctions = [];

  constructor(type, options, children){
    this.type = type;
    this.options = options;
    this.children = children;
  }

  addDirectlyAppliedDecoratorFunction(decoratorFunction){
    this._decoratorFunctions.push(decoratorFunction);
  }

  getDirectlyAppliedDecoratorFunctions() {
    return this._decoratorFunctions;
  }

}
