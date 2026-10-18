const assert = require("node:assert/strict");
const { test } = require("node:test");
const { stations, lines, interchanges } = require("../metro-data");
const { createRouter } = require("../routing");

const router = createRouter({ stations, lines, interchanges });

test("plans a Noida Sector 62 to Lajpat Nagar trip with an explicit Pink Line interchange", () => {
  const start = router.findStation("Noida Sector 62");
  const end = router.findStation("Lajpat Nagar");
  const route = router.shortestRoute(start.id, end.id);
  const groups = router.groupJourney(route);

  assert.ok(route);
  assert.equal(route.start, "noida-sec-62");
  assert.equal(route.end, "lajpat-nagar");
  assert.deepEqual(
    groups.filter(group => group.kind === "transfer").map(group => group.stationId),
    ["mayur-vihar-1"]
  );
  assert.deepEqual(
    [...new Set(groups.filter(group => group.kind === "ride").map(group => group.lineId))],
    ["blue", "pink"]
  );
  assert.equal(router.summarize(route).interchangesCount, 1);
});

test("includes the signed walking interchange between Noida Sector 52 and Sector 51", () => {
  const route = router.shortestRoute("noida-sec-52", "noida-sec-51");
  const groups = router.groupJourney(route);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, "walk");
  assert.equal(groups[0].link.minutes, 7);
  assert.match(groups[0].link.instruction, /pedestrian link/i);
});

test("guides Noida Sector 62 to Greater Noida via the Sector 52–51 walking interchange", () => {
  const route = router.shortestRoute("noida-sec-62", "depot-station");
  const groups = router.groupJourney(route);

  assert.ok(route);
  assert.ok(groups.some(group => group.kind === "walk" && group.from === "noida-sec-52" && group.to === "noida-sec-51"));
  assert.ok(groups.some(group => group.kind === "ride" && group.lineId === "aqua"));
  assert.equal(router.summarize(route).interchangesCount, 1);
});

test("handles invalid station names and a same-station journey", () => {
  assert.equal(router.findStation("Not a station"), null);
  assert.equal(router.shortestRoute("noida-sec-62", "not-a-station"), null);
  const route = router.shortestRoute("noida-sec-52", "noida-sec-52");
  assert.deepEqual(route.visitedStationIds, ["noida-sec-52"]);
  assert.equal(router.summarize(route).rides, 0);
});

test("every station in the beta dataset belongs to a connected route", () => {
  const start = router.findStation("Noida Sector 62");
  for (const station of stations) {
    assert.ok(router.shortestRoute(start.id, station.id), `${station.name} should be connected`);
  }
  for (const line of lines) {
    for (const branch of line.branches || [line.stations]) {
      for (const stationId of branch) assert.ok(router.stationById.has(stationId), `${line.name} references ${stationId}`);
    }
  }
});
