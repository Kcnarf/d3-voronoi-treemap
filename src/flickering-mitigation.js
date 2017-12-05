
export function FlickeringMitigation () {
  /////// Inputs ///////
  this.lastAreaError = NaN;
  this.secondToLastAreaError = NaN;
  this.lastGrowth = NaN;
  this.secondToLastGrowth = NaN;
  this.growthChanges = [];
  this.growthChangesLength = 10;
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
  this.lastAreaError = NaN;
  this.secondToLastAreaError = NaN;
  this.lastGrowth = NaN;
  this.secondToLastGrowth = NaN;
  this.growthChanges = [];
  this.growthChangesLength = 10;
  this.totalAvailableArea = NaN;
  
  return this;
};

FlickeringMitigation.prototype.clear = function () {
  this.lastAreaError = NaN;
  this.secondToLastAreaError = NaN;
  this.lastGrowth = NaN;
  this.secondToLastGrowth = NaN;
  this.growthChanges = [];
  
  return this;
};

FlickeringMitigation.prototype.length = function (_) {
  if (!arguments.length) { return this.growthChangesLength; }
  
  this.growthChangesLength = _;
  return this;
};

FlickeringMitigation.prototype.totalArea = function (_) {
  if (!arguments.length) { return this.totalAvailableArea; }
  
  this.totalAvailableArea = _;
  return this;
};

FlickeringMitigation.prototype.add = function (areaError) {
  this.secondToLastAreaError = this.lastAreaError;
  this.lastAreaError = areaError;
  if (!isNaN(this.secondToLastAreaError)) {
    this.secondToLastGrowth = this.lastGrowth;
    this.lastGrowth = direction(this.lastAreaError, this.secondToLastAreaError);
  }
  if (!isNaN(this.secondToLastGrowth)) {
    this.growthChanges.unshift(this.lastGrowth!=this.secondToLastGrowth);
  }

  if (this.growthChanges.length>this.growthChangesLength) {
    this.growthChanges.pop();
  }
  return this;
};

FlickeringMitigation.prototype.ratio = function () {
  var weightedChangeCount = 0,
      weightedTotalCount = 0,
      indexedWeight = this.initialIndexWeight;
  var ratio;

  if (this.growthChanges.length < this.growthChangesLength) { return 0; }
  if (this.lastAreaError > this.totalAvailableArea/10) { return 0; }

  for(var i=0; i<this.growthChangesLength; i++) {
    if (this.growthChanges[i]) {
      weightedChangeCount += indexedWeight;
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