!function (global) {
	var theme = document.getElementById('theme');
	var exceptions = document.getElementById('exceptions');
	var darken = document.getElementById('darken');

	theme.value = global.localStorage.getItem('theme');
	exceptions.value = global.localStorage.getItem('exceptions');
	darken.checked = global.localStorage.getItem('darken') === 'true';

	function bindToLocalStorage(key, cb, attribute) {
		return function (e) {
			var value = e.target[attribute || 'value'];
			global.localStorage.setItem(key, value);
			if (cb) cb(value);
		};
	}

	function setStyles(theme) {
		document.documentElement.classList[
			(theme === 'light' ? 'add' : 'remove')]('dark-theme-everywhere-off');
	}

	theme.addEventListener('change', bindToLocalStorage('theme', setStyles));
	exceptions.addEventListener('change', bindToLocalStorage('exceptions'));
	exceptions.addEventListener('keyup', bindToLocalStorage('exceptions'));
	darken.addEventListener(
		'change', bindToLocalStorage('darken', undefined, 'checked'));

	setStyles(theme.value);
}(this);
