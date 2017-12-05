
export function FlickeringMitigation () {
  /////// Inputs ///////
  this.history = [];
  this.directions = [];
  this.historyLength = 10;
  this.directionLength = this.historyLength-1;
  this.totalAvailableArea = NaN;
  
  //begin: configuration (ie. magic numbers) making recent changes weighter than olders
  this.initialIndexWeight = 3;
  this.indexWeightDecrement = 1;
  //end configuration (ie. magic numbers) making recent changes weighter than olders

  ///////////////////////
  ///////// API /////////
  ///////////////////////
}

function direction(h0, h1) {
  return (h0 >= h1)? 1 : -1;
}

FlickeringMitigation.prototype.reset = function () {
  this.history = [];
  this.directions = [];
  this.historyLength = 10;
  this.directionLength = this.historyLength-1;
  this.totalAvailableArea = NaN;
  
  return this;
};

FlickeringMitigation.prototype.clear = function () {
  this.history = [];
  this.directions = [];
  
  return this;
};

FlickeringMitigation.prototype.length = function (_) {
  if (!arguments.length) { return this.historyLength; }
  
  this.historyLength = _;
  this.directionLength = this.historyLength-1;
  return this;
};

FlickeringMitigation.prototype.totalArea = function (_) {
  if (!arguments.length) { return this.totalAvailableArea; }
  
  this.totalAvailableArea = _;
  return this;
};

FlickeringMitigation.prototype.add = function (areaError) {
  this.history.unshift(areaError);
  if (this.history.length>1) {
    this.directions.unshift(direction(areaError, this.history[1]));
  }

  if (this.history.length>this.historyLength) {
    this.history.pop();
    this.directions.pop();
  }
  return this;
};

FlickeringMitigation.prototype.ratio = function () {
  var weightedChangeCount = 0,
      weightedTotalCount = 0,
      indexedWeight = this.initialIndexWeight;
  var d, ratio;

  if (this.history.length < this.historyLength) { return 0; }
  if (this.history[0] > this.totalAvailableArea/10) { return 0; }

  d = this.directions[0];
  for(var i=0; i<this.directionLength-1; i++) {
    if (d != this.directions[i+1]) {
      weightedChangeCount += indexedWeight;
      d = -d;
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