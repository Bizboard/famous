
/**
 * Created by lundfall on 01/06/2017.
 */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2015
 */

define(function (require, exports, module) {

  var DOMEventHandler = {};
  var EventEmitter = require('./EventEmitter.js');
  var DOMBuffer = require('./DOMBuffer');

  var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  //TODO Add more to complete list
  var singleElementEvents = [
    'submit', 'focus', 'blur', 'load', 'unload', 'change', 'reset', 'scroll'
  ].concat(iOS ? ['click', 'touchstart', 'touchend'] : []);

  var initializedListeners = {};
  var nativeEventsMemoization = {};
  DOMEventHandler.isNativeEvent = function(eventName) {
    var memoizedValue = nativeEventsMemoization[eventName];
    if(typeof memoizedValue === 'boolean'){
      return memoizedValue;
    }
    return (nativeEventsMemoization[eventName] = (
      typeof document.body['on' + eventName] !== 'undefined'
      ||
      /* Needed because otherwise not able to use mobile emulation in browser! */
      ['touchmove', 'touchstart', 'touchend'].includes(eventName)))
  };

  DOMEventHandler.addEventListenerForAllOthers = function(id, type, callback){
    if(!this.isNativeEvent(type)){
      throw new Error('Cannot set an exclusion event on a non-native event');
    }
    var eventEmitters = this._addEventListener(id, type, callback);
    var wrapperCallback = function (receivedID, event) {
      /* String conversion, because the recieved id will always be a string, and the id passed can be a number */
      if(receivedID !== "" + id){
        return callback(event);
      }
    };
    /* Todo think of a cleaner solution than setting a property on the callback. With this solution, multiple ID sources
    *  cannot share the same callback */
    if(!callback.wrapperCallback){
      callback.wrapperCallback = wrapperCallback;
    }
    eventEmitters.exclusion.on(type, wrapperCallback);
  };
  DOMEventHandler.removeEventListenerForAllOthers = function(id, type, callback){
    if(initializedListeners[type]){
      initializedListeners[type].exclusion.removeListener(type, callback && callback.wrapperCallback);
    }
  };

  DOMEventHandler.addEventListener = function(id, element, type, callback){
    if(!this.isNativeEvent(type)){
      return;
    }

    if(singleElementEvents.includes(type)){
      return element.addEventListener(type, callback);
    }
    DOMBuffer.setAttribute(element, 'data-arvaid', id); //TODO see if this can be replaced by symbols for performance
    var eventEmitters = this._addEventListener(id, type, callback);
    eventEmitters.inclusion.on(id, callback);
  };

  DOMEventHandler._addEventListener = function(id, type, callback) {
    var eventEmitters = initializedListeners[type];
    if(!eventEmitters){
      eventEmitters = initializedListeners[type] = {
        inclusion: new EventEmitter(),
        exclusion: new EventEmitter()
      };
      window.addEventListener(type, function (event) {
        var target = event.target;
        var receivedID = target && target.getAttribute && target.getAttribute('data-arvaid');
        if(receivedID){
          eventEmitters.inclusion.emit(receivedID, event);
        }
        eventEmitters.exclusion.emit(event.type, receivedID, event);
      }, {passive: true});
    }
    return eventEmitters;
  };

  DOMEventHandler.removeEventListener = function(element, id, type, callback) {
    if(singleElementEvents.includes(type)){
      return element.removeEventListener(type, callback);
    }
    if(initializedListeners[type]){
      initializedListeners[type].exclusion.removeListener(id, callback);
    }
  };

  module.exports = DOMEventHandler;
});
