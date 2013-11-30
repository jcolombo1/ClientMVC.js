/**
* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
* docCookies - Oct/2013
* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
* Copyright © 2013 Jorge Colombo (Buenos Aires, Argentina); 
* Licensed MIT / GNU Public License v3+
*
*	contact: jcolombo@ymail.com
* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*
*  A full cookies reader/writer utility with unicode support.
*
*  based on: https://developer.mozilla.org/en-US/docs/DOM/document.cookie
*  This framework is released under the GNU Public License, version 3 or later.
*  http://www.gnu.org/licenses/gpl-3.0-standalone.html
*
*  Syntaxes:
*
*  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
*  * docCookies.getItem(name)
*  * docCookies.removeItem(name[, path], domain)
*  * docCookies.hasItem(name)
*  * docCookies.keys()
*
*/

var docCookies = {
  getItem: function (sKey) {
    return decodeURI(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURI(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; };
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    };
    document.cookie = encodeURI(sKey) + "=" + encodeURI(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  
  
  removeItem: function (sKey, sPath, sDomain) {
    if (!sKey || !this.hasItem(sKey)) { return false; };
    document.cookie = encodeURI(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + ( sDomain ? "; domain=" + sDomain : "") + ( sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + encodeURI(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = decodeURI(aKeys[nIdx]); };
    return aKeys;
  }
};
