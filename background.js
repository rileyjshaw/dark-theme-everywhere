!function (global) {
	// Ensure that the default theme is set, defaulting to Dark.
	var themes = ['dark', 'light'];
	if (themes.indexOf(global.localStorage.getItem('theme')) === -1) {
		global.localStorage.setItem('theme', 'dark');
	}
	// Add some other default values to be on the safe side.
	if (!global.localStorage.getItem('exceptions')) {
		global.localStorage.setItem('exceptions', '');
	}

	// Chrome extensions don't currently let you listen to the extension button
	// from content scripts, so our background script acts as a dispatcher to
	// the active tab.
	chrome.browserAction.onClicked.addListener(function (tab) {
		chrome.tabs.sendMessage(
			tab.id, {type: 'com.rileyjshaw.dte__TOGGLE'}, setIcon);
	});

	// The active tab will, in turn, let the background script know when it has
	// loaded new content so that we can re-initialize the tab.
	chrome.runtime.onMessage.addListener(
		function (request, sender) {
			// Early exit if the message isn't coming from a content script.
			var tab = sender.tab;
			if (request.type !== 'com.rileyjshaw.dte__READY' || !tab) {return;}

			var theme = global.localStorage.getItem('theme');
			var exceptions = global.localStorage.getItem('exceptions')
				// Remove spaces.
				.replace(/ /g, '')
				// Split on commas or newlines.
				.split(/,|\n/)
				// Remove blank lines.
				.filter(function (exception) {return exception;})
				;

			var isException = exceptions.some(function(exception) {
				return request.url.search(exception) !== -1;
			});

			// XOR
			var isDark = isException !== (theme === 'dark');

			if (!isDark) {request.toggle();}
			setIcon(isDark);
		}
	);

	// Helper function to set the browser action icon.
	function setIcon (isDark) {
		var file = 'icon38' + (isDark ? '' : '-light') + '.png';
		chrome.browserAction.setIcon({path: chrome.extension.getURL(file)});
	}
}(this);
