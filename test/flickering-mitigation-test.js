var tape = require("tape"),
    flickeringMitigation = require('../build/flickering-mitigation');

tape("flickeringMitigation(...) should set the expected defaults", function(test) {
  var fm = new flickeringMitigation.FlickeringMitigation();

  test.equal(fm.length(), 10);
  test.ok(isNaN(fm.totalArea()));
  test.equal(fm.history.length, 0);
  test.end();
});

tape("flickeringMitigation.reset(...) should reset to expected defaults", function(test) {
  var fm = new flickeringMitigation.FlickeringMitigation();

  fm.length(3).totalArea(1000).add(1);
  test.equal(fm.reset(), fm);
  test.equal(fm.length(), 10);
  test.ok(isNaN(fm.totalArea()));
  test.equal(fm.history.length, 0);
  test.end();
});

tape("flickeringMitigation.clear(...) should empty history", function(test) {
  var fm = new flickeringMitigation.FlickeringMitigation();

  fm.length(3).totalArea(1000).add(1);
  test.equal(fm.clear(), fm);
  test.equal(fm.length(), 3);
  test.ok(fm.totalArea(), 1000);
  test.equal(fm.history.length, 0);
  test.end();
});

tape("flickeringMitigation.length(...) should set the specified history's length", function(test) {
  var fm = new flickeringMitigation.FlickeringMitigation();

  test.equal(fm.length(20), fm);
  test.equal(fm.length(), 20);
  test.end();
});

tape("flickeringMitigation.totalArea(...) should set the specified total available area", function(test) {
  var fm = new flickeringMitigation.FlickeringMitigation();

  test.equal(fm.totalArea(10), fm);
  test.equal(fm.totalArea(), 10);
  test.end();
});

tape("flickeringMitigation.add(...)", function(test) {
  test.test("flickeringMitigation.add(...) should be a queue", function(test) {
    var fm = new flickeringMitigation.FlickeringMitigation();

    test.equal(fm.add(1), fm);
    test.equal(fm.history[0], 1);
    fm.add(2);
    test.equal(fm.history.length, 2);
    test.equal(fm.history[0], 2);
    test.equal(fm.history[1], 1);
    test.end();
  });

  test.test("flickeringMitigation.add(...) should maintain histoy's length", function(test) {
    var fm = new flickeringMitigation.FlickeringMitigation();

    fm.length(3).add(1).add(2).add(3);
    test.equal(fm.history.length, 3);
    test.equal(fm.add(4).length(), 3);
    test.end();
  });
});

tape("flickeringMitigation.ratio(...)", function(test) {
  test.test("flickeringMitigation.ratio(...) should return 0 if not enought history", function(test) {
    var fm = new flickeringMitigation.FlickeringMitigation();

    fm.add(1).add(2).add(1);
    test.equal(fm.ratio(), 0);
    test.end();
  });

  test.test("flickeringMitigation.ratio(...) should return 0 if current area arror is large enought", function(test) {
    var fm = new flickeringMitigation.FlickeringMitigation();

    fm.length(3).totalArea(5).add(1).add(2).add(1);
    test.equal(fm.ratio(), 0);
    test.end();
  });
  
  test.test("flickeringMitigation.ratio(...) should compute adequate ratio", function(test) {
    var fm = new flickeringMitigation.FlickeringMitigation(),
        wtc = 3+2; // weightedTotalCount, cf. flickeringMitigation's configuration

    fm.length(4).totalArea(1000);
    test.equal(fm.add(1).add(2).add(3).add(4).ratio(), 0/wtc);  // no change
    test.equal(fm.add(4).add(3).add(2).add(1).ratio(), 0/wtc);  // no change
    test.equal(fm.add(1).add(2).add(3).add(2).ratio(), 3/wtc);  // 1 change at first pos
    test.equal(fm.add(4).add(3).add(2).add(3).ratio(), 3/wtc);  // 1 change at first pos
    test.equal(fm.add(2).add(3).add(2).add(1).ratio(), 2/wtc);  // 1 change at second pos
    test.equal(fm.add(3).add(2).add(3).add(4).ratio(), 2/wtc);  // 1 change at second pos
    test.equal(fm.add(4).add(3).add(4).add(3).ratio(), (3+2)/wtc);  // 2 changes
    test.equal(fm.add(1).add(2).add(1).add(2).ratio(), (3+2)/wtc);  // 2 changes
    test.end();
  });
  
});