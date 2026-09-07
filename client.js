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
				setDark(request.isDark === true);
				html.classList.toggle(FILTERS_OFF_CLASS, request.darkenMedia !== true);
				break;
			case 'dark-theme-everywhere:toggle':
				setDark(!isDark);
				sendResponse({isDark, url: location.href});
				break;
		}
	});

	chrome.runtime.sendMessage({type: 'dark-theme-everywhere:ready'}, () => {
		void chrome.runtime.lastError;
	});
})();
