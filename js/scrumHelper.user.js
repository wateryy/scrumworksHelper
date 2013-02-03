// ==UserScript==
// @name 			ScrumWorks Helper
// @namespace		Funshion FE
// @author			liusw@funshion.com <liusw@funshion.com> http://www.funshion.com/
// @description		ScrumWorks小助手
// @match			http://redmine.funshion.com/*
// @icon			http://img.funshion.com/img/funshionscrum.jpg
// @require         https://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @run-at			document-idle
// @version 		1.0.0
// @homepage        http://www.funshion.com/
// @updateURL		http://www.funshion.com/
// ==/UserScript==

// 当前ScrumWorks小助手版本号
var version = "1.0.0";

// 获取当前所在页面的window对象
function getUnsafeWindow() {
	if(typeof(this.unsafeWindow) != "undefined") {
		return this.unsafeWindow;
	} else if(typeof(unsafeWindow) != "undefined" && this === window && unsafeWindow === window) {
		var node = document.createElement("div");
		node.setAttribute("onclick", "return window;");
		return node.onclick();
	} else {
		return window;
	}
}

// 获取当前所在scrum页面的window对象
var myUnsafeWindow = getUnsafeWindow(),

	// 获取jquery对象
	jQuery = myUnsafeWindow.jQuery || window.jQuery;

// 传入jquery及window对象
(function($, win) {
	$.getScript('http://work.funshion.com/chrome/test/js/scrumHelper.js', function() {
		window.console && console.log('Load ScrumWorks Success!');
	});
})(jQuery, myUnsafeWindow);