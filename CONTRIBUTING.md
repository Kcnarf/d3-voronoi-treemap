:+1: First of all, thanks for your commitment and time :+1:

d3-weighted-voronoi follows Mike Bostocks's [Let's make a D3 plugin](https://bost.ocks.org/mike/d3-plugin/#publish) guidelines.

## Proposing code changes:

1. `git clone https://github.com/Kcnarf/d3-voronoi-treemap.git`
2. `yarn install`
3. make your changes, and
   1. `yarn test` to check possible sides effects
   2. add specifications if required (new API, new behavior)
4. :warning: `yarn precommit` in order to test the whole thing and build adequate files (notably, the .min files)
5. `git commit`
6. `git push`

## Creating a new version:

d3-voronoi-treemap attempts to follow [semantic versioning](https://semver.org) and bump major version only when backwards incompatible changes are released.

1. change version number in package.json (1 occurence)
2. change version number in README.md, section _installing_ (2 occurences)
3. `git commit`
4. `git push`
5. `git tag -a vX.X.X`
6. `git push --tags`
7. `npm publish`
8. go to [Github's repositoty tag page](https://github.com/Kcnarf/d3-voronoi-treemap/tags) and make the new tag a new release (cf. last lines of [Let's make a D3 plugin](https://bost.ocks.org/mike/d3-plugin/#publish))
