import {extent} from 'd3-array';
import {polygonHull, polygonCentroid, polygonArea, polygonContains} from 'd3-polygon';
import {weightedVoronoi} from 'd3-weighted-voronoi';

export function voronoiTreemap () {
  
  /////// Inputs ///////
  var weight = function (d) { return d.weight; };     // accessor to the weight
  var convergenceTreshold = 0.01;                     // 0.01 means 1% error
  var maxIterationCount = 50;                         // maximum allowed iteration; will stop even if convergence is not reached;
  var nearZeroWeightRatio = 0.01;                     // 0.01 means min allowed weight = 1% of max weight
  var tick = function (polygons, i) { return true; }  // hook called at each iteration's end (i = iteration count)
  
  //begin: constants
  var sqrt = Math.sqrt,
      sqr = function(d) { return Math.pow(d,2); },
      epsilon = 1;
  //end: constants
  
  //begin: internals
  var wVoronoi = weightedVoronoi();
  var siteCount,
      totalArea,
      areaErrorTreshold,
      areaErrorHistory = []; // used to detect flickering
  //end: internals

  //begin: algorithm conf.
  var shouldBreakOnMaxIteration = true,
      shouldComputeVoronoiAfterReposition = true,
      handleOverweightedVariant = 1,
      shouldHandleNearZeroWeights = true,
      adaptPlacementsVariant = 1, // 0: basic heuristics; 1: heuristics with flickering mitigation
      adaptWeightsVariant = 1, // 0: basic heuristics; 1: heuristics with flickering mitigation
      areaErrorHistoryLength = 10;
  var handleOverweighted,
      adaptPlacements,
      adaptWeights;
  //end: algorithm conf.

  ///////////////////////
  ///////// API /////////
  ///////////////////////

  function _voronoiTreemap (data) {
    //begin: handle algorithm's variants
    setAdaptPlacements();
    setAdaptWeights();
    setHandleOverweighted();
    //end: handle algorithm's variants

    siteCount = data.length;
    totalArea = Math.abs(polygonArea(wVoronoi.clip())),
    areaErrorTreshold = convergenceTreshold*totalArea;
    areaErrorHistory = [];

    var iterationCount = 0,
        polygons = initialize(data),
        converged = false;

    tick(polygons, iterationCount);

    while (!(converged || (shouldBreakOnMaxIteration && iterationCount>=maxIterationCount))) {
      polygons = adapt(polygons);
      iterationCount++;
      converged = overallConvergence(polygons);
      tick(polygons, iterationCount);
    }
    
    return {
      polygons: polygons,
      iterationCount: iterationCount,
      convergence : computeAreaError(polygons)/totalArea
    };
  };

  _voronoiTreemap.weight = function (_) {
    if (!arguments.length) { return weight; }
    
    weight = _;
    return _voronoiTreemap;
  };
  
  _voronoiTreemap.convergenceTreshold = function (_) {
    if (!arguments.length) { return convergenceTreshold; }
    
    convergenceTreshold = _;
    return _voronoiTreemap;
  };
  
  _voronoiTreemap.maxIterationCount = function (_) {
    if (!arguments.length) { return maxIterationCount; }
    
    maxIterationCount = _;
    return _voronoiTreemap;
  };
  
  _voronoiTreemap.nearZeroWeightRatio = function (_) {
    if (!arguments.length) { return nearZeroWeightRatio; }
    
    nearZeroWeightRatio = _;
    return _voronoiTreemap;
  };

  _voronoiTreemap.tick = function (_) {
    if (!arguments.length) { return tick; }
    
    tick = _;
    return _voronoiTreemap;
  };

  _voronoiTreemap.clip = function (_) {
    if (!arguments.length) { return wVoronoi.clip(); }
    wVoronoi.clip(_);

    return _voronoiTreemap;
  };

  ///////////////////////
  /////// Private ///////
  ///////////////////////

  function adapt(polygons) {
    var converged, adaptedTreemapPoints;
    
    adaptPlacements(polygons);
    if (shouldComputeVoronoiAfterReposition) {
      adaptedTreemapPoints = polygons.map(function(p) { return p.site.originalObject; });
      polygons = wVoronoi(adaptedTreemapPoints);
      if (polygons.length<siteCount) {
        console.log("at least 1 site has no area, which is not supposed to arise");
        debugger;
      }
    }
    
    adaptWeights(polygons);
    adaptedTreemapPoints = polygons.map(function(p) { return p.site.originalObject; });
    polygons = wVoronoi(adaptedTreemapPoints);
    if (polygons.length<siteCount) {
      console.log("at least 1 site has no area, which is not supposed to arise");
      debugger;
    }
    
    return polygons;
  };

  function adaptPlacements0(polygons) {
    var newTreemapPoints = [];
    var polygon, treemapPoint, centroid;
    
    for(var i=0; i<siteCount; i++) {
      polygon = polygons[i];
      treemapPoint = polygon.site.originalObject;
      centroid = polygonCentroid(polygon);
      
      treemapPoint.x = centroid[0];
      treemapPoint.y = centroid[1];
      
      newTreemapPoints.push(treemapPoint);
    }
    
    handleOverweighted(newTreemapPoints);
  };
  
  // flickering mitigation
  function adaptPlacements1(polygons) {
    var newTreemapPoints = [];
    var flickeringInfluence, polygon, treemapPoint, centroid, dx, dy;
    
    flickeringInfluence = 0.5*flickeringMitigationRatio(polygons);
    for(var i=0; i<siteCount; i++) {
      polygon = polygons[i];
      treemapPoint = polygon.site.originalObject;
      centroid = polygonCentroid(polygon);
      
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
    var polygon, treemapPoint, currentArea, adaptRatio, adaptedWeight;
    
    for(var i=0; i<siteCount; i++) {
      polygon = polygons[i];
      treemapPoint = polygon.site.originalObject;
      currentArea = polygonArea(polygon);
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
    var flickeringInfluence, polygon, treemapPoint, currentArea, adaptRatio, adaptedWeight;
    
    flickeringInfluence = 0.1*flickeringMitigationRatio(polygons);
    for(var i=0; i<siteCount; i++) {
      polygon = polygons[i];
      treemapPoint = polygon.site.originalObject;
      currentArea = polygonArea(polygon);
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
      console.log("# fix: "+fixCount);
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
      currentArea = polygonArea(polygon);
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
  
  function initialize(data) {
    var basePoints, treemapPoints, polygons;
    
    //begin: create points
    basePoints = data.map(function(d){
      return {
        index: i,
        weight: weight(d),
        originalData: d
      };
    });
    //end: create points
    
    if (shouldHandleNearZeroWeights) {
      handleNearZeorWeights(basePoints);
    }
    
    // create treemap-related points
    // (with targetedArea, and initial placement)
    treemapPoints = createTreemapPoints(basePoints);
    return wVoronoi(treemapPoints);
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
  };
  
  function createTreemapPoints(basePoints) {
    var totalWeight = basePoints.reduce(function(acc, bp){ return acc+=bp.weight; }, 0),
        avgWeight = totalWeight/siteCount,
        avgArea = totalArea/siteCount,
        xExtent = extent(wVoronoi.clip().map(function(p){return p[0];})),
        yExtent = extent(wVoronoi.clip().map(function(p){return p[1];})),
        dx = xExtent[1]-xExtent[0],
        dy = yExtent[1]-yExtent[0],
        defaultWeight = avgArea/2;  // a magic heuristics!
    var x,y;
    
    return basePoints.map(function(bp) {
      x = xExtent[0]+dx*Math.random();
      y = yExtent[0]+dy*Math.random();
      while (!polygonContains(clippingPolygon, [x, y])) { 
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
  };

  return _voronoiTreemap;
}