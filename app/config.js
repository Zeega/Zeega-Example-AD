// Set the require.js configuration for your application.
require.config({

  // Initialize the application with the main application file.
  deps: ["main"],

  paths: {
    // JavaScript folders.
    libs: "../assets/js/libs",
    plugins: "../assets/js/plugins",
    vendor: "../assets/vendor",

    // Libraries.
    jquery: "../assets/js/libs/jquery",
    lodash: "../assets/js/libs/lodash",
    backbone: "../assets/js/libs/backbone",

    // Zeega folders
    zeega_base: "../assets/js/zeega",
    zeega_layers: "../assets/js/zeega/player/plugins/layers",
    zeega_media_players: "../assets/js/zeega/player/plugins/players",

    //  Zeega
    zeega_player: "../assets/js/zeega/player/zeega.player"
  },

  shim: {
    // Backbone library depends on lodash and jQuery.
    backbone: {
      deps: ["lodash", "jquery"],
      exports: "Backbone"
    },

    // Backbone.LayoutManager depends on Backbone.
    "plugins/backbone.layoutmanager": ["backbone"],
    'libs/jquery-ui' : ['jquery'],
    'libs/spin' : ['jquery'],
    "vendor/imagesloaded/jquery.imagesloaded.min" : ['jquery'],

    'zeega_base/player/plugins.layers' : ['lodash']
  }

});
