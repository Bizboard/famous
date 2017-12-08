
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
      typeof document.body["on" + eventName] !== "undefined"
      ||
      /* Needed because otherwise not able to use mobile emulation in browser! */
      ['touchmove', 'touchstart', 'touchend'].includes(eventName)))
  };

  DOMEventHandler.addEventListener = function(id, element, type, callback){
    if(!DOMEventHandler.isNativeEvent(type)){
      return;
    }

    if(singleElementEvents.includes(type)){
      return element.addEventListener(type, callback);
    }
    DOMBuffer.setAttribute(element, 'data-arvaid', id); //TODO see if this can be replaced by symbols for performance
    var eventEmitter = initializedListeners[type];
    if(!eventEmitter){
      eventEmitter = initializedListeners[type] = new EventEmitter();
      window.addEventListener(type, function (event) {
        var target = event.target;
        var receivedID = target && target.getAttribute && target.getAttribute('data-arvaid');
        if(receivedID){
          eventEmitter.emit(receivedID, event);
        }
      }, {passive: true});
    }
    eventEmitter.on(id, callback);

  };

  DOMEventHandler.removeEventListener = function(element, id, type, callback) {
    if(singleElementEvents.includes(type)){
      return element.removeEventListener(type, callback);
    }
    if(initializedListeners[type]){
      initializedListeners[type].removeListener(id, callback);
    }
  };

  module.exports = DOMEventHandler;
});
