define(['layerModel', 'layerView'], function(){

(function(Layer){

	Layer.Mapbox = Layer.Model.extend({
			
		layerType : 'Mapbox',
		

		defaultAttributes: {
		
			'title' : 'Mapbox Layer',
			'left' : 0,
			'top' : 0,
			'height' : 100,
			'width' : 100,
			'opacity':1,
			'aspect':1.33,
			'citation':true,
			'media_geo_latitude':  40.7774,
			'media_geo_longitude' : -73.9606,
			'attributes':{
				zoom:12,
				maxzoom: 18,
				minzoom:0,
			},
			'zoomControl':12,
			'interaction':false,
			
		},
		
	});
	
	Layer.Views.Controls.Mapbox = Layer.Views.Controls.extend({

		render : function()
		{
			var dissolveCheck = new Layer.Views.Lib.Checkbox({
				property : 'dissolve',
				model: this.model,
				label : 'Fade In'
			});
			
			var widthSlider = new Layer.Views.Lib.Slider({
				property : 'width',
				model: this.model,
				label : 'Width',
				suffix : '%',
				min : 1,
				max : 200,
			});
			
			var heightSlider = new Layer.Views.Lib.Slider({
				property : 'height',
				model: this.model,
				label : 'Height',
				suffix : '%',
				min : 1,
				max : 200,
			});
			
			var opacitySlider = new Layer.Views.Lib.Slider({
				property : 'opacity',
				model: this.model,
				label : 'Opacity',
				step : 0.01,
				min : .05,
				max : 1,
			});
			
			var leftSlider = new Layer.Views.Lib.Slider({
				property : 'left',
				model: this.model,
				label : 'Left',
				suffix : '%',
				step : 1,
				min : 0,
				max : 100,
			});
			
			var topSlider = new Layer.Views.Lib.Slider({
				property : 'top',
				model: this.model,
				label : 'Top',
				step : 1,
				suffix : '%',
				min : 0,
				max : 100,
			});
			
			this.controls
				.append( dissolveCheck.getControl() )
				.append( widthSlider.render().el )
				.append( heightSlider.render().el )
				.append( topSlider.render().el )
				.append( leftSlider.render().el )
				.append( opacitySlider.render().el );
			
			return this;
		
		}
		
	});

	Layer.Views.Visual.Mapbox = Layer.Views.Visual.extend({
		
		draggable : false,
		linkable : true,
		
		render : function()
		{
			
			this.tileUrl='http://{s}.tiles.mapbox.com/v3/'+this.attr.uri+'/{z}/{x}/{y}.png',
   			this.tileLayer = new L.TileLayer(this.tileUrl, {minZoom: this.attr.attributes.minzoom,maxZoom: this.attr.attributes.maxzoom, attribution: ''});
			this.latlng=new L.LatLng(parseFloat(this.attr.media_geo_latitude),parseFloat(this.attr.media_geo_longitude));

			$(this.el).css( {
				'width' : this.attr.width+ '%',
				'height' : this.attr.height +'%'
			});
			
			$(this.el).html( $('<div>')
				.css({'width':'100%','height':'100%'})
				.addClass('cloud-map')
				);
				
			return this;
		},
		
		editor_onLayerEnter : function()
		{
			
			var div = $(this.el).find('.cloud-map').get(0);
		  	var mapOptions ={ 
		  		minZoom: this.attr.attributes.minzoom,
		  		maxZoom: this.attr.attributes.maxzoom, 
		  		scrollWheelZoom:false,
		  		zoomControl:false,
		  		doubleClickZoom:false
		  	}
		  	
		  	
			this.map = new L.Map(div,mapOptions);

			this.map.setView(this.latlng, this.attr.attributes.zoom).addLayer(this.tileLayer);
			
			//Save position and zoom level of map
			
			var _this=this;
			this.map.on('zoomend', function(e) {
				_this.model.update({attributes : {zoom: e.target.getZoom()} });
				_this.attr.attributes.zoom =e.target.getZoom();
			});
			
			
			this.map.on('dragend', function(e) {
				_this.model.update({media_geo_latitude : e.target.getCenter().lat, media_geo_longitude : e.target.getCenter().lng });
				_this.latlng=e.target.getCenter();
			});
			
			
			this.zoomControl = new L.Control.Zoom();
			this.map.addControl(this.zoomControl);
		},
		
		
		player_onPreload : function()
		{

			var div = $(this.el).find('.cloud-map').get(0);
			this.map = new L.Map(div,{minZoom: this.attr.attributes.minzoom,maxZoom: this.attr.attributes.maxzoom, scrollWheelZoom:false,zoomControl:false,doubleClickZoom:false});
			this.map.setView(this.latlng, this.attr.attributes.zoom).addLayer(this.tileLayer);
			
			//Save position and zoom level of map
			
			var _this=this;
			this.map.on('zoomend', function(e) {
				_this.model.update({zoom :  e.target.getZoom() });
			});
			
			
			this.map.on('dragend', function(e) {
				_this.model.update({media_geo_latitude : e.target.getCenter().lat, media_geo_longitude : e.target.getCenter().lng });
			});
			
			
			this.zoomControl = new L.Control.Zoom();
			this.map.addControl(this.zoomControl);
			this.model.trigger('ready',this.model.id);
		}
		
		
	});
	
})(zeega.module("layer"));

})