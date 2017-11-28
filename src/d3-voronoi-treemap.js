import {extent} from 'd3-array';
import {polygonHull, polygonCentroid, polygonArea, polygonContains} from 'd3-polygon';
import {weightedVoronoi} from 'd3-weighted-voronoi';

export function voronoiTreemap () {
  /////// Inputs ///////
  var x = function (d) { return d.x; };               // accessor to the x value
  var y = function (d) { return d.y; };               // accessor to the y value
  var weight = function (d) { return d.weight; };     // accessor to the weight
  var clip = [[0,0], [0,1], [1,1], [1,0]];            // clipping polygon
  var tick = function (polygons, i) { return true; }  // hook called at each iteration's end (i = iterationCount)
  var convergenceTreshold = 0.01;                     // 0.01 means 1% error

  //begin: constants
  var _PI = Math.PI,
      _2PI = 2*Math.PI,
      sqrt = Math.sqrt,
      sqr = function(d) { return Math.pow(d,2); }
      epsilon = 1;
  //end: constants

  //begin: algorithm conf.
  var maxIterationCount = 200,
      shouldBreakOnMaxIteration = true
      shouldComputeVoronoiAfterReposition = true,
      handleOverweightedVariant = 1,
      shouldRotateHandleOverweighted = false, // mixing severall heuristics seems to performs better (limit flickering), but sometimes freezes (infinite loop in handleOverweighted1)
      shouldMinimizeWeight = false, // when activated, not flickering, but stabilization at higher iterations
      shouldHandleNearZeroWeights = true,
      nearZeroWeightRatio = 0.01, // 0.01 means min allowed weight = 1% of max weight
      adaptPlacementsVariant = 1,
      adaptWeightsVariant = 1;
  var handleOverweight;
  //end: algorithm conf.

  ///////////////////////
  ///////// API /////////
  ///////////////////////

  function _voronoiTreemap (data) {
    weightedVoronoi = d3.weightedVoronoi().clip(clip);
    totalArea = Math.abs(polygonArea(clip)),
    areaErrorTreshold = convergenceTreshold*totalArea,
    areaErrorHistory = [], // used to detect flickering
    areaErrorHistoryLength = 10,

    /*
    init
    call 'adapt' (call 'tick' at each loop's end)
    finish & return polygons (+ extra info ??? eg. error percentage, iterationCount, ...)
    */
  }

  _voronoiTreemap.x = function (_) {
    if (!arguments.length) { return x; }
    x = _;

    return _voronoiTreemap;
  };

  _voronoiTreemap.y = function (_) {
    if (!arguments.length) { return y; }
    y = _;

    return _voronoiTreemap;
  };

  _voronoiTreemap.weight = function (_) {
    if (!arguments.length) { return weight; }
    weight = _;

    return _voronoiTreemap;
  };

  _voronoiTreemap.clip = function (_) {
    if (!arguments.length) { return clip; }
    clip = polygonHull(_); // ensure clip to be a convex, hole-free, counterclockwise polygon

    return _voronoiTreemap;
  };

  _voronoiTreemap.tick = function (_) {
    if (!arguments.length) { return tick; }
    tick = _;

    return _voronoiTreemap;
  };

  _voronoiTreemap.convergenceTreshold = function (_) {
    if (!arguments.convergenceTreshold) { return convergenceTreshold; }
    convergenceTreshold = _;

    return _voronoiTreemap;
  };

  ///////////////////////
  /////// Private ///////
  ///////////////////////

  function adapt(polygons, iterationCount) {
    var converged, adaptedTreemapPoints;
    
    if (shouldRotateHandleOverweighted) {
      rotateHandleOverweighted();
    }
    
    adaptPlacements(polygons);
    if (shouldComputeVoronoiAfterReposition) {
      adaptedTreemapPoints = polygons.map(function(p) { return p.site.originalObject; });
      polygons = weightedVoronoi(adaptedTreemapPoints);
      if (polygons.length<siteCount) {
        console.log("at least 1 site has no area, which is not supposed to arise");
        debugger;
      }
    }
    
    adaptWeights(polygons);
    adaptedTreemapPoints = polygons.map(function(p) { return p.site.originalObject; });
    polygons = weightedVoronoi(adaptedTreemapPoints);
    if (polygons.length<siteCount) {
      console.log("at least 1 site has no area, which is not supposed to arise");
      debugger;
    }
    
    redraw(adaptedTreemapPoints, polygons);
    
    converged = overallConvergence(polygons);
    
    if (shouldBreakOnMaxIteration && iterationCount===maxIterationCount) {
      console.log("Max iteration reached")
      setTimeout(reset, 1750);
    } else {
      if (converged) {
        console.log("Stopped at iteration "+iterationCount);
        finalize(adaptedTreemapPoints, polygons, 20);
      } else {
        setTimeout(function(){
          adapt(polygons, iterationCount+1);
        }, 50);
      }
    }
  };

  function adaptPlacements0(polygons) {
    var newTreemapPoints = [];
    var polygon, treemapPoint, centroid;
    
    for(var i=0; i<siteCount; i++) {
      polygon = polygons[i];
      treemapPoint = polygon.site.originalObject;
      centroid = d3.polygonCentroid(polygon);
      
      treemapPoint.x = centroid[0];
      treemapPoint.y = centroid[1];
      
      newTreemapPoints.push(treemapPoint);
    }
    
    handleOverweighted(newTreemapPoints);
  };
  
  // flickering mitigation
  function adaptPlacements1(polygons) {
    var newTreemapPoints = [];
    var polygon, treemapPoint, centroid, flickeringInfluence;
    
    flickeringInfluence = 0.5*flickeringMitigationRatio(polygons);
    for(var i=0; i<siteCount; i++) {
      polygon = polygons[i];
      treemapPoint = polygon.site.originalObject;
      centroid = d3.polygonCentroid(polygon);
      
      dx = centroid[0] - treemapPoint.x;
      dy = centroid[1] - treemapPoint.y;
      
      //begin: handle excessive change;
      dx *= (1-flickeringInfluence);
      dy *= (1-flickeringInfluence);
      //end: handle excessive change;
      
      
      treemapPoint.x += dx;
      treemapPoint.y += dy;
      
      newTreemapPoints.push(treemapPoint);
    }
    
    handleOverweighted(newTreemapPoints);
  };
  
  function adaptWeights0(polygons) {
    var newTreemapPoints = [];
    var polygon, treemapPoint, currentArea, adaptRatio;
    
    for(var i=0; i<siteCount; i++) {
      polygon = polygons[i];
      treemapPoint = polygon.site.originalObject;
      currentArea = d3.polygonArea(polygon);
      adaptRatio = treemapPoint.targetedArea/currentArea;
      
      //begin: handle excessive change;
      adaptRatio = Math.max(adaptRatio, 0.9);
      adaptRatio = Math.min(adaptRatio, 1.1);
      //end: handle excessive change;
      
      adaptedWeight = treemapPoint.weight*adaptRatio;
      adaptedWeight = Math.max(adaptedWeight, epsilon);
      
      treemapPoint.weight = adaptedWeight;
      
      newTreemapPoints.push(treemapPoint);
    }
    
    handleOverweighted(newTreemapPoints);
  };
  
  // flickering mitigation
  function adaptWeights1(polygons) {
    var newTreemapPoints = [];
    var polygon, treemapPoint, currentArea, adaptRatio, flickeringInfluence;
    
    flickeringInfluence = 0.1*flickeringMitigationRatio(polygons);
    for(var i=0; i<siteCount; i++) {
      polygon = polygons[i];
      treemapPoint = polygon.site.originalObject;
      currentArea = d3.polygonArea(polygon);
      adaptRatio = treemapPoint.targetedArea/currentArea;
      
      //begin: handle excessive change;
      adaptRatio = Math.max(adaptRatio, 0.9+flickeringInfluence);
      adaptRatio = Math.min(adaptRatio, 1.1-flickeringInfluence);
      //end: handle excessive change;
      
      adaptedWeight = treemapPoint.weight*adaptRatio;
      adaptedWeight = Math.max(adaptedWeight, epsilon);
      
      treemapPoint.weight = adaptedWeight;
      
      newTreemapPoints.push(treemapPoint);
    }
    
    handleOverweighted(newTreemapPoints);
  };
  
  // heuristics: lower heavy weights
  function handleOverweighted0(treemapPoints) {
    var fixCount = 0;
    var fixApplied, tpi, tpj, weightest, lightest, sqrD, adaptedWeight;
    do {
      fixApplied = false;
      for(var i=0; i<siteCount; i++) {
        tpi = treemapPoints[i];
        for(var j=i+1; j<siteCount; j++) {
          tpj = treemapPoints[j];
          if (tpi.weight > tpj.weight) {
            weightest = tpi;
            lightest = tpj;
          } else {
            weightest = tpj;
            lightest = tpi;
          }
          sqrD = squaredDistance(tpi, tpj);
          if (sqrD < weightest.weight-lightest.weight) {
            // adaptedWeight = sqrD - epsilon; // as in ArlindNocaj/Voronoi-Treemap-Library
            // adaptedWeight = sqrD + lightest.weight - epsilon; // works, but below loc performs better (less flickering)
            adaptedWeight = sqrD + lightest.weight/2;
            adaptedWeight = Math.max(adaptedWeight, epsilon);
            weightest.weight = adaptedWeight;
            fixApplied = true;
            fixCount++;
            break;
          }
        }
        if (fixApplied) { break; }
      }
    } while (fixApplied)
    
    if (fixCount>0) {
      if (shouldMinimizeWeight) {
        minimizeWeight(treemapPoints);
      }
      console.log("# fix: "+fixCount);
    }
  }
  
  // heuristics: increase light weights
  function handleOverweighted1(treemapPoints) {
    var fixCount = 0;
    var fixApplied, tpi, tpj, weightest, lightest, sqrD, overweight;
    do {
      fixApplied = false;
      for(var i=0; i<siteCount; i++) {
        tpi = treemapPoints[i];
        for(var j=i+1; j<siteCount; j++) {
          tpj = treemapPoints[j];
          if (tpi.weight > tpj.weight) {
            weightest = tpi;
            lightest = tpj;
          } else {
            weightest = tpj;
            lightest = tpi;
          }
          sqrD = squaredDistance(tpi, tpj);
          if (sqrD < weightest.weight-lightest.weight) {
            overweight = weightest.weight - lightest.weight - sqrD
            lightest.weight += overweight + epsilon;
            fixApplied = true;
            fixCount++;
            break;
          }
        }
        if (fixApplied) { break; }
      }
    } while (fixApplied)
    
    if (fixCount>0) {
      if (shouldMinimizeWeight) {
        minimizeWeight(treemapPoints);
      }
      console.log("# fix: "+fixCount);
    }
  }
  
  function minimizeWeight(treemapPoints) {
    var minWeight = treemapPoints[0].weight;
    
    for (var i=1; i<siteCount; i++) {
      minWeight = Math.min(minWeight, treemapPoints[i].weight);
    }
    minWeight -= epsilon;
    for (var i=0; i<siteCount; i++) {
      treemapPoints[i].weight -= minWeight;
    }
  }

  function squaredDistance(s0, s1) {
    return sqr(s1.x - s0.x) + sqr(s1.y - s0.y);
  };

  function distance(s0, s1) {
    return sqrt(squaredDistance(s0, s1));
  };
  
  function computeAreaError(polygons) {
    //convergence based on summation of all sites current areas
    var areaErrorSum = 0;
    var polygon, treemapPoint, currentArea;
    for(var i=0; i<siteCount; i++) {
      polygon = polygons[i];
      treemapPoint = polygon.site.originalObject;
      currentArea = d3.polygonArea(polygon);
      areaErrorSum += Math.abs(treemapPoint.targetedArea-currentArea);;
    }
    return areaErrorSum;
  };
  
  function overallConvergence(polygons) {
    //convergence based on summation of all sites current areas
    var areaError = computeAreaError(polygons);
    
    areaErrorHistory.unshift(areaError);
    if (areaErrorHistory.length>areaErrorHistoryLength) {
      areaErrorHistory.pop();
    }
    
    console.log("error %: "+Math.round(areaError*100*1000/totalArea)/1000);
    return areaError < areaErrorTreshold;
  };
  
  // should be computed once and used both in adaptPlacements and adaptweights
  // should count flikering iteratively (memorize flickering position of old frame, detect flickering wrt. previous frame, not re-detect flickering on old frames)
  function flickeringMitigationRatio(polygons) {
    var flickeringCount = 0,
        totalCount = 0,
        initialIndexWeight = 3,
        indexWeightDecrement = 1,
        indexWeight = initialIndexWeight;
    var error0, error1, direction, flickeringMitigationRatio;
    
    if (areaErrorHistory.length < areaErrorHistoryLength) { return 0; }
    if (computeAreaError(polygons) > totalArea/10) { return 0; }
    
    error0 = areaErrorHistory[0];
    error1 = areaErrorHistory[1];
    direction = (error0 - error1) > 0;
    
    for(var i=2; i<areaErrorHistory.length-2; i++) {
      error0 = error1;
      error1 = areaErrorHistory[i];
      if (((error0-error1)>0) != direction) {
        flickeringCount += indexWeight;
        direction = !direction;
      }
      totalCount += indexWeight;
      indexWeight -= indexWeightDecrement;
      if (indexWeight<1) {
        indexWeight = 1;
      }
    }
    
    flickeringMitigationRatio = flickeringCount/totalCount;
    
    if (flickeringMitigationRatio>0) {
      console.log("flickering mitigation ratio: "+Math.floor(flickeringMitigationRatio*1000)/1000);
    }
    
    return flickeringMitigationRatio;
  }
  
  function setAdaptPlacements() {
    switch (adaptPlacementsVariant) {
      case 0:
        adaptPlacements = adaptPlacements0;
        break;
      case 1:
        adaptPlacements = adaptPlacements1;
        break;
      default:
        console.log("Variant of 'adaptPlacements' is unknown")
    }
  };
  
  function setAdaptWeights() {
    switch (adaptWeightsVariant) {
      case 0:
        adaptWeights = adaptWeights0;
        break;
      case 1:
        adaptWeights = adaptWeights1;
        break;
      default:
        console.log("Variant of 'adaptWeights' is unknown")
    }
  };
  
  function setHandleOverweighted() {
    switch (handleOverweightedVariant) {
      case 0:
        handleOverweighted = handleOverweighted0;
        break;
      case 1:
        handleOverweighted = handleOverweighted1;
        break;
      default:
        console.log("Variant of 'handleOverweighted' is unknown")
    }
  };
  
  function reset() {
    var basePoints = [];
    var weight, treemapPoints, polygons;
    
    //begin: create points
    for (i=0; i<siteCount; i++) {
      weight = (0+1*sqr(Math.random()))*baseWeight;
      // weight = (i+1)*baseWeight;	// +1: weights of 0 are not handled
      // weight = i+1;	// +1: weights of 0 are not handled
      basePoints.push({
        index: i,
        weight: weight
      });
    }
    for (i=0; i<outlierCount; i++) {
      basePoints[i].weight = outlierWeight;
    }
      
    //end: create points
    
    if (shouldHandleNearZeroWeights) {
      handleNearZeorWeights(basePoints);
    }
    
    // create treemap-related points
    // (with targetedArea, and initial placement)
    // choose among several inital placement policies: random/pie/sortedPie
    treemapPoints = createTreemapPoints(basePoints, 'random');
    polygons = weightedVoronoi(treemapPoints);
    areaErrorHistory = [];
    
    alphaContext.clearRect(0, 0, width, height);
    redraw(treemapPoints, polygons);
    setTimeout(function(){
      adapt(polygons, 0);
    }, 1500);

  };
  
  function handleNearZeorWeights(basePoints) {
    var maxWeight = basePoints.reduce(function(max, bp){
      return Math.max(max, bp.weight);
    }, -Infinity);
    var minAllowedWeight = maxWeight*nearZeroWeightRatio,
        nearZeroCount = 0;
    
    basePoints.forEach(function(bp) {
      if (bp.weight<minAllowedWeight) {
        bp.weight = minAllowedWeight;
        nearZeroCount++;
      }
    })
    
    if (nearZeroCount>0) {
      console.log("# near-zero weights: "+nearZeroCount);
    }
  }
  
  function createTreemapPoints(basePoints, initialPlacementPolicy) {
    var totalWeight = basePoints.reduce(function(acc, bp){ return acc+=bp.weight; }, 0);
    var avgWeight = totalWeight/siteCount;
        avgArea = totalArea/siteCount,
        defaultWeight = avgArea/2;
    
      
    if (initialPlacementPolicy === 'sortedPie') {
      // sortedPie ensures :
      //	- a gradient from light weights to heavy weights
      //  - i.e., light weights will not be confine between heavy weights
      //	- i.e., light weights will move/re-weight more easily
      var sortedBasePoints = basePoints.sort(function(bp0, bp1){
            return bp0.weight < bp1.weight;
          });
      
      return createTreemapPoints(sortedBasePoints, 'pie');
    }
    else if (initialPlacementPolicy === 'pie') {
      var deltaRad = _2PI/siteCount;
      var rad;
      
      return basePoints.map(function(bp, i) {
        rad = deltaRad*i;

        return {
          index: bp.index,
          targetedArea: totalArea*bp.weight/totalWeight,
          data: bp,
          x: radius+halfRadius*Math.cos(rad)+Math.random(),
          y: radius+halfRadius*Math.sin(rad)+Math.random(),
          weight: defaultWeight
        }
      })
    } else {
      var xExtent = d3.extent(clippingPolygon.map(function(p){return p[0];})),
          yExtent = d3.extent(clippingPolygon.map(function(p){return p[1];})),
          dx = xExtent[1]-xExtent[0],
          dy = yExtent[1]-yExtent[0];
      var x,y;
      
      return basePoints.map(function(bp) {
        //use (x,y) instead of (r,a) for a better uniform placement of sites (ie. less centered)
        x = xExtent[0]+dx*Math.random();
        y = yExtent[0]+dy*Math.random();
        while (!d3.polygonContains(clippingPolygon, [x, y])) { 
          x = xExtent[0]+dx*Math.random();
          y = yExtent[0]+dy*Math.random();
        }

        return {
          index: bp.index,
          targetedArea: totalArea*bp.weight/totalWeight,
          data: bp,
          x: x,
          y: y,
          weight: defaultWeight
        }
      })
    }
  }
  
  setAdaptPlacements();
  setAdaptWeights();
  setHandleOverweighted();
  reset();

  return _weightedVoronoi;
}