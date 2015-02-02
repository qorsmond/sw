'use strict';

var gulp = require('gulp');

var paths = gulp.paths;

var $ = require('gulp-load-plugins')();

var fs = require('fs');
var path = require('path');
var swPrecache = require('sw-precache');
var packageJson = require('../package.json');

var DEV_DIR = 'src';

function generateServiceWorkerFileContents(rootDir, handleFetch, callback) {
  var config = {
    cacheId: packageJson.name,
    handleFetch: handleFetch,
    logger: $.util.log,
    staticFileGlobs: [
      rootDir + '/**.css',
      rootDir + '/**.html',
      rootDir + '/images/**.*',
      rootDir + '/**.js'
    ],
    stripPrefix: path.join(rootDir, path.sep)
  };

  swPrecache(config, callback);
}

gulp.task('generate-service-worker-dev', function(callback) {
  generateServiceWorkerFileContents(DEV_DIR, false, function(error, serviceWorkerFileContents) {
    if (error) {
      return callback(error);
    }
    fs.writeFile(path.join(DEV_DIR, 'service-worker.js'), serviceWorkerFileContents, function(error) {
      if (error) {
        return callback(error);
      }
      callback();
    });
  });
});

