
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2015
 */

define(function(require, exports, module) {
    var Surface = require('../core/Surface');
    var DOMBuffer = require('famous/core/DOMBuffer');
    var staticInherits = require('../utilities/StaticInherit.js').staticInherits;

    /**
     * A surface containing image content.
     *   This extends the Surface class.
     *
     * @class ImageSurface
     *
     * @extends Surface
     * @constructor
     * @param {Object} [options] overrides of default options
     */
    function ImageSurface(options) {
        this._imageUrl = undefined;
        Surface.apply(this, arguments);
        this.on('load', this._onImageLoadedInDOM.bind(this));
    }

    var urlCache = [];
    var countCache = [];
    var nodeCache = [];
    var cacheEnabled = true;


    ImageSurface.enableCache = function enableCache() {
        cacheEnabled = true;
    };

    ImageSurface.disableCache = function disableCache() {
        cacheEnabled = false;
    };

    ImageSurface.clearCache = function clearCache() {
        urlCache = [];
        countCache = [];
        nodeCache = [];
    };

    ImageSurface.getCache = function getCache() {
        return {
            urlCache: urlCache,
            countCache: countCache,
            nodeCache: nodeCache
        };
    };

    staticInherits(ImageSurface, Surface);
    ImageSurface.prototype.constructor = ImageSurface;
    ImageSurface.prototype.elementType = 'img';
    ImageSurface.prototype.elementClass = 'famous-surface';

  ImageSurface.prototype._onImageLoadedInDOM = function onImageLoadedInDOM() {
    if(this.size && (this.size[0] === true || this.size[1] === true)){
      this._eventOutput.emit('resize');
    }
  };

    /**
     * Set content URL.  This will cause a re-rendering.
     * @method setContent
     * @param {string} imageUrl
     */
    ImageSurface.prototype.setContent = function setContent(imageUrl) {
        var urlIndex = urlCache.indexOf(this._imageUrl);
        if (urlIndex !== -1) {
            if (countCache[urlIndex] === 1) {
                urlCache.splice(urlIndex, 1);
                countCache.splice(urlIndex, 1);
                nodeCache.splice(urlIndex, 1);
            } else {
                countCache[urlIndex]--;
            }
        }

        urlIndex = urlCache.indexOf(imageUrl);
        if (urlIndex === -1) {
            urlCache.push(imageUrl);
            countCache.push(1);
        }
        else {
            countCache[urlIndex]++;
        }

        this._imageUrl = imageUrl;
        this._contentDirty = true;
    };

    /**
     * Place the document element that this component manages into the document.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    ImageSurface.prototype.deploy = function deploy(target) {
        var urlIndex = urlCache.indexOf(this._imageUrl);
        if (nodeCache[urlIndex] === undefined && cacheEnabled) {
            var img = new Image();
            img.src = this._imageUrl || '';
            nodeCache[urlIndex] = img;
        }
        DOMBuffer.assignProperty(target, 'src', this._imageUrl || '');
    };

    /**
     * Remove this component and contained content from the document
     *
     * @private
     * @method recall
     *
     * @param {Node} target node to which the component was deployed
     */
    ImageSurface.prototype.recall = function recall(target) {
      DOMBuffer.assignProperty(target, 'src', '');
    };

    module.exports = ImageSurface;
});
