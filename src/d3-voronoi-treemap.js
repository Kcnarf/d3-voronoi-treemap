import {extent} from 'd3-array';
import {polygonHull, polygonCentroid, polygonArea, polygonContains} from 'd3-polygon';
import {weightedVoronoi} from 'd3-weighted-voronoi';
import {FlickeringMitigation} from './flickering-mitigation';

export function voronoiTreemap () {
  
  /////// Inputs ///////
  var weight = function (d) { return d.weight; };     // accessor to the weight
  var convergenceRatio = 0.01;                        // targeted allowed error ratio; 0.01 stops computation when cell areas error <= 1% clipping polygon's area
  var maxIterationCount = 50;                         // maximum allowed iteration; stops computation even if convergence is not reached; use a large amount for a sole converge-based computation stop
  var minWeightRatio = 0.01;                          // used to compute the minimum allowed weight; 0.01 means 1% of max weight; handle near-zero weights, and/or leaves enought space for cell hovering
  var tick = function (polygons, i) { return true; }  // hook called at each iteration's end (i = iteration count)
  
  //begin: constants
  var epsilon = 1;
  //end: constants
  
  //begin: internals
  var wVoronoi = weightedVoronoi();
  var siteCount,
      totalArea,
      areaErrorTreshold,
      flickeringMitigation = new FlickeringMitigation();
  //end: internals

  //begin: algorithm conf.
  var handleOverweightedVariant = 1;  // this option still exists 'cause for further experiments
  var handleOverweighted;
  //end: algorithm conf.
  
  //begin: utils
  var sqrt = Math.sqrt,
  sqr = function(d) { return Math.pow(d,2); };

  function squaredDistance(s0, s1) {
  return sqr(s1.x - s0.x) + sqr(s1.y - s0.y);
  };

  function distance(s0, s1) {
  return sqrt(squaredDistance(s0, s1));
  };
  //end: utils

  ///////////////////////
  ///////// API /////////
  ///////////////////////

  function _voronoiTreemap (data) {
    //begin: handle algorithm's variants
    setHandleOverweighted();
    //end: handle algorithm's variants

    siteCount = data.length;
    totalArea = Math.abs(polygonArea(wVoronoi.clip())),
    areaErrorTreshold = convergenceRatio*totalArea;
    flickeringMitigation.clear().totalArea(totalArea);

    var iterationCount = 0,
        polygons = initialize(data),
        converged = false;
    var areaError;

    tick(polygons, iterationCount);

    while (!(converged || iterationCount>=maxIterationCount)) {
      polygons = adapt(polygons, flickeringMitigation.ratio());
      iterationCount++;
      areaError = computeAreaError(polygons);
      flickeringMitigation.add(areaError);
      converged = areaError < areaErrorTreshold;
      console.log("error %: "+Math.round(areaError*100*1000/totalArea)/1000);
      tick(polygons, iterationCount);
    }
    
    return {
      polygons: polygons,
      iterationCount: iterationCount,
      convergenceRatio : areaError/totalArea
    };
  };

  _voronoiTreemap.weight = function (_) {
    if (!arguments.length) { return weight; }
    
    weight = _;
    return _voronoiTreemap;
  };
  
  _voronoiTreemap.convergenceRatio = function (_) {
    if (!arguments.length) { return convergenceRatio; }
    
    convergenceRatio = _;
    return _voronoiTreemap;
  };
  
  _voronoiTreemap.maxIterationCount = function (_) {
    if (!arguments.length) { return maxIterationCount; }
    
    maxIterationCount = _;
    return _voronoiTreemap;
  };
  
  _voronoiTreemap.minWeightRatio = function (_) {
    if (!arguments.length) { return minWeightRatio; }
    
    minWeightRatio = _;
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

  function adapt(polygons, flickeringMitigationRatio) {
    var converged, adaptedTreemapPoints;
    
    adaptPlacements(polygons, flickeringMitigationRatio);
    adaptedTreemapPoints = polygons.map(function(p) { return p.site.originalObject; });
    polygons = wVoronoi(adaptedTreemapPoints);
    if (polygons.length<siteCount) {
      console.log("at least 1 site has no area, which is not supposed to arise");
      debugger;
    }
    
    adaptWeights(polygons, flickeringMitigationRatio);
    adaptedTreemapPoints = polygons.map(function(p) { return p.site.originalObject; });
    polygons = wVoronoi(adaptedTreemapPoints);
    if (polygons.length<siteCount) {
      console.log("at least 1 site has no area, which is not supposed to arise");
      debugger;
    }
    
    return polygons;
  };

  function adaptPlacements(polygons, flickeringMitigationRatio) {
    var newTreemapPoints = [];
    var flickeringInfluence, polygon, treemapPoint, centroid, dx, dy;
    
    flickeringInfluence = 0.5*flickeringMitigationRatio;
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
  
  function adaptWeights(polygons, flickeringMitigationRatio) {
    var newTreemapPoints = [];
    var flickeringInfluence, polygon, treemapPoint, currentArea, adaptRatio, adaptedWeight;
    
    flickeringInfluence = 0.1*flickeringMitigationRatio;
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
            // adaptedWeight = sqrD + lightest.weight - epsilon; // works, but below heuristics performs better (less flickering)
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
    var maxWeight = data.reduce(function(max, d){ return Math.max(max, weight(d)); }, -Infinity),
        minAllowedWeight = maxWeight*minWeightRatio
    var weights, treemapPoints, polygons;
    
    //begin: extract weights
    weights = data.map(function(d, i){
      return {
        index: i,
        weight: Math.max(weight(d), minAllowedWeight),
        originalData: d
      };
    });
    //end: extract weights
    
    // create treemap-related points
    // (with targetedArea, and initial placement)
    treemapPoints = createTreemapPoints(weights);
    return wVoronoi(treemapPoints);
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
      while (!polygonContains(wVoronoi.clip(), [x, y])) { 
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