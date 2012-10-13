define([
	"zeega",
	// Libs
	"backbone",
	// Plugins
	'zeega_player'
],

function(Zeega, Backbone) {

	// Create a new module
	var Index = Zeega.module();

	Index.Model = Backbone.Model.extend({

		initialize : function()
		{
			var _this = this;
			this.project = new Project();
			this.project.id = this.get('featuredID');
			this.project.fetch().success(function(){
				// I should not have to put this in Zeega.player!
				// want this in _this.player !!
				Zeega.player = new Zeega.Player( _this.project.toJSON() );
				_this.player = Zeega.player; // I want to remove this
				_this.player.init();
				console.log('feature', _this );
			});
		},


		exit : function()
		{
			this.player.exit();
		}

	});




	var Project = Backbone.Model.extend({

		url : function()
		{
			//return 'http://alpha.zeega.org/api/items/46332'; //debug project
			
			if( this.isNew() )
			{
				return localStorage.api + '/projects/2110';
			}
			else return localStorage.api + '/projects/'+ this.id;
		},

		defaults : {
			mode :'standalone',

			navbar_top : false,
			navbar_bottom : true,
			layerCitations : false,
			playerCitation : true,

			chromeless : false,
			branding : false,
			social : false,
			fullscreenEnabled : false,
			fadeOutOverlays : false
		},



	});

	return Index;

});
