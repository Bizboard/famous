/**
 * This Source Code is licensed under the MIT license. If a copy of the
 * MIT-license was not distributed with this file, You can obtain one at:
 * http://opensource.org/licenses/mit-license.html.
 *
 * @author: Hein Rutjes (IjzerenHein)
 * @license MIT
 * @copyright Gloey Apps, 2014 - 2015
 */

/**
 * BgImageSurface adds support for sizing-strategies such as AspectFit and AspectFill for displaying images with famo.us.
 * It uses a 'div' with a background-image rather than a 'img' tag.
 *
 * Can be used as a drop-in replacement for ImageSurface, in case the the size of the div is not derived
 * from the image.
 *
 * @module
 */
define(function(require, exports, module) {
    'use strict';

    var Surface = require('famous/core/Surface');
    var DOMBuffer = require('famous/core/DOMBuffer');
    var staticInherits = require('../utilities/StaticInherit.js').staticInherits;


  /**
     * @enum
     * @alias module:BgImageSurface.SizeMode
     */
    var SizeMode = {
        AUTO: 'auto',
        FILL: '100% 100%',
        ASPECTFILL: 'cover',
        ASPECTFIT: 'contain'
    };

    /**
     * @enum
     * @alias module:BgImageSurface.PositionMode
     */
    var PositionMode = {
        CENTER: 'center center',
        LEFT: 'left center',
        RIGHT: 'right center',
        TOP: 'center top',
        BOTTOM: 'center bottom',
        TOPLEFT: 'left top',
        TOPRIGHT: 'right top',
        BOTTOMLEFT: 'left bottom',
        BOTTOMRIGHT: 'right bottom'
    };

    /**
     * @enum
     * @alias module:BgImageSurface.RepeatMode
     */
    var RepeatMode = {
        NONE: 'no-repeat',
        VERTICAL: 'repeat-x',
        HORIZONTAL: 'repeat-y',
        BOTH: 'repeat'
    };

    /**
     * @class
     * @param {Object} options Options.
     * @param {String} [options.content] Image-url.
     * @param {SizeMode|String} [options.sizeMode] Size-mode to use.
     * @param {PositionMode|String} [options.positionMode] Position-mode to use.
     * @param {RepeatMode|String} [options.repeatMode] Repeat-mode to use.
     * @alias module:BgImageSurface
     */
    function BgImageSurface(options) {
        Surface.apply(this, arguments);
        this.content = undefined;
        this._updateProperties();
    }

    staticInherits(BgImageSurface, Surface);
    BgImageSurface.prototype.constructor = BgImageSurface;
    BgImageSurface.prototype.elementType = 'div';
    BgImageSurface.prototype.elementClass = 'famous-surface';
    BgImageSurface.SizeMode = SizeMode;
    BgImageSurface.PositionMode = PositionMode;
    BgImageSurface.RepeatMode = RepeatMode;

  BgImageSurface.prototype.setNewOptions = function setNewOptions(options){
    Surface.prototype.setNewOptions.call(this, options);
    this._updateProperties();
  };

    /**
     * Update the css-styles on the div.
     *
     * @private
     */
    BgImageSurface.prototype._updateProperties = function() {
        var options = this.options;
        this._imageUrl = options ? options.content : undefined;
        this._sizeMode = (options && options.sizeMode) ? options.sizeMode : SizeMode.FILL;
        this._positionMode = (options && options.positionMode) ? options.positionMode : PositionMode.CENTER;
        this._repeatMode = (options && options.repeatMode) ? options.repeatMode : RepeatMode.NONE;
        var props = {};
        if (this._imageUrl) {
            var imageUrl = this._imageUrl;
            // url encode '(' and ')'
            if ((imageUrl.indexOf('(') >= 0) || (imageUrl.indexOf(')') >= 0)) {
                imageUrl = imageUrl.split('(').join('%28');
                imageUrl = imageUrl.split(')').join('%29');
            }
            props.backgroundImage = 'url(' + imageUrl + ')';
        }
        else {
            props.backgroundImage = '';
        }
        props.backgroundSize = this._sizeMode;
        props.backgroundPosition = this._positionMode;
        props.backgroundRepeat = this._repeatMode;
        this.setProperties(props);
    };

    /**
     * @param {String} imageUrl Image-url, when set will cause re-rendering
     */
    BgImageSurface.prototype.setContent = function(imageUrl) {
        this._imageUrl = imageUrl;
        this._updateProperties();
    };

    /**
     * @return {String} Image-url
     */
    BgImageSurface.prototype.getContent = function() {
        return this._imageUrl;
    };

    /**
     * @param {SizeMode|String} sizeMode Sizing-mode, when set will cause re-rendering
     */
    BgImageSurface.prototype.setSizeMode = function(sizeMode) {
        this._sizeMode = sizeMode;
        this._updateProperties();
    };

    /**
     * @return {SizeMode|String} Size-mode
     */
    BgImageSurface.prototype.getSizeMode = function() {
        return this._sizeMode;
    };

    /**
     * @param {PositionMode|String} positionMode Position-mode, when set will cause re-rendering
     */
    BgImageSurface.prototype.setPositionMode = function(positionMode) {
        this._positionMode = positionMode;
        this._updateProperties();
    };

    /**
     * @return {RepeatMode|String} Position-mode
     */
    BgImageSurface.prototype.getPositionMode = function() {
        return this._positionMode;
    };

    /**
     * @param {RepeatMode|String} repeatMode Repeat-mode, when set will cause re-rendering
     */
    BgImageSurface.prototype.setRepeatMode = function(repeatMode) {
        this._repeatMode = repeatMode;
        this._updateProperties();
    };

    /**
     * @return {RepeatMode|String} Repeat-mode
     */
    BgImageSurface.prototype.getRepeatMode = function() {
        return this._repeatMode;
    };

    /**
     * Place the document element that this component manages into the document.
     *
     * NOTE: deploy and recall were added because famo.us removed the background-image
     * after the surface was removed/re-added from the DOM.
     *
     * @private
     * @param {Node} target document parent of this container
     */
    BgImageSurface.prototype.deploy = function deploy(target) {
        DOMBuffer.assignProperty(target, 'innerHTML', '');
        if (this._imageUrl) {
            DOMBuffer.assignProperty(target.style, 'backgroundImage', 'url(' + this._imageUrl + ')');
        }
    };


    /**
     * Remove this component and contained content from the document
     *
     * NOTE: deploy and recall were added because famo.us removed the background-image
     * after the surface was removed/re-added from the DOM.
     *
     * @private
     * @param {Node} target node to which the component was deployed
     */
    BgImageSurface.prototype.recall = function recall(target) {
        DOMBuffer.assignProperty(target.style, 'backgroundImage', '');
    };

    module.exports = BgImageSurface;
});
