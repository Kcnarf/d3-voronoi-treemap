var tape = require("tape"),
    flickeringMitigation = require('../build/flickering-mitigation');

tape("flickeringMitigation(...) should set the expected defaults", function(test) {
  var fm = new flickeringMitigation.FlickeringMitigation();

  test.equal(fm.length(), 10);
  test.ok(isNaN(fm.totalArea()));
  test.ok(isNaN(fm.lastAreaError));
  test.ok(isNaN(fm.secondToLastAreaError));
  test.ok(isNaN(fm.lastGrowth));
  test.ok(isNaN(fm.secondToLastGrowth));
  test.equal(fm.growthChanges.length, 0);
  test.equal(fm.growthChangesLength, 10);
  test.ok(isNaN(fm.totalArea));
  test.end();
});

tape("flickeringMitigation.reset(...) should reset to expected defaults", function(test) {
  var fm = new flickeringMitigation.FlickeringMitigation();

  fm.length(4).totalArea(1000).add(1).add(2).add(3).add(4);
  test.equal(fm.reset(), fm);
  test.equal(fm.length(), 10);
  test.ok(isNaN(fm.totalArea()));
  test.ok(isNaN(fm.lastAreaError));
  test.ok(isNaN(fm.secondToLastAreaError));
  test.ok(isNaN(fm.lastGrowth));
  test.ok(isNaN(fm.secondToLastGrowth));
  test.equal(fm.growthChanges.length, 0);
  test.equal(fm.growthChangesLength, 10);
  test.ok(isNaN(fm.totalArea));
  test.end();
});

tape("flickeringMitigation.clear(...) should empty memorizations", function(test) {
  var fm = new flickeringMitigation.FlickeringMitigation();

  fm.length(2).totalArea(1000).add(1).add(2).add(3).add(4);
  test.equal(fm.clear(), fm);
  test.equal(fm.length(), 2);
  test.ok(fm.totalArea(), 1000);
  test.ok(isNaN(fm.lastAreaError));
  test.ok(isNaN(fm.secondToLastAreaError));
  test.ok(isNaN(fm.lastGrowth));
  test.ok(isNaN(fm.secondToLastGrowth));
  test.equal(fm.growthChanges.length, 0);
  test.equal(fm.growthChangesLength, 2);
  test.end();
});

tape("flickeringMitigation.length(...) should set the specified memorizations' length", function(test) {
  var fm = new flickeringMitigation.FlickeringMitigation();

  test.equal(fm.length(20), fm);
  test.equal(fm.length(), 20);
  test.equal(fm.growthChangesLength, 20);
  test.end();
});

tape("flickeringMitigation.totalArea(...) should set the specified total available area", function(test) {
  var fm = new flickeringMitigation.FlickeringMitigation();

  test.equal(fm.totalArea(10), fm);
  test.equal(fm.totalArea(), 10);
  test.end();
});

tape("flickeringMitigation.add(...)", function(test) {
  test.test("flickeringMitigation.add(...) should handle a queue", function(test) {
    var fm = new flickeringMitigation.FlickeringMitigation();

    test.equal(fm.add(1), fm);
    test.equal(fm.lastAreaError, 1);
    test.ok(isNaN(fm.secondToLastAreaError));
    test.ok(isNaN(fm.lastGrowth));
    test.ok(isNaN(fm.secondToLastGrowth));
    test.equal(fm.growthChanges.length, 0);
    fm.add(2);
    test.equal(fm.lastAreaError, 2);
    test.equal(fm.secondToLastAreaError, 1);
    test.equal(fm.lastGrowth, 1);
    test.ok(isNaN(fm.secondToLastGrowth));
    test.equal(fm.growthChanges.length, 0);
    fm.add(1);
    test.equal(fm.lastAreaError, 1);
    test.equal(fm.secondToLastAreaError, 2);
    test.equal(fm.lastGrowth, -1);
    test.equal(fm.secondToLastGrowth, 1);
    test.equal(fm.growthChanges.length, 1);
    test.equal(fm.growthChanges[0], true);
    fm.add(0)
    test.equal(fm.lastAreaError, 0);
    test.equal(fm.secondToLastAreaError, 1);
    test.equal(fm.lastGrowth, -1);
    test.equal(fm.secondToLastGrowth, -1);
    test.equal(fm.growthChanges.length, 2);
    test.equal(fm.growthChanges[0], false);
    test.equal(fm.growthChanges[1], true);
    test.end();
  });

  test.test("flickeringMitigation.add(...) should maintain queue's length", function(test) {
    var fm = new flickeringMitigation.FlickeringMitigation();

    fm.length(2).add(1).add(2).add(3).add(4);
    test.equal(fm.growthChanges.length, 2);
    fm.add(5);
    test.equal(fm.growthChanges.length, 2);
    test.end();
  });
});

tape("flickeringMitigation.ratio(...)", function(test) {
  test.test("flickeringMitigation.ratio(...) should return 0 if not enought memorizations", function(test) {
    var fm = new flickeringMitigation.FlickeringMitigation();

    fm.add(1).add(2).add(1);
    test.equal(fm.ratio(), 0);
    test.end();
  });

  test.test("flickeringMitigation.ratio(...) should return 0 if current area arror is large enought", function(test) {
    var fm = new flickeringMitigation.FlickeringMitigation();

    fm.length(2).totalArea(5).add(1).add(2).add(1).add(2).add(1);
    test.equal(fm.ratio(), 0);
    test.end();
  });
  
  test.test("flickeringMitigation.ratio(...) should compute adequate ratio", function(test) {
    var fm = new flickeringMitigation.FlickeringMitigation(),
        wtc = 3+2; // changes' weight are [3,2]

    fm.length(2).totalArea(1000);
    test.equal(fm.clear().add(1).add(2).add(3).add(4).ratio(), 0/wtc);  // no change
    test.equal(fm.clear().add(4).add(3).add(2).add(1).ratio(), 0/wtc);  // no change
    test.equal(fm.clear().add(1).add(2).add(3).add(2).ratio(), 3/wtc);  // 1 (down) change at first pos
    test.equal(fm.clear().add(4).add(3).add(2).add(3).ratio(), 3/wtc);  // 1 (up) change at first pos
    test.equal(fm.clear().add(2).add(3).add(2).add(1).ratio(), 2/wtc);  // 1 (down) change at second pos
    test.equal(fm.clear().add(3).add(2).add(3).add(4).ratio(), 2/wtc);  // 1 (up) change at second pos
    test.equal(fm.clear().add(4).add(3).add(4).add(3).ratio(), (3+2)/wtc);  // 2 changes (up, down)
    test.equal(fm.clear().add(1).add(2).add(1).add(2).ratio(), (3+2)/wtc);  // 2 changes (down, up)
    test.end();
  });
  
});