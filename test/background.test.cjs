const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture (initial = {}, legacy = {}, firefox = false) {
  const data = structuredClone(initial), lifecycle = {created: 0, closed: 0};
  let message, click;
  const states = new Map([[1, {url: 'https://google.com/'}], [2, {url: 'https://google.org/'}]]);
  const chrome = {runtime: {getURL: name => `chrome-extension://test/${name}`, getContexts: async () => [],
    sendMessage: async () => ({theme: null, exceptions: null, darken: null, ...legacy}),
    onMessage: {addListener: callback => { message = callback; }}, onInstalled: {addListener() {}}},
    offscreen: {createDocument: async () => { lifecycle.created++; }, closeDocument: async () => { lifecycle.closed++; }},
    storage: {local: {get: async defaults => ({...(defaults || {}), ...structuredClone(data)}),
      set: async value => Object.assign(data, structuredClone(value))}, onChanged: {addListener() {}}},
    action: {onClicked: {addListener: callback => { click = callback; }}, setIcon() {}},
    tabs: {sendMessage: async id => states.get(id), query: async () => []}};
  const context = {chrome, URL, console};
  if (firefox) context.localStorage = {getItem: key => legacy[key] ?? null};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../background.js'), 'utf8'), context);
  return {data, chrome, lifecycle, click, request: (request, sender = {url: 'chrome-extension://test/options.html', tab: {id: 20}}) => new Promise(resolve => message(request, sender, resolve))};
}

test('Chrome imports old settings before the first content-script response', async () => {
  const f = fixture({}, {theme: 'light', exceptions: 'private.example', darken: 'false'});
  const response = await f.request({type: 'dark-theme-everywhere:ready'}, {tab: {id: 1}, frameId: 0, url: 'https://other.example/'});
  assert.equal(response.isDark, false);
  assert.equal(response.darkenMedia, false);
  assert.equal(f.data.exceptions, 'private.example');
  assert.deepEqual(f.lifecycle, {created: 1, closed: 1});
});

test('existing MV3 settings win over legacy preferences and migration runs once', async () => {
  const f = fixture({theme: 'dark', exceptions: '', darken: true}, {theme: 'light', exceptions: 'old.example', darken: 'false'});
  await Promise.all([f.request({type: 'dark-theme-everywhere:get-settings'}), f.request({type: 'dark-theme-everywhere:get-settings'})]);
  assert.equal(f.data.theme, 'dark');
  assert.equal(f.data.exceptions, '');
  assert.equal(f.data.darken, true);
  assert.equal(f.lifecycle.created, 1);
});

test('Firefox migrates directly without the Chrome-only offscreen API', async () => {
  const f = fixture({}, {theme: 'light'}, true);
  delete f.chrome.offscreen;
  const settings = await f.request({type: 'dark-theme-everywhere:get-settings'});
  assert.equal(settings.theme, 'light');
  assert.equal(f.lifecycle.created, 0);
});

test('toolbar clicks preserve broad rules and concurrent site choices', async () => {
  const f = fixture({storageVersion: 1, theme: 'dark', exceptions: 'google'});
  f.click({id: 1}); f.click({id: 2});
  await tick(); await tick();
  assert.equal(f.data.exceptions, 'google');
  assert.deepEqual(f.data.siteOverrides, {'google.com': true, 'google.org': true});
  f.click({id: 1});
  await tick();
  assert.deepEqual(f.data.siteOverrides, {'google.org': true});
});

test('failed migration is retryable and never marks settings as migrated', async () => {
  const f = fixture();
  f.chrome.runtime.sendMessage = async () => { throw new Error('offscreen unavailable'); };
  assert((await f.request({type: 'dark-theme-everywhere:get-settings'})).error);
  assert.equal(f.data.storageVersion, undefined);
  f.chrome.runtime.sendMessage = async () => ({theme: 'light', exceptions: null, darken: null});
  assert.equal((await f.request({type: 'dark-theme-everywhere:get-settings'})).theme, 'light');
  assert.equal(f.lifecycle.closed, 2);
});
