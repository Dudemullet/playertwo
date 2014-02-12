"use strict";

var fs = require('fs'),
    escape = require('escape-html'),
    dirExp = require("node-dir"),
    express = require("express"),
    path = require("path");

module.exports = function(app) {
    var 
        movieDir = app.get("movieDir"),
        dirCollection = {},
        supportedFileFormats = app.get("movieExtensions") || ["mp4"],
        PATHSEP = path.sep;
        
    app.use( "/videos", express.static("./build/videos"));

    /*
        Routes
    */
    app.get('/videos', function(req, res, next) {
        getMovies(function(videoList){
            res.render("videos",{"videos":videoList});
        });
    });

    app.get('/get/videos', function(req, res, next) {
        getMovies(res.json);
    });

    var getMovies = function(cb) {
        var videoList = [];
        
        //Recursively get all files in dir
        dirExp.files(movieDir, function(err,files) { if(err) console.log(err);
            // Get supported files with valid extensions (mp4, avi, etc...)
            var filteredVideos = files.filter(validExtensionsFilter);

            //Per video, construct a useful video object
            filteredVideos.forEach(function(val,i,arr){
                videoList.push(newVideo(val, movieDir));
            });
            
            cb(videoList);
        });
    }

    var validExtensionsFilter = function(index) {
        var fileNameExtension = index.substr(index.lastIndexOf(".")+1);
        return (supportedFileFormats[fileNameExtension] || false);
    }

    var newVideo = function(val, staticDir) {
        var filename = val.substr(val.lastIndexOf(PATHSEP)+1);
        var folderKey = val.substr(0,val.lastIndexOf(PATHSEP));
        
        var strLen = staticDir.length;
        var staticDirPath = val.substr(val.indexOf(staticDir)+strLen);
        staticDir = staticDir.replace(/ /g,'-')
                    .replace(/[^\w-]+/g,'');
        return {
            "stat": "/videos/" + filename,
            "dir": folderKey,
            "fileName": filename, //includes extension
            "path": escape(val),
            "name": filename.substr(0,filename.lastIndexOf(".")),
            "vttSub": "/videos/" + filename.substr(0,filename.lastIndexOf(".")) + ".vtt"
        };
    }

    return {
        "getMovies":getMovies
    }
}