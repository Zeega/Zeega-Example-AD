define([
	// Application.
	"zeega",

	// Modules.
	'modules/index',

],

// generic App used
function(
	Zeega,
	Index
	) {

	// Defining the application router, you can attach sub routers here.
	/*

	the router is where your application/navigation logic goes

  */
	var Router = Backbone.Router.extend({
		routes: {

			"" : "index",
			'featured/:featured_id' : 'viewFeatured',

		},

		index: function()
		{
			initialize();
			Zeega.page = new Index.Model();

		},

		viewFeatured : function(featuredID)
		{
			initialize();
			Zeega.page = new Index.Model({featuredID: featuredID });
		},
	});

/*******************	BEGIN PRIMARY		**********************/

/*

tasks to take care of before the application can load
esp inserting the layout into the dom!

*/

	function initialize()
	{
		initPT();
	}

	// makes sure this happens on ly once per load
	var initPT = _.once( init );
	function init()
	{
		console.log('initing');
		// render the base layout into the dom
		// this happens only once
		var baseLayout = new Backbone.Layout({ el: "#main" });
		var baseView = Backbone.LayoutView.extend({ template: "base" });
		baseLayout.insertView(new baseView() );
		baseLayout.render();
	}

	return Router;

});
