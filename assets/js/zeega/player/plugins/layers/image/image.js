define([
  "zeega",
  "backbone",
  'zeega_layers/_layer/_layer'
],

function(Zeega, Backbone, _Layer){

	var Layer = Zeega.module();

	Layer.Image = _Layer.extend({
			
		layerType : 'Image',

		defaultAttributes : {
			'title' : 'Image Layer',
			'url' : 'none',
			'left' : 0,
			'top' : 0,
			'height' : 100,
			'width' : 100,
			'opacity':1,
			'aspect':1.33,
			'citation':true,
			
			'linkable' : true
		},

		controls : [
			
			{
				type : 'checkbox',
				property : 'dissolve',
				label : 'Fade In'
			},
			{
				type : 'slider',
				property : 'width',
				label : 'Scale',
				suffix : '%',
				min : 1,
				max : 200
			},
			{
				type : 'slider',
				property : 'opacity',
				label : 'Scale',
				step : 0.01,
				min : 0.05,
				max : 1
			}

		]

	});

	Layer.Image.Visual = _Layer.Visual.extend({
		
		template : '<img id="image-<%= id %>"  width="100%"/>',

		render : function()
		{
			this.$el.html( _.template(this.template, this.model.toJSON()) );
			return this;
		},
		
		player_onPreload : function()
		{

			var _this=this;
			var supportsCanvas = !!document.createElement('canvas').getContext;
			if (supportsCanvas) {
				var canvas = document.createElement('canvas'), 
				context = canvas.getContext('2d'), 
				imageData, px, length,  gray, 
				img = new Image();
				
				img.onload=function(){
					canvas.width = img.width;
					canvas.height = img.height;
					context.drawImage(img, 0, 0);
					imageData = context.getImageData(0, 0, canvas.width, canvas.height);
					px = imageData.data;
					length = px.length;
				
					for (var i = 0; i < length; i += 4) {
						gray = px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11;
						px[i] = px[i + 1] = px[i + 2] = gray;
					}
							
					context.putImageData(imageData, 0, 0);

					_this.$el.find('img').attr('src',canvas.toDataURL());
					_this.model.trigger('ready',_this.model.id);
				}
				img.crossOrigin='';
				img.src = this.model.get('attr').uri;
			} else {
				$('#image-'+this.model.id).attr('src',this.model.get('attr').uri);
			}
		}
	});

	return Layer;

})
