const EARTH_RADIUS_METERS = 6_371_000;

export function distanceInMeters(first, second) {
  const radians = degrees => degrees * Math.PI / 180;
  const latitudeDelta = radians(second.lat - first.lat);
  const longitudeDelta = radians(second.lon - first.lon);
  const latitudeA = radians(first.lat);
  const latitudeB = radians(second.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function findNearestStation(position, stations) {
  let nearest = null;
  for (const station of stations) {
    const distance = distanceInMeters(position, station);
    if (!nearest || distance < nearest.distance) nearest = { station, distance };
  }
  return nearest;
}

export function findNearbyRouteStop(position, route, stationById, currentIndex, maxDistance = 150) {
  if (!position || position.accuracy > 100) return null;
  let nearest = null;

  for (let index = currentIndex; index < route.visitedStationIds.length; index += 1) {
    const station = stationById.get(route.visitedStationIds[index]);
    if (!station) continue;
    const distance = distanceInMeters(position, station);
    if (distance <= maxDistance && (!nearest || distance < nearest.distance)) {
      nearest = { station, index, distance };
    }
  }
  return nearest;
}
