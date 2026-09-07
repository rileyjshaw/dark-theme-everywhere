(() => {
	'use strict';

	const html = document.documentElement;
	const OFF_CLASS = 'dark-theme-everywhere-off';
	const FILTERS_OFF_CLASS = 'dark-theme-everywhere-filters-off';
	const SPECIFICITY_CLASS = 'dark-theme-everywhere-specificity-helper';
	let isDark = true;

	function setDark (nextIsDark) {
		isDark = nextIsDark;
		html.classList.toggle(OFF_CLASS, !isDark);
	}

	function configure (request) {
		if (request?.type !== 'dark-theme-everywhere:configure' || request.url !== location.href) return;
		setDark(request.isDark === true);
		html.classList.toggle(FILTERS_OFF_CLASS, request.darkenMedia !== true);
	}

	function refresh () {
		chrome.runtime.sendMessage({type: 'dark-theme-everywhere:ready'}, (response) => {
			if (!chrome.runtime.lastError) configure(response);
		});
	}

	function addSpecificityHelpers () {
		const body = document.body;
		if (!body) return;

		body.classList.add(SPECIFICITY_CLASS);
		if (!html.id) html.id = SPECIFICITY_CLASS;
		else if (!body.id) body.id = SPECIFICITY_CLASS;
	}

	html.classList.add(SPECIFICITY_CLASS);
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', addSpecificityHelpers, {once: true});
	} else {
		addSpecificityHelpers();
	}

	chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
		switch (request?.type) {
			case 'dark-theme-everywhere:configure':
				configure(request);
				break;
			case 'dark-theme-everywhere:get-state':
				sendResponse({isDark, url: location.href});
				break;
		}
	});

	window.addEventListener('pageshow', (event) => {
		if (event.persisted) refresh();
	});
	refresh();
})();
