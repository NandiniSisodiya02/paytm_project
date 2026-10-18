(function (root) {
  function createRouter({ stations, lines, interchanges }) {
    const stationById = new Map(stations.map(station => [station.id, station]));
    const stationByName = new Map(stations.map(station => [station.name.toLocaleLowerCase(), station]));
    const lineById = new Map(lines.map(line => [line.id, line]));
    const edges = new Map(stations.map(station => [station.id, []]));
    const addEdge = (from, edge) => edges.get(from).push(edge);

    for (const line of lines) {
      for (const branch of line.branches || [line.stations]) {
        for (let index = 0; index < branch.length - 1; index += 1) {
          const from = branch[index];
          const to = branch[index + 1];
          addEdge(from, { to, lineId: line.id, kind: "ride", weight: 1 });
          addEdge(to, { to: from, lineId: line.id, kind: "ride", weight: 1 });
        }
      }
    }
    for (const link of interchanges) {
      addEdge(link.from, { to: link.to, lineId: null, kind: "walk", weight: link.minutes, link });
      addEdge(link.to, { to: link.from, lineId: null, kind: "walk", weight: link.minutes, link });
    }

    function findStation(value) {
      return stationByName.get(value.trim().toLocaleLowerCase()) || null;
    }

    function shortestRoute(startId, endId) {
      if (!stationById.has(startId) || !stationById.has(endId)) return null;
      if (startId === endId) return { start: startId, end: endId, transitions: [], visitedStationIds: [startId], cost: 0 };
      const distances = new Map();
      const previous = new Map();
      const queue = [];
      const stateKey = (stationId, lineId) => `${stationId}|${lineId || "walk"}`;

      for (const edge of edges.get(startId)) {
        const lineId = edge.kind === "ride" ? edge.lineId : null;
        const key = stateKey(edge.to, lineId);
        if (edge.weight >= (distances.get(key) ?? Infinity)) continue;
        distances.set(key, edge.weight);
        previous.set(key, { key: null, stationId: startId, lineId: null, edge });
        queue.push({ key, stationId: edge.to, lineId, distance: edge.weight });
      }

      let targetKey = null;
      while (queue.length) {
        queue.sort((a, b) => a.distance - b.distance);
        const current = queue.shift();
        if (current.distance !== distances.get(current.key)) continue;
        if (current.stationId === endId) {
          targetKey = current.key;
          break;
        }

        for (const edge of edges.get(current.stationId)) {
          const lineId = edge.kind === "ride" ? edge.lineId : null;
          const transferCost = edge.kind === "walk" ? edge.weight
            : current.lineId && current.lineId !== edge.lineId ? 9 : 0;
          const key = stateKey(edge.to, lineId);
          const distance = current.distance + edge.weight + transferCost;
          if (distance >= (distances.get(key) ?? Infinity)) continue;
          distances.set(key, distance);
          previous.set(key, { key: current.key, stationId: current.stationId, lineId: current.lineId, edge });
          queue.push({ key, stationId: edge.to, lineId, distance });
        }
      }

      if (!targetKey) return null;
      const transitions = [];
      let key = targetKey;
      while (key) {
        const step = previous.get(key);
        if (!step) break;
        transitions.unshift({
          from: step.stationId,
          to: key.split("|")[0],
          fromLine: step.lineId,
          toLine: key.split("|")[1] === "walk" ? null : key.split("|")[1],
          kind: step.edge.kind,
          link: step.edge.link
        });
        key = step.key;
      }
      const visitedStationIds = [startId];
      for (const transition of transitions) {
        if (visitedStationIds[visitedStationIds.length - 1] !== transition.to) visitedStationIds.push(transition.to);
      }
      return { start: startId, end: endId, transitions, visitedStationIds, cost: distances.get(targetKey) };
    }

    function groupJourney(route) {
      const groups = [];
      let activeGroup = null;
      for (const transition of route.transitions) {
        if (transition.kind === "walk") {
          if (activeGroup) {
            activeGroup.stops.push(transition.from);
            activeGroup = null;
          }
          groups.push({ kind: "walk", from: transition.from, to: transition.to, link: transition.link });
          continue;
        }
        if (!activeGroup || activeGroup.lineId !== transition.toLine) {
          if (activeGroup) {
            activeGroup.stops.push(transition.from);
            groups.push({
              kind: "transfer",
              stationId: transition.from,
              fromLine: activeGroup.lineId,
              toLine: transition.toLine
            });
          }
          activeGroup = { kind: "ride", lineId: transition.toLine, stops: [transition.from, transition.to] };
          groups.push(activeGroup);
        } else if (activeGroup.stops[activeGroup.stops.length - 1] !== transition.to) {
          activeGroup.stops.push(transition.to);
        }
      }
      return groups;
    }

    function summarize(route) {
      const rides = route.transitions.filter(transition => transition.kind === "ride").length;
      const interchangesCount = groupJourney(route).filter(group => group.kind === "transfer" || group.kind === "walk").length;
      return {
        rides,
        interchangesCount,
        minutes: Math.max(5, rides * 3 + interchangesCount * 8)
      };
    }

    return { stationById, stationByName, lineById, findStation, shortestRoute, groupJourney, summarize };
  }

  root.FootprintsRouting = { createRouter };
  if (typeof module !== "undefined" && module.exports) module.exports = { createRouter };
})(typeof globalThis !== "undefined" ? globalThis : this);
