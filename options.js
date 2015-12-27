!function (global) {
	var select = document.getElementById('theme');
	select.value = global.localStorage.getItem('theme');

	select.addEventListener('change', function (e) {
		global.localStorage.setItem('theme', e.target.value);
	});
}(this);
