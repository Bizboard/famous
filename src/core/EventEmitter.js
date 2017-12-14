/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2015
 */

define(function (require, exports, module) {

  /**
   * EventEmitter represents a channel for events.
   *
   * @class EventEmitter
   * @constructor
   */
  function EventEmitter() {
    this.listeners = {};
    this._owner = this;
  }

  /**
   * Trigger an event, sending to all downstream handlers
   *   listening for provided 'type' key.
   *
   * @method emit
   *
   * @param {string} type event type key (for example, 'click')
   * @param {Objects} event event data
   * @param {Objects}(opt) event event data
   * @param {Objects}(opt) event event data
   * @param {Objects}(opt) event event data
   * @return {EventHandler} this
   */
  EventEmitter.prototype.emit = function emit() {
    var type = arguments[0];
    var args = [];
    for (var i = 1; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    /* Shallow clone listeners in order to prevent modifications happening of the listeners due to once() wrappers */
    var handlers = Array.from(this.listeners[type] || []);
    var suppressedHandlers = this.determineSurpressedTouchMoveEvents(type, handlers, args[0]);
    if (handlers) {
      for (var i = 0; i < handlers.length; i++) {
        if (!suppressedHandlers[i]) {
          handlers[i].apply(this._owner, args);
        }
      }
    }
    return this;
  };


  EventEmitter.prototype.determineSurpressedTouchMoveEvents = function determineSurpressedTouchMoveEvents(eventType, handlers, event) {
    /* If the number of touches is more than 2, then we should not surpress any events */
    var numberOfHandlers = handlers ? handlers.length : 0;
    if (typeof window.TouchEvent === 'undefined' || numberOfHandlers < 2 || !(event instanceof window.TouchEvent) || event.touches.length > 1 || !['touchstart', 'touchmove', 'touchend'].includes(eventType)) {
      return new Array(numberOfHandlers).fill(false);
    }

    /* Plural of axis is axes */
    var axes = handlers.map(function (handler) {
      return handler._handlerOptions ? handler._handlerOptions.axis : undefined
    });
    var firstAxis = axes[0];
    /* If all the axes are the same */
    if (axes.every(function (axis) {
        return axis === firstAxis || axis === undefined;
      })) {
      return new Array(numberOfHandlers).fill(false);
    }
    var touch = event.touches[0];

    if (eventType === 'touchstart') {
      this._currentTouchMoveStartPosition = [touch.clientX, touch.clientY];
    }

    if (eventType === 'touchend') {
      this._currentTouchMoveDirection = undefined;
    }

    if (eventType !== 'touchmove') {
      return new Array(numberOfHandlers).fill(false);
    }


    /* event type is touchmove. Analyze the touches and see if some events need to be surpressed */

    var startPosition = this._currentTouchMoveStartPosition, currentMoveDirection = this._currentTouchMoveDirection;

    if (!startPosition && currentMoveDirection === undefined) {
      /* No information about start position, we can't ignore this one */
      return new Array(numberOfHandlers).fill(false);
    }
    if (currentMoveDirection === undefined) {
      var xDiff = startPosition[0] - touch.clientX, yDiff = startPosition[1] - touch.clientY;
      var absDiffs = [Math.abs(xDiff), Math.abs(yDiff)];
      this._currentTouchMoveDirection = currentMoveDirection = absDiffs.indexOf(Math.max.apply(null, absDiffs));
    }

    var surpressArray = new Array(numberOfHandlers);

    for (var i = 0; i < numberOfHandlers; i++) {
      surpressArray[i] = axes[i] !== undefined && axes[i] !== currentMoveDirection;
    }

    return surpressArray;
  };

  /**
   * Bind a callback function to an event type handled by this object.
   *
   * @method "on"
   *
   * @param {string} type event type key (for example, 'click')
   * @param {function(string, Object)} handler callback
   * @param [options]
   * @return {EventHandler} this
   */
  EventEmitter.prototype.on = function on(type, handler, options) {
    if (!(type in this.listeners)) this.listeners[type] = [];
    /* Adds the options to the handler itself, in order to be able to pass to the DOMEventHandler.js */
    options && (handler._handlerOptions = options);
    var index = this.listeners[type].indexOf(handler);
    if (index < 0) this.listeners[type].push(handler);
    return this;
  };

  /**
   * Listens once
   * @param type
   * @param handler
   * @param {Object} options
   * @param {Boolean} options.propagate Whether we should listen for bubbled events
   * @returns {Mocked Promise}
   */
  EventEmitter.prototype.once = function once(type, handler, options) {
    var resolvers = [], resolveValue, isResolved = false;
    var promise = {
      then: function (resolveFunction) {
        if (isResolved) {
          resolveFunction(resolveValue)
        } else {
          resolvers.push(resolveFunction);
        }
      }
    };
    this.on(type, function onceWrapper() {
      this.removeListener(type, onceWrapper);
      handler && handler.apply(this._owner, arguments);
      resolveValue = arguments[0];
      isResolved = true;
      for (var i = 0; i < resolvers.length; i++) {
        resolvers[i](resolveValue);
      }
    }, options);

    return promise;
  };

  /**
   * Alias for "on".
   * @method addListener
   */
  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  /**
   * Unbind an event by type and handler.
   *   This undoes the work of "on".
   *
   * @method removeListener
   *
   * @param {string} type event type key (for example, 'click')
   * @param {function} handler function object to remove
   * @return {EventEmitter} this
   */
  EventEmitter.prototype.removeListener = function removeListener(type, handler) {
    var listener = this.listeners[type];
    if (listener !== undefined) {
      var index = listener.indexOf(handler);
      if (index >= 0) listener.splice(index, 1);
    }
    return this;
  };

  EventEmitter.prototype.replaceListeners = function replaceListeners(type, handler) {
    this.listeners[type] = [];
    return this.on(type, handler);
  };

  /**
   * Call event handlers with this set to owner.
   *
   * @method bindThis
   *
   * @param {Object} owner object this EventEmitter belongs to
   */
  EventEmitter.prototype.bindThis = function bindThis(owner) {
    this._owner = owner;
  };

  module.exports = EventEmitter;
});
