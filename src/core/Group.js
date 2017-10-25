/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2015
 */

define(function (require, exports, module) {
  var Context = require('./Context');
  var Transform = require('./Transform');
  var Surface = require('./Surface');

  /**
   * A Context designed to contain surfaces and set properties
   *   to be applied to all of them at once.
   *   This is primarily used for specific performance improvements in the rendering engine.
   *   Private.
   *
   * @private
   * @class Group
   * @extends Surface
   * @constructor
   * @param {Object} [options] Surface options array (see Surface})
   */
  function Group(options) {
    Surface.call(this, options);
    this._shouldRecalculateSize = false;
    this.context = new Context();
    this._groupSize = [undefined, undefined];
    this._surfaceSize = options ? (options.size || Group.SIZE_ZERO) : Group.SIZE_ZERO;
  }

  /** @const */
  Group.SIZE_ZERO = [0, 0];

  Group.prototype = Object.create(Surface.prototype);
  Group.prototype.elementType = 'div';
  Group.prototype.elementClass = 'famous-group';

  /**
   * Add renderables to this component's render tree.
   *
   * @method add
   * @private
   * @param {Object} obj renderable object
   * @return {RenderNode} Render wrapping provided object, if not already a RenderNode
   */
  Group.prototype.add = function add() {
    return this.context.add.apply(this.context, arguments);
  };

  /**
   * Generate a render spec from the contents of this component.
   *
   * @private
   * @method render
   * @return {Number} Render spec for this component
   */
  Group.prototype.render = function render() {
    return Surface.prototype.render.call(this);
  };



  Group.prototype.allocate = function allocate(allocator) {
    this._allocator = allocator.allocate({ type: this.elementType, isNested: true });
    return this._allocator.container;
  };

  /**
   * Place the document element this component manages into the document.
   *
   * @private
   * @method deploy
   * @param {Node} target document parent of this container
   */
  Group.prototype.deploy = function deploy(target) {
    //Do nothing
  };

  /**
   * Remove this component and contained content from the document
   *
   * @private
   * @method recall
   *
   * @param {Node} target node to which the component was deployed
   */
  Group.prototype.recall = function recall(target) {
    /*
     * Previous recalling heuristic was this:
     * this._container = document.createDocumentFragment();
     * this.context.migrate(this._container);
     * However this was abandoned because when the same surfaces were initialized within a different context,
     * they didn't know they needed to be setup again, because their elements still existed. Instead, the
     * current solution keeps the elements in the DOM in a nested manner in case they would be needed again.
     *
     * */
  };


  Group.prototype.deallocate = function deallocate(parentAllocator) {
    this.context.cleanup(this._allocator);
    return parentAllocator.deallocateAllocator(this._allocator);
  };


  /**
   * Apply changes from this component to the corresponding document element.
   *
   * @private
   * @method commit
   *
   * @param {Object} context update spec passed in from above in the render tree.
   */
  Group.prototype.commit = function commit(context) {
    var transform = context.transform;
    var origin = context.origin;
    var opacity = context.opacity;
    var size = context.size;
    var result = Surface.prototype.commit.call(this, {
      allocator: context.allocator,
      transform: Transform.thenMove(transform, [-origin[0] * size[0], -origin[1] * size[1], 0]),
      opacity: opacity,
      origin: origin,
      size: this._surfaceSize
    });
    if (size[0] !== this._groupSize[0] || size[1] !== this._groupSize[1]) {
      this._groupSize[0] = size[0];
      this._groupSize[1] = size[1];
      this.context.setSize(size);
    }
    /* Executes the commit functions of the children */
    this.context.update({
      allocator: this._allocator,
      transform: Transform.translate(-origin[0] * size[0], -origin[1] * size[1], 0),
      origin: origin,
      hide: context.opacity === 0 || context.hide,
      size: size
    });
    return result;
  };

  module.exports = Group;
});
