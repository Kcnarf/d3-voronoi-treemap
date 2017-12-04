
export function FlickeringMitigation () {
  /////// Inputs ///////
  this.history = [];
  this.historyLength = 10;
  this.totalAvailableArea = NaN;

  //begin: configuration (ie. magic numbers)
  this.initialIndexWeight = 3;
  this.indexWeightDecrement = 1;
  //end configuration (ie. magic numbers)

  ///////////////////////
  ///////// API /////////
  ///////////////////////
}

FlickeringMitigation.prototype.reset = function () {
  this.history = [];
  this.historyLength = 10;
  this.totalAvailableArea = NaN;
  
  return this;
};

FlickeringMitigation.prototype.clear = function () {
  this.history = [];
  
  return this;
};

FlickeringMitigation.prototype.length = function (_) {
  if (!arguments.length) { return this.historyLength; }
  
  this.historyLength = _;
  return this;
};

FlickeringMitigation.prototype.totalArea = function (_) {
  if (!arguments.length) { return this.totalAvailableArea; }
  
  this.totalAvailableArea = _;
  return this;
};

FlickeringMitigation.prototype.add = function (areaError) {
  this.history.unshift(areaError);
  if (this.history.length>this.historyLength) {
    this.history.pop();
  }
  return this;
};

FlickeringMitigation.prototype.ratio = function () {
  var weightedChangeCount = 0,
      weightedTotalCount = 0,
      indexedWeight = this.initialIndexWeight;
  var error0, error1, direction, ratio;

  if (this.history.length < this.historyLength) { return 0; }
  if (this.history[0] > this.totalAvailableArea/10) { return 0; }

  error0 = this.history[0];
  error1 = this.history[1];
  direction = (error0 - error1) > 0;

  for(var i=0; i<this.historyLength-2; i++) {
    error0 = error1;
    error1 = this.history[i+2];
    if (((error0-error1)>0) != direction) {
      weightedChangeCount += indexedWeight;
      direction = !direction;
    }
    weightedTotalCount += indexedWeight;
    indexedWeight -= this.indexWeightDecrement;
    if (indexedWeight<1) {
      indexedWeight = 1;
    }
  }

  ratio = weightedChangeCount/weightedTotalCount;

  if (ratio>0) {
    console.log("flickering mitigation ratio: "+Math.floor(ratio*1000)/1000);
  }

  return ratio;
};