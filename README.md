# [WIP] d3-voronoi-treemap
This D3 plugin produces a *Voronï treemap*. Given a convex polygon and weighted data, it tesselates/partitions the polygon in several inner cells, such that the area of a cell represents the weight of the underlying datum.

Because a picture is worth a thousand words:

![Thumbnail](./img/thumbnail.png)

Available only for **d3 v4**.

# Restrictions
This is a *WIP*. Hence, current limitations are:
* nested data are not handled; produces only first-level treemap

## Context
D3 already provides a [d3-treemap](https://github.com/d3/d3-hierarchy/blob/master/README.md#treemap) module which produces a rectangular treemap. Such treempas could be distorted to fit shapes that are not rectangles (cf. [Distorded Treemap - d3-shaped treemap](http://bl.ocks.org/Kcnarf/976b2e854965eea17a7754517043b91f)).

This plugin allows to compute a treemap with a unique look-and-feel, where inner areas are not aligned each others. Furthermore, it can compute a treemap for any convex polygon, and not only a rectangle.

## Examples
* *still to come*.

## Installing
Load ```https://rawgit.com/Kcnarf/d3-voronoi-treemap/master/build/d3-voronoi-treemap.js``` (or its ```d3-voronoi-treemap.min.js``` version) to make it available in AMD, CommonJS, or vanilla environments. In vanilla, a d3 global is exported:
```html
<script src="https://d3js.org/d3.v4.min.js"></script>
<script src="https://raw.githack.com/Kcnarf/d3-voronoi-treemap/master/build/d3-voronoi-treemap.js"></script>
<script>
  var voronoiTreemap = d3.voronoiTreemap();
</script>
```

## TL;DR;
In your javascript, in order to define the tessellation:
```javascript
var voronoitreemap = d3.voronoitreemap()
  .weight(function(d){ return weightScale(d); }         // set the weight accessor
  .clip([0,0], [0,height], [width, height], [width,0])  // set the clipping polygon

var res = voronoitreemap(data);                         // compute the weighted Voronoi tessellation; returns {polygons, iterationCount, convergenceRatio}
var cells = res.polygons
  
```

Then, later in your javascript, in order to draw cells:
```javascript
d3.selectAll('path')
  .data(cells)
  .enter()
    .append('path')
      .attr('d', function(d){ return cellLiner(d)+"z"; })
      .style('fill', function(d){ return fillScale(d.site.originalObject); })
```

## Reference
* based on [Computing Voronoi Treemaps - Faster, Simpler, and Resolution-independent ](https://www.uni-konstanz.de/mmsp/pubsys/publishedFiles/NoBr12a.pdf)
* [https://github.com/ArlindNocaj/power-voronoi-diagram](https://github.com/ArlindNocaj/power-voronoi-diagram) for a Java implementation

## API
<a name="voronoiTreemap" href="#voronoiTreemap">#</a> d3.<b>voronoiTreemap</b>()

Creates a new voronoiTreemap with the default [*weight*](#voronoiTreemap_weight) accessor, and [*clip*](#voronoiTreemap_clip), [*convergenceRatio*](#voronoiTreemap_convergenceRatio), [*maxIterationCount*](#voronoiTreemap_maxIterationCount) and [*minWeightRatio*](#voronoiTreemap_minWeightRatio) option values.

<a name="_voronoiTreemap" href="#_voronoiTreemap">#</a> <i>voronoiTreemap</i>(<i>data</i>)

Computes the **Voronoï treemap** for the specified *data* points.

Returns a *hash* where *hash.polygons* is a sparse array of polygons clipped to the [*clip*](#voronoiTreemap_clip)-ping polygon, one for each cell (each unique input point) in the diagram. Each polygon is represented as an array of points \[*x*, *y*\] where *x* and *y* are the point coordinates, a *site* field that refers to its site (ie. with x, y and weight retrieved from the original data), and a *site.originalObject* field that refers to the corresponding element in *data*. Polygons are open: they do not contain a closing point that duplicates the first point; a triangle, for example, is an array of three points. Polygons are also counterclockwise (assuming the origin ⟨0,0⟩ is in the top-left corner). Furthermore, *hash.iterationCount* is the number of iterations required to compute the resulting treempp, and *hash.convergenceRatio* is the final convergence ratio (ie. cell area errors / area of the [*clip*](#voronoiTreemap_clip)-ping polygon).

<a name="voronoiTreemap_weight" href="#voronoiTreemap_weight">#</a> <i>voronoiTreemap</i>.<b>weight</b>([<i>weight</i>])

If *weight*-accessor is specified, sets the *weight* accessor. If *weight* is not specified, returns the current *weight* accessor, which defaults to:

```js
function weight(d) {
  return d.weight;
}
```

<a name="voronoiTreemap_clip" href="#voronoiTreemap_clip">#</a> <i>voronoiTreemap</i>.<b>clip</b>([<i>clip</i>])

If *clip* is specified, sets the clipping polygon. *clip* defines a hole-free concave polygon, and is specified as an array of 2D points \[x, y\], which must be *(i)* open (no duplication of the first D2 point) and *(ii)* counterclockwise (assuming the origin ⟨0,0⟩ is in the top-left corner). If *clip* is not specified, returns the current clipping polygon, which defaults to:

```js
[[0,0], [0,1], [1,1], [1,0]]
```

<a name="voronoiTreemap_convergenceRatio" href="#voronoiTreemap_convergenceRatio">#</a> <i>voronoiTreemap</i>.<b>convergenceRatio</b>([<i>convergenceRatio</i>])

If *convergenceRatio* is specified, sets the convergence ratio, which stops computation when (cell area errors / ([*clip*](#voronoiTreemap_clip)-ping polygon area) <= *convergenceRatio*. If *convergenceRatio* is not specified, returns the current *convergenceRatio* , which defaults to:

```js
var convergenceRation = 0.01  // stops computation when cell area error <= 1% clipping polygon's area
```

The smaller the *convergenceRatio*, the more representative is the treemap, the longer the computation takes time. 

<a name="voronoiTreemap_maxIterationCount" href="#voronoiTreemap_maxIterationCount">#</a> <i>voronoiTreemap</i>.<b>maxIterationCount</b>([<i>maxIterationCount</i>])

If *maxIterationCount* is specified, sets the maximum allowed number of iterations, which stops computation when it is reached, even if the [*convergenceRatio*](#voronoiTreemap_convergenceRatio) is not reached. If *maxIterationCount* is not specified, returns the current *maxIterationCount* , which defaults to:

```js
var maxIterationCount = 50;
```

If you want to wait until computation stops _only_ when the [*convergenceRatio*](#voronoiTreemap_convergenceRatio) is reached, just set the *maxIterationCount* to a large amount. Be warned that computation may take a huge amount of time, due to flickering behaviours in later iterations.

<a name="voronoiTreemap_minWeightRatio" href="#voronoiTreemap_minWeightRatio">#</a> <i>voronoiTreemap</i>.<b>minWeightRatio</b>([<i>minWeightRatio</i>])

If *minWeightRatio* is specified, sets the minimum weight ratio, which allows to compute the minimum allowed weight (_= maxWeight * minWeightRatio_). If *minWeightRatio* is not specified, returns the current *minWeightRatio* , which defaults to:

```js
var minWeightRatio = 0.01;  // 1% of maxWeight
```

*minWeightRatio* allows to mitigate flickerring behaviour (caused by too small weights), and enhances user interaction by not computing near-empty cells.

## Dependencies
 * d3-array.extent
 * d3-polygon.{polygonHull, polygonCentroid, polygonArea, polygonContains}
 * d3-weighted-voronoi.weightedVoronoi

## Testing
In order to test the code

```sh
git clone https://github.com/Kcnarf/d3-voronoi-treemap.git
[...]
yarn install
[...]
yarn test
```

