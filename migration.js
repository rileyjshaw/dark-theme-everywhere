chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message?.type !== 'dark-theme-everywhere:read-legacy') return;
	try {
		sendResponse(Object.fromEntries(['theme', 'exceptions', 'darken']
			.map((key) => [key, localStorage.getItem(key)])));
	} catch {
		sendResponse({error: 'Could not read existing preferences.'});
	}
});
