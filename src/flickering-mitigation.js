
export function FlickeringMitigation () {
  /////// Inputs ///////
  this.lastAreaError = NaN;
  this.secondToLastAreaError = NaN;
  this.lastGrowth = NaN;
  this.secondToLastGrowth = NaN;
  this.growthChanges = [];
  this.growthChangesLength = 10;
  this.totalAvailableArea = NaN;
  
  //used to make recent changes weighter than older changes
  this.growthChangeWeights = generateGrowthChangeWeights(this.growthChangesLength);
  this.growthChangeWeightsSum = computeGrowthChangeWeightsSum(this.growthChangeWeights);

}

function direction(h0, h1) {
  return (h0 >= h1)? 1 : -1;
}

function generateGrowthChangeWeights(length) {
  var initialWeight = 3;   // a magic number
  var weightDecrement = 1; // a magic number
  var minWeight = 1;
  
  var weightedCount = initialWeight;
  var growthChangeWeights = [];
  
  for (var i=0; i<length; i++) {
    growthChangeWeights.push(weightedCount);
    weightedCount -= weightDecrement;
    if (weightedCount<minWeight) { weightedCount = minWeight; }
  }
  return growthChangeWeights;
}

function computeGrowthChangeWeightsSum (growthChangeWeights) {
  var growthChangeWeightsSum = 0;
  for (var i=0; i<growthChangeWeights.length; i++) {
    growthChangeWeightsSum += growthChangeWeights[i];
  }
  return growthChangeWeightsSum;
}

///////////////////////
///////// API /////////
///////////////////////

FlickeringMitigation.prototype.reset = function () {
  this.lastAreaError = NaN;
  this.secondToLastAreaError = NaN;
  this.lastGrowth = NaN;
  this.secondToLastGrowth = NaN;
  this.growthChanges = [];
  this.growthChangesLength = 10;
  this.growthChangeWeights = generateGrowthChangeWeights(this.growthChangesLength);
  this.growthChangeWeightsSum = computeGrowthChangeWeightsSum(this.growthChangeWeights);
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
  this.growthChangeWeights = generateGrowthChangeWeights(this.growthChangesLength);
  this.growthChangeWeightsSum = computeGrowthChangeWeightsSum(this.growthChangeWeights);
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
  var weightedChangeCount = 0;
  var ratio;

  if (this.growthChanges.length < this.growthChangesLength) { return 0; }
  if (this.lastAreaError > this.totalAvailableArea/10) { return 0; }

  for(var i=0; i<this.growthChangesLength; i++) {
    if (this.growthChanges[i]) {
      weightedChangeCount += this.growthChangeWeights[i];
    }
  }

  ratio = weightedChangeCount/this.growthChangeWeightsSum;

  if (ratio>0) {
    console.log("flickering mitigation ratio: "+Math.floor(ratio*1000)/1000);
  }

  return ratio;
};