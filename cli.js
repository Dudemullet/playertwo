#!/usr/bin/env node
"use strict";

var
  progress = require('progress'),
  util = require('util'),
  Encoder = require('./lib/encoder'),
  encoder = new Encoder(),
  fs = require('fs'),
  path = require('path'),
  argv = require('minimist')(process.argv.slice(2)),
  rimraf = require('rimraf');
var
  barConfStr = 'encoding :title [:bar] :percent Elapsed: :elapseds ETA: :estimate',
  bar = new progress(barConfStr, {total:25}),
  videoDir = __dirname +"/build/videos/";


var startServer = function() {
  var
    server = require('./server.js');
}

var encodeVideo = function(file, outFile) {
  
  var
    handle = encoder.encode(file, path.dirname(outFile));
  
  handle
    .on("progress", function(progress){
      updateBar(progress, file);
    })
    .on("complete", function(){
      var vid = handle.vid;
      encodeComplete(vid, outFile);
    });
}

var updateBar = function(progress, filename) {
  var
    eta = progress.eta<=0?"calculating...":progress.eta,
    percentRatio = progress.percentComplete/100;

    bar.update(percentRatio,{"estimate":eta,"title":filename});
}

var encodeComplete =  function(params, outFile) {
  bar.terminate();
  console.log("Encode complete");
  fs.rename(params.output, videoDir + outFile,function(err){
    if(err)
      console.log(err);
    startServer();
  });
}

// init
if(argv.clean) {
  rimraf(videoDir, function(err){
    if(err) {
     console.log(err);
     process.exit(1);
    }
    process.exit(0);
  })
}

if(argv._.length <= 0) {
  startServer();
} else {
  var
    filename = path.normalize(argv._[0]),
    ext = path.extname(filename),
    base = path.basename(filename, ext);
}
