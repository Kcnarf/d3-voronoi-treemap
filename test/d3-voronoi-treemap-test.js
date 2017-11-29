var tape = require("tape"),
    d3VoronoiTreemap = require('../build/d3-voronoi-treemap');

tape("voronoiTreemap(...) should set the expected defaults", function(test) {
var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap(),
    datum = {weight: 3};

test.equal(voronoiTreemap.weight()(datum), 3);
test.equal(voronoiTreemap.convergenceTreshold(), 0.01);
test.deepEqual(voronoiTreemap.clip(), [[0,0], [0,1], [1,1], [1,0]]);
test.end();
});