(async function () {
  const DEFAULTS = {
    theme: "dark",
    exceptions: "",
    darken: true
  };

  const theme = document.getElementById("theme");
  const exceptions = document.getElementById("exceptions");
  const darken = document.getElementById("darken");

  const settings = await chrome.storage.local.get(DEFAULTS);

  theme.value = settings.theme === "light" ? "light" : "dark";
  exceptions.value = settings.exceptions || "";
  darken.checked = settings.darken !== false;

  function setStyles(value) {
    document.documentElement.classList[
      value === "light" ? "add" : "remove"
    ]("dark-theme-everywhere-off");
  }

  async function save(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  theme.addEventListener("change", async event => {
    const value = event.target.value;
    await save("theme", value);
    setStyles(value);
  });

  exceptions.addEventListener("change", async event => {
    await save("exceptions", event.target.value);
  });

  exceptions.addEventListener("keyup", async event => {
    await save("exceptions", event.target.value);
  });

  darken.addEventListener("change", async event => {
    await save("darken", event.target.checked);
  });

  setStyles(theme.value);
})();