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
   * The singleton object initiated upon process
   *   startup which manages all active Context instances, runs
   *   the render dispatch loop, and acts as a listener and dispatcher
   *   for events.  All methods are therefore static.
   *
   *   On static initialization, window.requestAnimationFrame is called with
   *     the event loop function.
   *
   *   Note: Any window in which Engine runs will prevent default
   *     scrolling behavior on the 'touchmove' event.
   *
   * @static
   * @class Engine
   */
  var Context = require('./Context');
  var ElementAllocator = require('./ElementAllocator');
  var EventHandler = require('./EventHandler');
  var OptionsManager = require('./OptionsManager');
  var DOMBuffer = require('./DOMBuffer');

  /* Precise function for comparing time stamps*/
  var getTime = (typeof window !== 'undefined' && window.performance && window.performance.now) ?
    function() {
      return window.performance.now();
    }
    : function() {
      return Date.now();
    };


  var Engine = {};

  var contexts = [];

  var nextTickQueue = [];

  var currentFrame = 0;
  var nextTickFrame = 0;

  var deferQueue = [];

  /* The last timestamp of the previous frame */
  var lastTime = getTime();

  var frameTime;
  var frameTimeLimit;
  var loopEnabled = true;
  var eventForwarders = {};
  var eventHandler = new EventHandler();

  var options = {
    containerType: 'div',
    containerClass: 'famous-container',
    fpsCap: undefined,
    runLoop: true,
    appMode: true
  };
  var optionsManager = new OptionsManager(options);

  /** @const */
  var MAX_DEFER_FRAME_TIME = 10;


  Engine.PriorityLevels = {
    critical: Infinity,
    normal: 130,
    generous: 0
  };

  Engine.getCurrentFrameIndex = function() {
    return currentFrame;
  };

  /**
   * Inside requestAnimationFrame loop, step() is called, which:
   *   calculates current FPS (throttling loop if it is over limit set in setFPSCap),
   *   emits dataless 'prerender' event on start of loop,
   *   calls in order any one-shot functions registered by nextTick on last loop,
   *   calls Context.update on all Context objects registered,
   *   and emits dataless 'postrender' event on end of loop.
   *
   * @static
   * @private
   * @method step
   */
  Engine.step = function step() {
    currentFrame++;
    nextTickFrame = currentFrame;

    var currentTime = getTime();

    this._lastFrameTimeDelta = currentTime - lastTime;
    // skip frame if we're over our framerate cap
    if (frameTimeLimit && this._lastFrameTimeDelta < frameTimeLimit) return;

    this._priorityLevel = Infinity;
    var priorityLevels = Object.keys(Engine.PriorityLevels);
    for (var i = 0; i < priorityLevels.length; i++) {
      var priority = priorityLevels[i];
      var priorityLevelCriteria = Engine.PriorityLevels[priority];
      if (this._lastFrameTimeDelta < priorityLevelCriteria && priorityLevelCriteria <= this._priorityLevel){
          this._priorityLevel = priorityLevelCriteria;
        }
    }

    frameTime = currentTime - lastTime;
    lastTime = currentTime;

    eventHandler.emit('prerender');

    // empty the queue
    var numFunctions = nextTickQueue.length;
    while (numFunctions--) (nextTickQueue.shift())(currentFrame);

    // limit total execution time for deferrable functions
    while (deferQueue.length && (getTime() - currentTime) < MAX_DEFER_FRAME_TIME) {
      deferQueue.shift().call(this);
    }

    for (var i = 0; i < contexts.length; i++) contexts[i].update();

    DOMBuffer.flushUpdates();

    eventHandler.emit('postrender');

    if(this._shouldTakeDoubleStep){
      this._shouldTakeDoubleStep = false;
      this.step()
    }

  };

  Engine.doubleStep = function() {
    this._shouldTakeDoubleStep = true;
  }

  /**
   * @example
   *
   * Engine.restrictAnimations({
   *  size: Engine.PriorityLevel.critical,
   *  opacity: Engine.PriorityLevel.critical
   * })
   *
   * Instructs the engine to disable the animations for the different properties passed.
   *
   * @param options
   */
  Engine.restrictAnimations = function disableAnimationsWhen(options) {
    this._disableAnimationSpec = options;
  };

  Engine.shouldPropertyAnimate = function shouldPropertyAnimate(propertyName){
    if(!this._disableAnimationSpec){
      return true;
    }
    var priorityLevel = this._disableAnimationSpec[propertyName];
    if(priorityLevel === undefined){
      return true;
    }
    return this._priorityLevel < priorityLevel;
  };


  Engine.getFrameTimeDelta = function getFrameTimeDelta() {
    return this._lastFrameTimeDelta;
  };

  // engage requestAnimationFrame
  function loop() {
    if (options.runLoop) {
      Engine.step();
      window.requestAnimationFrame(loop);
    }
    else loopEnabled = false;
  }

  if (typeof window !== 'undefined') {
    window.requestAnimationFrame(loop);
  }

  //
  // Upon main document window resize (unless on an "input" HTML element):
  //   scroll to the top left corner of the window,
  //   and for each managed Context: emit the 'resize' event and update its size.
  // @param {Object=} event document event
  //
  function handleResize(event) {
    for (var i = 0; i < contexts.length; i++) {
      contexts[i].emit('resize');
    }
    eventHandler.emit('resize');
  }

  if (typeof window !== 'undefined') {

    window.addEventListener('resize', handleResize, false);
    handleResize();

    window.addEventListener('resize', handleResize, false);
    handleResize();
  }

  Engine.touchMoveEnabled = true;

  Engine.getPriorityLevel = function () {
    return this._priorityLevel;
  };
  Engine.disableTouchMove = function disableTouchMove() {
    if (this.touchMoveEnabled) {
      // prevent scrolling via browser
      window.addEventListener('touchmove', function (event) {
        if (event.target.tagName === 'TEXTAREA' || this.touchMoveEnabled) {
          return true;
        } else {
          event.preventDefault();
        }
      }.bind(this), { capture: true, passive: false });
      this.touchMoveEnabled = false;
    }
  };


  /**
   * Initialize famous for app mode
   *
   * @static
   * @private
   * @method initialize
   */
  function initialize() {
    addRootClasses();
  }

  var initialized = false;

  function addRootClasses() {
    if (!document.body) {
      Engine.nextTick(addRootClasses);
      return;
    }

    document.body.classList.add('famous-root');
    document.documentElement.classList.add('famous-root');
  }

  var canvas;
  Engine.getCachedCanvas = function() {
    if(!canvas){
      canvas = document.createElement('canvas');
      document.createDocumentFragment().appendChild(canvas);
    }
    return canvas;
  };

  /**
   * Add event handler object to set of downstream handlers.
   *
   * @method pipe
   *
   * @param {EventHandler} target event handler target object
   * @return {EventHandler} passed event handler
   */
  Engine.pipe = function pipe(target) {
    if (target.subscribe instanceof Function) return target.subscribe(Engine);
    else return eventHandler.pipe(target);
  };

  /**
   * Remove handler object from set of downstream handlers.
   *   Undoes work of "pipe".
   *
   * @method unpipe
   *
   * @param {EventHandler} target target handler object
   * @return {EventHandler} provided target
   */
  Engine.unpipe = function unpipe(target) {
    if (target.unsubscribe instanceof Function) return target.unsubscribe(Engine);
    else return eventHandler.unpipe(target);
  };

  /**
   * Bind a callback function to an event type handled by this object.
   *
   * @static
   * @method "on"
   *
   * @param {string} type event type key (for example, 'click')
   * @param {function(string, Object)} handler callback
   * @return {EventHandler} this
   */
  Engine.on = function on(type, handler) {
    if (!(type in eventForwarders)) {
      eventForwarders[type] = eventHandler.emit.bind(eventHandler, type);

      addEngineListener(type, eventForwarders[type]);
    }
    return eventHandler.on(type, handler);
  };

  function addEngineListener(type, forwarder) {
    if (!document.body) {
      Engine.nextTick(addEventListener.bind(this, type, forwarder));
      return;
    }

    document.body.addEventListener(type, forwarder);
  }

  /**
   * Trigger an event, sending to all downstream handlers
   *   listening for provided 'type' key.
   *
   * @method emit
   *
   * @param {string} type event type key (for example, 'click')
   * @param {Object} event event data
   * @return {EventHandler} this
   */
  Engine.emit = function emit(type, event) {
    return eventHandler.emit(type, event);
  };

  /**
   * Unbind an event by type and handler.
   *   This undoes the work of "on".
   *
   * @static
   * @method removeListener
   *
   * @param {string} type event type key (for example, 'click')
   * @param {function} handler function object to remove
   * @return {EventHandler} internal event handler object (for chaining)
   */
  Engine.removeListener = function removeListener(type, handler) {
    return eventHandler.removeListener(type, handler);
  };

  /**
   * Return the current calculated frames per second of the Engine.
   *
   * @static
   * @method getFPS
   *
   * @return {Number} calculated fps
   */
  Engine.getFPS = function getFPS() {
    return 1000 / frameTime;
  };

  /**
   * Set the maximum fps at which the system should run. If internal render
   *    loop is called at a greater frequency than this FPSCap, Engine will
   *    throttle render and update until this rate is achieved.
   *
   * @static
   * @method setFPSCap
   *
   * @param {Number} fps maximum frames per second
   */
  Engine.setFPSCap = function setFPSCap(fps) {
    frameTimeLimit = Math.floor(1000 / fps);
  };

  /**
   * Return engine options.
   *
   * @static
   * @method getOptions
   * @param {string} key
   * @return {Object} engine options
   */
  Engine.getOptions = function getOptions(key) {
    return optionsManager.getOptions(key);
  };

  /**
   * Set engine options
   *
   * @static
   * @method setOptions
   *
   * @param {Object} [options] overrides of default options
   * @param {Number} [options.fpsCap]  maximum fps at which the system should run
   * @param {boolean} [options.runLoop=true] whether the run loop should continue
   * @param {string} [options.containerType="div"] type of container element.  Defaults to 'div'.
   * @param {string} [options.containerClass="famous-container"] type of container element.  Defaults to 'famous-container'.
   */
  Engine.setOptions = function setOptions(options) {
    return optionsManager.setOptions.apply(optionsManager, arguments);
  };

  /**
   * Creates a new Context for rendering and event handling with
   *    provided document element as top of each tree. This will be tracked by the
   *    process-wide Engine.
   *
   * @static
   * @method createContext
   *
   * @param {Node} el will be top of Famo.us document element tree
   * @return {Context} new Context within el
   */
  Engine.createContext = function createContext(el) {

    this._priorityLevel = Engine.PriorityLevels.critical;

    if (!initialized && options.appMode) Engine.nextTick(initialize.bind(this));

    var needMountContainer = false;
    if (!el) {
      el = document.createElement(options.containerType);
      el.classList.add(options.containerClass);
      needMountContainer = true;
    }

    var context = new Context();
    context.setPermanentElementAllocator(new ElementAllocator(el));
    Engine.registerContext(context);

    if (needMountContainer) mount(context, el);

    return context;
  };

  function mount(context, el) {
    if (!document.body) {
      Engine.nextTick(mount.bind(this, context, el));
      return;
    }

    document.body.appendChild(el);
    context.emit('resize');
  }

  /**
   * Registers an existing context to be updated within the run loop.
   *
   * @static
   * @method registerContext
   *
   * @param {Context} context Context to register
   * @return {FamousContext} provided context
   */
  Engine.registerContext = function registerContext(context) {
    contexts.push(context);
    return context;
  };

  /**
   * Returns a list of all contexts.
   *
   * @static
   * @method getContexts
   * @return {Array} contexts that are updated on each tick
   */
  Engine.getContexts = function getContexts() {
    return contexts;
  };

  /**
   * Removes a context from the run loop. Note: this does not do any
   *     cleanup.
   *
   * @static
   * @method deregisterContext
   *
   * @param {Context} context Context to deregister
   */
  Engine.deregisterContext = function deregisterContext(context) {
    var i = contexts.indexOf(context);
    if (i >= 0) contexts.splice(i, 1);
  };

  /**
   * Queue a function to be executed on the next tick of the
   *    Engine.
   *
   * @static
   * @method nextTick
   *
   * @param {function(Object)} fn function accepting window object
   */
  Engine.nextTick = function nextTick(fn) {
    nextTickQueue.push(fn);
  };

  Engine.now = getTime;

  /**
   * Queue a function to be executed sometime soon, at a time that is
   *    unlikely to affect frame rate.
   *
   * @static
   * @method defer
   *
   * @param {Function} fn
   */
  Engine.defer = function defer(fn) {
    deferQueue.push(fn);
  };

  optionsManager.on('change', function (data) {
    if (data.id === 'fpsCap') Engine.setFPSCap(data.value);
    else if (data.id === 'runLoop') {
      // kick off the loop only if it was stopped
      if (!loopEnabled && data.value) {
        loopEnabled = true;
        window.requestAnimationFrame(loop);
      }
    }
  });

  module.exports = Engine;
});
