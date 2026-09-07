(() => {
	'use strict';

	const DEFAULT_SETTINGS = {
		theme: 'dark',
		exceptions: '',
		darken: true,
	};
	// Firefox's MV3 fallback is an extension page and can migrate MV2
	// localStorage directly. Chrome's service worker has no localStorage; its
	// options page performs the equivalent migration when first opened.
	const legacyStorageReady = migrateLegacyStorage();

	function ignoreRuntimeError () {
		void chrome.runtime.lastError;
	}

	function getSettings (callback) {
		legacyStorageReady.then(() => {
			chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
				if (chrome.runtime.lastError) return;
				callback({
					theme: settings.theme === 'light' ? 'light' : 'dark',
					exceptions: typeof settings.exceptions === 'string'
						? settings.exceptions
						: '',
					darken: settings.darken !== false,
				});
			});
		});
	}

	function migrateLegacyStorage () {
		if (typeof localStorage === 'undefined') return Promise.resolve();

		return new Promise((resolve) => {
			chrome.storage.local.get(null, (stored) => {
				if (chrome.runtime.lastError) {
					resolve();
					return;
				}

				const legacyTheme = localStorage.getItem('theme');
				const legacyExceptions = localStorage.getItem('exceptions');
				const legacyDarken = localStorage.getItem('darken');
				const migrated = {};

				if (stored.theme === undefined && ['dark', 'light'].includes(legacyTheme)) {
					migrated.theme = legacyTheme;
				}
				if (stored.exceptions === undefined && legacyExceptions !== null) {
					migrated.exceptions = legacyExceptions;
				}
				if (stored.darken === undefined && legacyDarken !== null) {
					migrated.darken = legacyDarken !== 'false';
				}

				if (Object.keys(migrated).length) {
					chrome.storage.local.set(migrated, resolve);
				} else {
					resolve();
				}
			});
		});
	}

	function getExceptions (value) {
		return value
			.split(/,|\n/)
			.map((exception) => exception.trim())
			.filter(Boolean);
	}

	function isException (url, exceptions) {
		return exceptions.some((exception) => url.includes(exception));
	}

	function getSiteIdentifier (url) {
		try {
			const parsedUrl = new URL(url);
			return parsedUrl.hostname
				? parsedUrl.hostname.replace(/^www\./, '')
				: url;
		} catch {
			return url;
		}
	}

	function setIcon (tabId, isDark) {
		chrome.action.setIcon({
			tabId,
			path: isDark ? 'icon38.png' : 'icon38-light.png',
		}, ignoreRuntimeError);
	}

	function sendToTab (tabId, message, callback = ignoreRuntimeError) {
		if (!Number.isInteger(tabId)) return;
		chrome.tabs.sendMessage(tabId, message, callback);
	}

	function handleManualToggle (tabId, response) {
		if (!response || typeof response.url !== 'string') return;

		getSettings((settings) => {
			const exceptions = getExceptions(settings.exceptions);
			const matchingExceptions = exceptions.filter((exception) =>
				response.url.includes(exception));
			const nextExceptions = matchingExceptions.length
				? exceptions.filter((exception) => !matchingExceptions.includes(exception))
				: [...exceptions, getSiteIdentifier(response.url)];

			chrome.storage.local.set({exceptions: nextExceptions.join('\n')});
			setIcon(tabId, response.isDark === true);
		});
	}

	chrome.action.onClicked.addListener((tab) => {
		if (!Number.isInteger(tab.id)) return;
		sendToTab(tab.id, {type: 'dark-theme-everywhere:toggle'}, (response) => {
			if (chrome.runtime.lastError) return;
			handleManualToggle(tab.id, response);
		});
	});

	chrome.runtime.onMessage.addListener((request, sender) => {
		if (
			request?.type !== 'dark-theme-everywhere:ready' ||
			!Number.isInteger(sender.tab?.id) ||
			typeof sender.url !== 'string'
		) return;

		getSettings((settings) => {
			const exceptions = getExceptions(settings.exceptions);
			const shouldBeDark =
				isException(sender.url, exceptions) !== (settings.theme === 'dark');

			setIcon(sender.tab.id, shouldBeDark);
			sendToTab(sender.tab.id, {
				type: 'dark-theme-everywhere:configure',
				isDark: shouldBeDark,
				darkenMedia: settings.darken === true,
			});
		});
	});

})();
