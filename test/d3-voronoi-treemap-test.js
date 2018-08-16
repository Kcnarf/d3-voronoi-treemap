var tape = require("tape"),
  d3VoronoiTreemap = require('../build/d3-voronoi-treemap');

tape("voronoiTreemap(...) should set the expected defaults", function (test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap(),
    rootNode = {
      value: 1
    };

  test.equal(voronoiTreemap.convergenceRatio(), 0.01);
  test.equal(voronoiTreemap.maxIterationCount(), 50);
  test.equal(voronoiTreemap.minWeightRatio(), 0.01);
  test.deepEqual(voronoiTreemap.clip(), [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0]
  ]);
  test.end();
});

tape("voronoiTreemap.clip(...) should set the adequate convex, hole-free, counterclockwise clipping polygon", function (test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap(),
    newClip = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1]
    ]; //self-intersecting polygon

  test.equal(voronoiTreemap.clip(newClip), voronoiTreemap);
  test.deepEqual(voronoiTreemap.clip(), [
    [1, 1],
    [1, 0],
    [0, 0],
    [0, 1]
  ]);
  test.end();
});

tape("voronoiTreemap.convergenceRatio(...) should set the specified convergence treshold", function (test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap();

  test.equal(voronoiTreemap.convergenceRatio(0.001), voronoiTreemap);
  test.equal(voronoiTreemap.convergenceRatio(), 0.001);
  test.end();
});

tape("voronoiTreemap.maxIterationCount(...) should set the specified allowed number of iterations", function (test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap();

  test.equal(voronoiTreemap.maxIterationCount(100), voronoiTreemap);
  test.equal(voronoiTreemap.maxIterationCount(), 100);
  test.end();
});

tape("voronoiTreemap.minWeightRatio(...) should set the specified ratio", function (test) {
  var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap();

  test.equal(voronoiTreemap.minWeightRatio(0.001), voronoiTreemap);
  test.equal(voronoiTreemap.minWeightRatio(), 0.001);
  test.end();
});

tape("voronoiTreemap.minWeightRatio(...) should set the specified prng", function (test) {
  var myprng = function () {
      return Math.random();
    },
    voronoiTreemap = d3VoronoiTreemap.voronoiTreemap();

  test.equal(voronoiTreemap.prng(myprng), voronoiTreemap);
  test.equal(voronoiTreemap.prng(), myprng);
  test.end();
});

tape("voronoiTreemap.(...) should compute Voronoï treemap", function (test) {
  test.test("basic use case", function (test) {
    var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap().maxIterationCount(1),
      rootNode = {
        value: 3,
        depth: 0,
        height: 1,
        parent: null,
        data: {
          weight: 3
        }
      },
      node0 = {
        value: 1,
        depth: 1,
        height: 0,
        parent: rootNode,
        data: {
          weight: 1
        }
      },
      node1 = {
        value: 2,
        depth: 1,
        height: 0,
        parent: rootNode,
        data: {
          weight: 2
        }
      };

    rootNode.children = [node0, node1];

    voronoiTreemap(rootNode);

    test.ok(rootNode.polygon);
    test.ok(node0.polygon);
    test.ok(node1.polygon);
    test.end();
  });

  test.test("multiple levels", function (test) {
    var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap().maxIterationCount(1),
      rootNode = {
        value: 3,
        depth: 0,
        height: 1,
        parent: null,
        data: {
          weight: 3
        }
      },
      node0 = {
        value: 1,
        depth: 1,
        height: 0,
        parent: rootNode,
        data: {
          weight: 1
        }
      },
      node1 = {
        value: 2,
        depth: 1,
        height: 1,
        parent: rootNode,
        data: {
          weight: 2
        }
      },
      node10 = {
        value: 1,
        depth: 2,
        height: 0,
        parent: node1,
        data: {
          weight: 1
        }
      },
      node11 = {
        value: 1,
        depth: 2,
        height: 0,
        parent: node1,
        data: {
          weight: 1
        }
      };

    rootNode.children = [node0, node1];
    node1.children = [node10, node11];

    voronoiTreemap(rootNode);

    test.ok(rootNode.polygon);
    test.ok(node0.polygon);
    test.ok(node1.polygon);
    test.ok(node10.polygon);
    test.ok(node11.polygon);
    test.end();
  });

  test.test("with only 1 child", function (test) {
    var voronoiTreemap = d3VoronoiTreemap.voronoiTreemap().maxIterationCount(1),
      rootNode = {
        value: 3,
        depth: 0,
        height: 1,
        parent: null,
        data: {
          weight: 1
        }
      },
      node0 = {
        value: 1,
        depth: 1,
        height: 1,
        parent: rootNode,
        data: {
          weight: 1
        }
      },
      node00 = {
        value: 1,
        depth: 2,
        height: 0,
        parent: rootNode,
        data: {
          weight: 1
        }
      };

    rootNode.children = [node0];
    node0.children = [node00];

    voronoiTreemap(rootNode);

    test.ok(rootNode.polygon);
    test.ok(node0.polygon);
    test.ok(node00.polygon);
    test.end();
  });
});