const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createServer } = require("../server");

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test("serves Footprints and its offline route data", async () => {
  const page = await fetch(baseUrl);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /text\/html/);
  assert.match(await page.text(), /Footprints/);

  const data = await fetch(`${baseUrl}/metro-data.js`);
  assert.equal(data.status, 200);
  assert.match(await data.text(), /Noida Sector 62/);
});

test("blocks path traversal and unsupported request methods", async () => {
  const traversal = await fetch(`${baseUrl}/%2e%2e%2fREADME.md`);
  assert.equal(traversal.status, 403);

  const unsupported = await fetch(baseUrl, { method: "POST" });
  assert.equal(unsupported.status, 405);
});
