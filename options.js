(() => {
	'use strict';

	const DEFAULT_SETTINGS = {
		theme: 'dark',
		exceptions: '',
		darken: true,
	};
	const theme = document.getElementById('theme');
	const exceptions = document.getElementById('exceptions');
	const darken = document.getElementById('darken');

	function setStyles (selectedTheme) {
		document.documentElement.classList.toggle(
			'dark-theme-everywhere-off', selectedTheme === 'light');
	}

	function render (settings) {
		theme.value = settings.theme;
		exceptions.value = settings.exceptions;
		darken.checked = settings.darken;
		setStyles(settings.theme);
	}

	chrome.storage.local.get(null, (stored) => {
		if (chrome.runtime.lastError) return;

		const legacyTheme = localStorage.getItem('theme');
		const legacyExceptions = localStorage.getItem('exceptions');
		const legacyDarken = localStorage.getItem('darken');
		const settings = {
			theme: stored.theme ??
				(['dark', 'light'].includes(legacyTheme) ? legacyTheme : DEFAULT_SETTINGS.theme),
			exceptions: stored.exceptions ?? legacyExceptions ?? DEFAULT_SETTINGS.exceptions,
			darken: stored.darken ??
				(legacyDarken === null ? DEFAULT_SETTINGS.darken : legacyDarken !== 'false'),
		};

		chrome.storage.local.set(settings);
		render(settings);
	});

	theme.addEventListener('change', () => {
		chrome.storage.local.set({theme: theme.value});
		setStyles(theme.value);
	});
	exceptions.addEventListener('input', () => {
		chrome.storage.local.set({exceptions: exceptions.value});
	});
	darken.addEventListener('change', () => {
		chrome.storage.local.set({darken: darken.checked});
	});
})();
