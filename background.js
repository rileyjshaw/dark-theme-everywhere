!(function (global) {
	// We're going to load the text content of our CSS file so that we can inject
	// it into a <script> tag at the bottom of <body>. This will (hopefully) win
	// us the specificity wars against aggressively !important-ing pages.
	var xhr = new XMLHttpRequest();
	var cssContent = '';

	xhr.onreadystatechange = function () {
		if (xhr.readyState !== XMLHttpRequest.DONE) return;

		// We cache the text content of our CSS file here, so that we don't have to
		// re-fetch it for each page load.
		cssContent = xhr.responseText;
		toggleActiveTab();

		// Chrome extensions don't currently let you listen to the extension button
		// from content scripts, so our background script acts as a dispatcher to
		// the active tab.
		chrome.browserAction.onClicked.addListener(toggleActiveTab);

		// The active tab will, in turn, let the background script know when it has
		// loaded new content so that we can re-send cssContent.
		chrome.runtime.onMessage.addListener(
			function (request, sender, sendResponse) {
				if (request && sender.tab) sendResponse({cssContent: cssContent});
			}
		);
	}
	xhr.open('GET', chrome.extension.getURL('dark-mode.css'), true);
	xhr.send();

	// Finds the active tab and sends a message indicating to toggle from light
	// to dark mode, or vice-versa.
	function toggleActiveTab () {
		chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
			chrome.tabs.sendMessage(
				tabs[0].id, {cssContent: cssContent}, function (response) {
					var file = 'icon38' + (response.isDark ? '' : '-light') + '.png';
					chrome.browserAction.setIcon({
						path: chrome.extension.getURL(file)});
				}
			);
		});
	}
})(this);
