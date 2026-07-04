const DEFAULTS = {
  theme: "dark",
  exceptions: "",
  darken: true
};

async function getSettings() {
  const settings = await chrome.storage.local.get(DEFAULTS);
  return {
    theme: settings.theme === "light" ? "light" : "dark",
    exceptions: typeof settings.exceptions === "string" ? settings.exceptions : "",
    darken: settings.darken !== false
  };
}

async function setSetting(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

function getExceptionsFromString(value) {
  return String(value || "")
    .replace(/ /g, "")
    .split(/,|\n/)
    .filter(Boolean);
}

function isException(url, exceptions) {
  return exceptions.some(exception => url.search(exception) !== -1);
}

async function setIcon(isDark, tabId) {
  const file = "icon38" + (isDark ? "" : "-light") + ".png";

  try {
    await chrome.action.setIcon({
      tabId,
      path: chrome.runtime.getURL(file)
    });
  } catch {
    await chrome.action.setIcon({
      path: chrome.runtime.getURL(file)
    });
  }
}

async function toggleClient(tab, skipExclusion = false) {
  if (!tab || !tab.id) return;

  chrome.tabs.sendMessage(
    tab.id,
    { type: "com.rileyjshaw.dte__TOGGLE" },
    async response => {
      if (!response) return;

      if (skipExclusion) {
        await setIcon(response.isDark, tab.id);
      } else {
        await handleManualToggle(response, tab.id);
      }
    }
  );
}

async function handleManualToggle(response, tabId) {
  const url = response.url;
  const isDark = response.isDark;

  const toStrip = /(?:.*:\/\/)?(?:www\.)?(.*?)\/*$/;
  const settings = await getSettings();
  const exceptions = getExceptionsFromString(settings.exceptions);

  const newExceptions = isException(url, exceptions)
    ? exceptions.filter(exception => {
        return exception.replace(toStrip, "$1") !== url.replace(toStrip, "$1");
      })
    : exceptions.concat(url);

  await setSetting("exceptions", newExceptions.join("\n"));
  await setIcon(isDark, tabId);
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(null);
  await chrome.storage.local.set({
    theme: existing.theme || DEFAULTS.theme,
    exceptions: existing.exceptions || DEFAULTS.exceptions,
    darken: existing.darken === false ? false : true
  });
});

chrome.action.onClicked.addListener(tab => {
  toggleClient(tab, false);
});

chrome.runtime.onMessage.addListener((request, sender) => {
  if (!request || request.type !== "com.rileyjshaw.dte__READY" || !sender.tab) {
    return;
  }

  (async () => {
    const settings = await getSettings();
    const exceptions = getExceptionsFromString(settings.exceptions);

    const isDark =
      isException(sender.url || "", exceptions) !== (settings.theme === "dark");

    await setIcon(isDark, sender.tab.id);

    if (!isDark) {
      await toggleClient(sender.tab, true);
    }

    if (!settings.darken) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "com.rileyjshaw.dte__REMOVE_MEDIA_FILTERS"
      });
    }
  })();
});