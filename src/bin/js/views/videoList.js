"use strict";

var collection = require('../collections/videos');
var VideoView = require('./videos.js');

module.exports = Backbone.View.extend({
  el: "#videolist",

  initialize: function() {
    this.collection = new collection();
    this.collection.fetch({
      success: this.render.bind(this)
    });
  },

  render: function(){
    this.collection.each(function(video){
      var video = new VideoView({ model: video});
      this.$el.append(video.render().el);
    },this);

    return this;
  }
});
