var globals = {
  'd3-array': 'd3',
  'd3-polygon': 'd3',
  'd3-weighted-voronoi': 'd3'
}

export default {
  entry: 'index.js',
  moduleName: 'd3',
  globals: globals,
  external: Object.keys(globals),
  format: 'umd',
  dest: 'build/d3-voronoi-treemap.js'
};