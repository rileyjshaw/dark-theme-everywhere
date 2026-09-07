(() => {
	'use strict';

	const theme = document.getElementById('theme');
	const exceptions = document.getElementById('exceptions');
	const darken = document.getElementById('darken');
	const overrides = document.getElementById('site-overrides');
	const status = document.getElementById('status');

	function setStyles (selectedTheme) {
		document.documentElement.classList.toggle('dark-theme-everywhere-off', selectedTheme === 'light');
	}

	async function save (settings) {
		try {
			await chrome.storage.local.set(settings);
			status.textContent = 'Saved';
		} catch {
			status.textContent = 'Could not save your preferences. Please try again.';
		}
	}

	function renderOverrides (siteOverrides = {}) {
		overrides.replaceChildren();
		for (const [site, isDark] of Object.entries(siteOverrides).sort()) {
			if (typeof isDark !== 'boolean') continue;
			const item = document.createElement('li');
			item.append(document.createTextNode(`${site}: ${isDark ? 'Dark' : 'Light'} `));
			const reset = document.createElement('button');
			reset.textContent = 'Use default';
			reset.setAttribute('aria-label', `Use default theme for ${site}`);
			reset.addEventListener('click', async () => {
				try {
					const result = await chrome.runtime.sendMessage({type: 'dark-theme-everywhere:reset-site', site});
					status.textContent = result?.saved ? 'Saved' : 'Could not reset this site. Please try again.';
				} catch {
					status.textContent = 'Could not reset this site. Please try again.';
				}
			});
			item.append(reset);
			overrides.append(item);
		}
		if (!overrides.childElementCount) overrides.textContent = 'No site overrides.';
	}

	chrome.runtime.sendMessage({type: 'dark-theme-everywhere:get-settings'}, (settings) => {
		if (chrome.runtime.lastError || !settings || settings.error) {
			status.textContent = 'Could not load your preferences. Please reopen this page to try again.';
			return;
		}
		theme.value = settings.theme;
		exceptions.value = settings.exceptions;
		darken.checked = settings.darken;
		setStyles(settings.theme);
		renderOverrides(settings.siteOverrides);
		for (const input of [theme, exceptions, darken]) input.disabled = false;

		theme.addEventListener('change', () => {
			void save({theme: theme.value});
			setStyles(theme.value);
		});
		exceptions.addEventListener('input', () => void save({exceptions: exceptions.value}));
		darken.addEventListener('change', () => void save({darken: darken.checked}));
	});

	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === 'local' && changes.siteOverrides) renderOverrides(changes.siteOverrides.newValue);
	});
})();
