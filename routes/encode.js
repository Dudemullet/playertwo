"use strict";
var 
  handbrake = require("handbrake-js"),
  child_process = require("child_process"),
  dirExp = require("node-dir"),
  util = require('util'),
  path = require("path"),
  fs = require("fs");

module.exports = function(app, upload){

  var 
    movieDir = app.get("movieDir"),
    encodeDir = app.get("encodeDir"),
    uploadDir = app.get("uploadDir"),
    fileEncodeOptions = {
      encoder: "x264",
      "keep-display-aspect":true,
      modulus:16,
      vb:"2500",
      quality:"20",
      "crop":"0:0:0:0"
    },
    movieExts = app.get("movieExtensions") || ["mp4"],
    encodeQueue = {},
    PATHSEP = path.sep;

  upload.on("end",function(fileInfo) {
    var 
      vid = PendingVideo(fileInfo);

    if(!movieExts[vid.extension]) {
      console.info("Unsupported file upload: %s", vid.filename);
      fs.unlink(vid.filename);
      return;
    }

    encodeUploadedMovie(vid);
  });

  /*
     Pending video

    filename - filename (includes extension)
    name - filename with no extension
    uniqueKey - key to set the tmp filename to
    extension - file extension ie. mp4, avi, etc...
    tmpName - filename using
  */
  var PendingVideo = function (fileInfo) {
    return {
      filename : fileInfo.name,
      name : fileInfo.name.substr(0,fileInfo.name.lastIndexOf(".")),
      uniqueKey : "a" + Date.now(),
      extension: fileInfo.name.substr(fileInfo.name.lastIndexOf(".")+1),
      get tmpName() {return encodeDir + '/' + this.uniqueKey + '.mp4'},
      get file() {return uploadDir + '/' + this.filename}
    }
  }

  var encodeUploadedMovie = function(fileInfo) {
    var
      fm = upload.fileManager({ //TODO filemanager is being shared betwen this and upload.js that why we re-set it
        uploadDir: function() {
          return encodeDir;
        }
      });

    fileEncodeOptions.input = fileInfo.file;
    fileEncodeOptions.output = fileInfo.tmpName;
    encodeQueue[fileInfo.uniqueKey] = {};

    //DEBUG
    console.log("Adding file to encode QUEUE: %s", fileInfo.name);

    var handle = handbrake.spawn(fileEncodeOptions)
    .on("complete", function(params){ 
      console.log("FINISH encoding for: \n\t%s", fileInfo.name);
      var setToOldName = encodeDir + "/" + fileInfo.name + ".mp4";
      
      fs.rename(fileInfo.tmpName, setToOldName, function(){
        fm.move(setToOldName, "../videos", function(err){ 
          if(err)
            console.log(err);
        });
      })
      delete encodeQueue[fileInfo.uniqueKey];
      
      fs.unlink(fileEncodeOptions.input,function(err){
        if(err)
          console.log(err);
      });
    });

    setupEndpoint(handle, fileInfo.uniqueKey);
  }

  var setupEndpoint = function(handle, fileId) {
    handle.on("error", function(err){
        console.log(err.message);
        delete encodeQueue[fileId];
    })
    .on("output", console.log)
    .on("progress", function(progress){

      //DEBUG
      // console.log("PROGRESS - endpoint: %s", fileId);

      encodeQueue[fileId].eta = progress.eta;
      encodeQueue[fileId].complete = progress.percentComplete;
    });
  }

  var getProcessing = function(cb) {
    var videoList = [];
    
    //Recursively get all files in dir
    dirExp.files(encodeDir, function(err,files) { if(err) console.log(err);
      console.log("getProcessing: " + util.inspect(files));

      if(!files)
          return cb(videoList);

      //Per video, construct a useful video object
      files.forEach(function(val,i,arr){
        var 
          filename = val.substr(val.lastIndexOf(PATHSEP)+1),
          name = filename.substr(0,filename.lastIndexOf("."));
        videoList.push({
          "name": name,
          "filename": filename
        });
      });
      
      console.log("videoList: \n\t" + util.inspect(videoList));
      
      return cb(videoList);
    });
  }

  //DEBUG - send a static video to encoding
  // app.use("/encode/test", function(req, res, next){
  //   var 
  //     fileInfo = {
  //       "name": 'souls.avi',
  //       "fileOut": './lol.mp4',
  //       "name": 'souls',
  //       "dir": './'
  //     };

  //   encodeUploadedMovie(fileInfo);
  //   res.send(200);
  // });
  // app.use("/encode/testFlush", function(req, res, next) {
  //   encodeQueue = {};
  //   console.log("Encode Queue flushed");
  // })
  // app.use("/encode/testInit", function(req, res, next) {
  //   console.log("Encode Queue flushed");
  //   encodeQueue["mock"] = {
  //     "complete" : (function(){return Math.random(0,1) * 100;})(),
  //     "eta": "01h02m03s"
  //   };
  //   encodeQueue["souls"] = {
  //     "complete" : (function(){return Math.random(0,1) * 100;})(),
  //     "eta": "01xx"
  //   };
  //   console.log("Test Queue created");
  //   console.log("Available props: \n" + util.inspect(encodeQueue));

  //   res.send(200);
  // })

  app.get("/encode/status/:filename", function(req, res, next) {
    
    if(!req.params.filename) { // Either video was finished encoding or never existed
      res.send(400);
      return;
    }

    // DEBUG
    console.log("GET endpoint for: %s", req.params.filename);

    var filename = req.params.filename;

    if(!encodeQueue[req.params.filename]) {
      res.send(404);
    } else {
      res.json(encodeQueue[filename])
    }
  });

  app.get('/encode', function(req, res, next) {
    console.log("GET: encode");
    getProcessing(function(videoList) {
      res.render("encode",{"processing":videoList});
    });
  });

  app.get('/get/processing', function(req, res, next) {
    console.log("GET processing videos JSON list");
    getProcessing(function(videoList) {
      res.json(videoList)
    });
  });

  return {
    "getProcessing": getProcessing
  }
}