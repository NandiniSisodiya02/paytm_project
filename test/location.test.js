import test from "node:test";
import assert from "node:assert/strict";
import { findNearbyRouteStop, findNearestStation } from "../src/utils/location.js";

const stations = [
  { id: "start", name: "Start", lat: 28.6, lon: 77.3 },
  { id: "middle", name: "Middle", lat: 28.61, lon: 77.31 },
  { id: "end", name: "End", lat: 28.62, lon: 77.32 }
];
const stationById = new Map(stations.map(station => [station.id, station]));
const route = { visitedStationIds: stations.map(station => station.id) };

test("finds the nearest station in meters", () => {
  const nearest = findNearestStation({ lat: 28.6001, lon: 77.3001 }, stations);
  assert.equal(nearest.station.id, "start");
  assert.ok(nearest.distance < 20);
});

test("only advances to a nearby route stop with an accurate GPS fix", () => {
  const nearby = findNearbyRouteStop({ ...stations[1], accuracy: 30 }, route, stationById, 1);
  assert.equal(nearby.station.id, "middle");
  assert.equal(nearby.index, 1);
  assert.equal(findNearbyRouteStop({ ...stations[2], accuracy: 140 }, route, stationById, 1), null);
  assert.equal(findNearbyRouteStop({ ...stations[2], accuracy: 20 }, route, stationById, 2).index, 2);
  assert.equal(findNearbyRouteStop({ ...stations[1], accuracy: 20 }, route, stationById, 2), null);
});

test("does not mark a stop passed when the user is outside its proximity radius", () => {
  const nearby = findNearbyRouteStop(
    { lat: 28.6115, lon: 77.3115, accuracy: 20 },
    route,
    stationById,
    1
  );
  assert.equal(nearby, null);
});
