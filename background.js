(() => {
	'use strict';

	const DEFAULT_SETTINGS = {theme: 'dark', exceptions: '', darken: true, siteOverrides: {}};
	let storageReady;
	let pendingToggle = Promise.resolve();
	let pendingRefresh = Promise.resolve();

	async function migrateSettings () {
		const stored = await chrome.storage.local.get(null);
		if (stored.storageVersion >= 1) return;

		let legacy;
		if (typeof localStorage !== 'undefined') {
			legacy = Object.fromEntries(['theme', 'exceptions', 'darken']
				.map((key) => [key, localStorage.getItem(key)]));
		} else {
			const contexts = await chrome.runtime.getContexts({
				contextTypes: ['OFFSCREEN_DOCUMENT'],
				documentUrls: [chrome.runtime.getURL('migration.html')],
			});
			if (!contexts.length) {
				await chrome.offscreen.createDocument({
					url: 'migration.html',
					reasons: ['LOCAL_STORAGE'],
					justification: 'Import existing theme preferences from earlier extension versions.',
				});
			}
			try {
				legacy = await chrome.runtime.sendMessage({type: 'dark-theme-everywhere:read-legacy'});
				if (!legacy || legacy.error) throw new Error('Could not read existing preferences.');
			} finally {
				await chrome.offscreen.closeDocument();
			}
		}

		const migrated = {storageVersion: 1};
		if (stored.theme === undefined && ['dark', 'light'].includes(legacy.theme)) {
			migrated.theme = legacy.theme;
		}
		if (stored.exceptions === undefined && typeof legacy.exceptions === 'string') {
			migrated.exceptions = legacy.exceptions;
		}
		if (stored.darken === undefined && legacy.darken !== null) {
			migrated.darken = legacy.darken !== 'false';
		}
		await chrome.storage.local.set(migrated);
	}

	function ensureStorageReady () {
		if (!storageReady) {
			storageReady = migrateSettings().catch((error) => {
				storageReady = null;
				throw error;
			});
		}
		return storageReady;
	}

	async function getSettings () {
		await ensureStorageReady();
		const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
		return {
			theme: settings.theme === 'light' ? 'light' : 'dark',
			exceptions: typeof settings.exceptions === 'string' ? settings.exceptions : '',
			darken: settings.darken !== false,
			siteOverrides: settings.siteOverrides && typeof settings.siteOverrides === 'object' &&
				!Array.isArray(settings.siteOverrides) ? settings.siteOverrides : {},
		};
	}

	function getSiteIdentifier (url) {
		return new URL(url).hostname.replace(/^www\./, '');
	}

	function defaultForUrl (url, settings) {
		const isException = settings.exceptions.split(/,|\n/)
			.map((value) => value.trim()).filter(Boolean)
			.some((value) => url.includes(value));
		return isException !== (settings.theme === 'dark');
	}

	function configuration (url, settings) {
		const site = getSiteIdentifier(url);
		const override = Object.hasOwn(settings.siteOverrides, site) ? settings.siteOverrides[site] : undefined;
		return {
			type: 'dark-theme-everywhere:configure',
			url,
			isDark: typeof override === 'boolean' ? override : defaultForUrl(url, settings),
			darkenMedia: settings.darken,
		};
	}

	function setIcon (tabId, isDark) {
		chrome.action.setIcon({tabId, path: isDark ? 'icon38.png' : 'icon38-light.png'}, () => {
			void chrome.runtime.lastError;
		});
	}

	async function configureTab (tabId, settings) {
		try {
			const state = await chrome.tabs.sendMessage(tabId,
				{type: 'dark-theme-everywhere:get-state'}, {frameId: 0});
			if (typeof state?.url !== 'string') return;
			const config = configuration(state.url, settings);
			await chrome.tabs.sendMessage(tabId, config, {frameId: 0});
			setIcon(tabId, config.isDark);
		} catch {
			// Restricted pages and tabs closed during the update have no receiver.
		}
	}

	async function toggleTab (tabId) {
		const settings = await getSettings();
		const state = await chrome.tabs.sendMessage(tabId,
			{type: 'dark-theme-everywhere:get-state'}, {frameId: 0});
		if (typeof state?.url !== 'string') return;
		const site = getSiteIdentifier(state.url);
		if (!site) return;
		const isDark = !configuration(state.url, settings).isDark;
		const siteOverrides = {...settings.siteOverrides};
		if (isDark === defaultForUrl(state.url, settings)) delete siteOverrides[site];
		else Object.defineProperty(siteOverrides, site, {value: isDark, enumerable: true, configurable: true});
		await chrome.storage.local.set({siteOverrides});
	}

	chrome.action.onClicked.addListener((tab) => {
		if (!Number.isInteger(tab.id)) return;
		// Serialize read/modify/write so quick clicks cannot lose another site's choice.
		pendingToggle = pendingToggle.then(() => toggleTab(tab.id)).catch(() => {});
	});

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		const fromOptions = sender.url?.split(/[?#]/)[0] === chrome.runtime.getURL('options.html');
		if (request?.type === 'dark-theme-everywhere:reset-site' && fromOptions &&
			typeof request.site === 'string') {
			pendingToggle = pendingToggle.then(async () => {
				const settings = await getSettings();
				delete settings.siteOverrides[request.site];
				await chrome.storage.local.set({siteOverrides: settings.siteOverrides});
			}).then(() => sendResponse({saved: true}), () => sendResponse({error: 'Could not reset this site.'}));
			return true;
		}
		if (request?.type === 'dark-theme-everywhere:get-settings' && fromOptions) {
			getSettings().then(sendResponse, () => sendResponse({error: 'Could not load preferences.'}));
			return true;
		}
		if (request?.type !== 'dark-theme-everywhere:ready' || sender.frameId !== 0 ||
			!Number.isInteger(sender.tab?.id) || typeof sender.url !== 'string') return;
		getSettings().then((settings) => {
			const config = configuration(sender.url, settings);
			setIcon(sender.tab.id, config.isDark);
			sendResponse(config);
		}, () => sendResponse({error: 'Could not load preferences.'}));
		return true;
	});

	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== 'local' || !Object.keys(DEFAULT_SETTINGS).some((key) => key in changes)) return;
		pendingRefresh = pendingRefresh.then(async () => {
			const settings = await getSettings();
			const tabs = await chrome.tabs.query({});
			await Promise.all(tabs.map((tab) => configureTab(tab.id, settings)));
		}).catch(console.error);
	});

	chrome.runtime.onInstalled.addListener(() => {
		ensureStorageReady().catch(console.error);
	});
})();
