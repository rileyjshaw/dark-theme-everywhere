!function (global) {
	// Ensure that the default theme is set, defaulting to Dark.
	var themes = ['dark', 'light'];
	if (themes.indexOf(global.localStorage.getItem('theme')) === -1) {
		global.localStorage.setItem('theme', 'dark');
	}

	// Chrome extensions don't currently let you listen to the extension button
	// from content scripts, so our background script acts as a dispatcher to
	// the active tab.
	chrome.browserAction.onClicked.addListener(function (tab) {
		chrome.tabs.sendMessage(tab.id, 'toggle', setIcon);
	});

	// The active tab will, in turn, let the background script know when it has
	// loaded new content so that we can re-initialize the tab.
	chrome.runtime.onMessage.addListener(
		function (request, sender, sendResponse) {
			// Early exit if the message isn't coming from a content script.
			var tab = sender.tab;
			if (request !== 'ready' || !tab) {return;}

			var isDark = global.localStorage.getItem('theme') === 'dark';
			if (!isDark) {sendResponse();}
			setIcon(isDark);
		}
	);

	// Helper function to set the browser action icon.
	function setIcon (isDark) {
		var file = 'icon38' + (isDark ? '' : '-light') + '.png';
		chrome.browserAction.setIcon({path: chrome.extension.getURL(file)});
	}
}(this);
