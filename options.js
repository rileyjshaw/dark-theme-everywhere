!function (global) {
	var theme = document.getElementById('theme');
	var exceptions = document.getElementById('exceptions');

	theme.value = global.localStorage.getItem('theme');
	exceptions.value = global.localStorage.getItem('exceptions');

	function bindToLocalStorage(key, cb) {
		return function (e) {
			var value = e.target.value;
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

	setStyles(theme.value);
}(this);
