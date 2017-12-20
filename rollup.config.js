var globals = {
  'd3-voronoi-map': 'd3'
}

export default {
  entry: 'index.js',
  moduleName: 'd3',
  globals: globals,
  external: Object.keys(globals),
  format: 'umd',
  dest: 'build/d3-voronoi-treemap.js'
};