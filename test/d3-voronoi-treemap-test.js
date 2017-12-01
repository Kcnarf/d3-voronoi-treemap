var tape = require("tape"),
    d3VoronoiTreemap = require('../build/d3-voronoi-treemap');

tape("voronoiTreemap(...) should set the expected defaults", function(test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap(),
      datum = {weight: 1};

  test.equal(voronoiTreemap.weight()(datum), 1);
  test.equal(voronoiTreemap.convergenceRatio(), 0.01);
  test.equal(voronoiTreemap.maxIterationCount(), 50);
  test.equal(voronoiTreemap.minWeightRatio(), 0.01);
  test.deepEqual(voronoiTreemap.clip(), [[0,0], [0,1], [1,1], [1,0]]);
  test.end();
});

tape("voronoiTreemap.weight(...) should set the specified weight-accessor", function(test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap(),
      datum = {weight: 1, weightPrime: 2};

  test.equal(voronoiTreemap.weight(function(d){ return d.weightPrime; }), voronoiTreemap);
  test.equal(voronoiTreemap.weight()(datum), 2);
  test.end();
});
  
tape("voronoiTreemap.clip(...) should set the adequate convex, hole-free, counterclockwise clipping polygon", function(test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap(),
      newClip = [[0,0], [0,1], [1,0], [1,1]];   //self-intersecting polygon

  test.equal(voronoiTreemap.clip(newClip), voronoiTreemap);
  test.deepEqual(voronoiTreemap.clip(), [[1,1], [1,0], [0,0], [0,1]]);
  test.end();
});

tape("voronoiTreemap.convergenceRatio(...) should set the specified convergence treshold", function(test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap();

  test.equal(voronoiTreemap.convergenceRatio(0.001), voronoiTreemap);
  test.equal(voronoiTreemap.convergenceRatio(), 0.001);
  test.end();
});

tape("voronoiTreemap.maxIterationCount(...) should set the specified allowed number of iterations", function(test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap();

  test.equal(voronoiTreemap.maxIterationCount(100), voronoiTreemap);
  test.equal(voronoiTreemap.maxIterationCount(), 100);
  test.end();
});

tape("voronoiTreemap.minWeightRatio(...) should set the specified ratio", function(test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap();

  test.equal(voronoiTreemap.minWeightRatio(0.001), voronoiTreemap);
  test.equal(voronoiTreemap.minWeightRatio(), 0.001);
  test.end();
});