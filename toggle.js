!(function (global) {
	// A unique ID for our injected <style> tag to make cleanup easier.
	var ID = 'nicest-inverter-dark-mode-css';
	// Keeps track of the current toggle state.
	var isDark = false;

	// Adds a <style> tag with dark-mode.css to the bottom of <body>.
	function injectStyles (cssContent) {
		var styleEl = document.createElement('style');
		styleEl.id = ID;
		styleEl.appendChild(document.createTextNode(cssContent));
		document.body.appendChild(styleEl);
	}

	// Removes our dark-mode.css <style> tag.
	function unloadStyles () {
		var styleEl = document.getElementById(ID);
		styleEl && styleEl.parentNode.removeChild(styleEl);
	}

	// This should never be called by a content script outside of a listener. We
	// expose it to background.js through listeners, and trust background.js as
	// the dispatcher.
	function toggle (cssContent) {
		(isDark ? unloadStyles : injectStyles)(cssContent);
		isDark = !isDark;
	}

	// If the background script says "toggle", toggle!
	chrome.runtime.onMessage.addListener(function (request, sender, response) {
		if (request && !sender.tab) {
			toggle(request.cssContent);
			response({isDark: isDark});
		}
	});

	// Let the background script know that we've loaded new content.
	chrome.runtime.sendMessage({status: 'ready'}, function (response) {
		toggle(response.cssContent);
	});
})(this);
