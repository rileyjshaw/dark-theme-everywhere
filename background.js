!function (global) {
	// Ensure that the default theme is set, defaulting to Dark.
	if (['dark', 'light'].indexOf(global.localStorage.getItem('theme')) === -1) {
		global.localStorage.setItem('theme', 'dark');
	}
	// Add some other default values to be on the safe side.
	if (!global.localStorage.getItem('exceptions')) {
		global.localStorage.setItem('exceptions', '');
	}
	if (global.localStorage.getItem('darken') !== 'false') {
		global.localStorage.setItem('darken', true);
	}

	// Chrome extensions don't currently let you listen to the extension button
	// from content scripts, so our background script acts as a dispatcher to
	// the active tab.
	function toggleClient (tab, skipExclusion) {
		var cb = skipExclusion
			? function (response) {response && setIcon(response.isDark);}
			: handleManualToggle;
		chrome.tabs.sendMessage(tab.id, {type: 'com.rileyjshaw.dte__TOGGLE'}, cb);
	}
	chrome.browserAction.onClicked.addListener(toggleClient);

	// If the toggle button is clicked manually, we add or remove the active
	// site's subdomain to/from the exceptions list. This ensures that the
	// toggled state persists on future visits to the page.
	function handleManualToggle (response) {
		var url = response.url;
		var isDark = response.isDark;

		// Strip the protocol and trailing slashes.
		var toStrip = /.*:\/\/|\/$/g;
		var exceptions = getExceptions();
		var newExceptions = isException(url, exceptions)
			? exceptions.filter(function (exception) {
				return exception.replace(toStrip, '') !== url.replace(toStrip, '');
			})
			: exceptions.concat(url);

		global.localStorage.setItem('exceptions', newExceptions.join('\n'));
		setIcon(isDark);
	}

	// The active tab will, in turn, let the background script know when it has
	// loaded new content so that we can re-initialize the tab.
	chrome.runtime.onMessage.addListener(
		function (request, sender) {
			// Early exit if the message isn't coming from a content script.
			var tab = sender.tab;
			if (request.type !== 'com.rileyjshaw.dte__READY' || !tab) {return;}

			var theme = global.localStorage.getItem('theme');
			var darken = global.localStorage.getItem('darken') === 'true';

			// XOR
			var isDark = isException(sender.url) !== (theme === 'dark');

			setIcon(isDark);
			if (!isDark) {toggleClient(tab, true);}
			if (!darken) {
				chrome.tabs.sendMessage(
					tab.id, {type: 'com.rileyjshaw.dte__REMOVE_MEDIA_FILTERS'});
			}
		}
	);

	// Returns a formatted list of exception URLs.
	function getExceptions () {
		return global.localStorage.getItem('exceptions')
			// Remove spaces.
			.replace(/ /g, '')
			// Split on commas or newlines.
			.split(/,|\n/)
			// Remove blank lines.
			.filter(function (exception) {return exception;})
			;
	}

	// Accepts a URL and an optional exceptions list. Returns true if any of the
	// list's fragments match the URL.
	function isException (url, exceptions) {
		return (exceptions || getExceptions()).some(function (exception) {
			return url.search(exception) !== -1;
		});
	}

	// Helper function to set the browser action icon.
	function setIcon (isDark) {
		var file = 'icon38' + (isDark ? '' : '-light') + '.png';
		chrome.browserAction.setIcon({path: chrome.extension.getURL(file)});
	}
}(this);
