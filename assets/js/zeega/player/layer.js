define([
  "zeega",
  // Libs
  "backbone",

  // Modules
  // Plugins
  'zeega_base/player/plugins.layers'
],

function(zeega, Backbone, Layers){

	var Layer = zeega.module();

	Layer.Model = Backbone.Model.extend({
		
		status : 'waiting',
		editorWindow : $('#visual-editor-workspace'),
		layerPanel : $('#layers-list-visual'),
		player : false,

		url : function()
		{
			if( this.isNew() ) return zeega.app.url_prefix + 'api/projects/'+ zeega.app.project.id +'/layers';
			else return zeega.app.url_prefix + "api/layers/" + this.id;
		},
		
		initialize: function(attributes,options)
		{
			if( options ) _.extend(this,options);

			this.load();
			this.startListeners();
		},

		load : function()
		{
			this.typeModel = new Layers[this.get('type')]({parent:this});
			this.typeVisual = new Layers[this.get('type')].Visual({model:this, attributes:{
				'id': 'layer-visual-'+this.id,
				'class': 'visual-element layer-'+ this.get('type').toLowerCase()
			}});

			var def = _.defaults( this.get('attr'), this.typeModel.defaultAttributes );
			this.set('attr',def); // set the layer default attr if they don't exist in the layer

			//this.controls = new // figure this out later
		},

		startListeners : function()
		{
			this.on('ready', this.ready, this);
			// 
			if( this.player )
			{
				this.on('player_preload', this.player_onPreload, this);
				this.on('player_play', this.player_onPlay, this);
				this.on('player_pause', this.player_onPause, this);
				this.on('player_play-pause', this.player_onPlayPause, this);
				this.on('player_exit', this.player_onExit, this);
				this.on('player_unrender', this.player_onUnrender, this);
				this.on('error', this.player_onRenderError, this);
			}
			else
			{
				this.on('editor_layerEnter', this.editor_onLayerEnter, this);
				this.on('editor_layerExit editor_removeLayerFromFrame', this.editor_onLayerExit, this);
				this.on('editor_controlsOpen', this.editor_onControlsOpen, this);
				this.on('editor_controlsClosed', this.editor_onControlsClosed, this);
			}
		},

		onReady : function(){},


		/*	player actions	*/

		player_onPreload : function()
		{
			$('#preview-media').append( this.typeVisual.render().el );
			this.typeVisual.$el.css({
				'width' : this.get('attr').width+'%',
				'opacity' : this.get('attr').opacity,
				// if previewing, then set way off stage somewhere
				'top' : (this.player) ? '-1000%' : this.get('attr').top +'%',
				'left' : (this.player) ? '-1000%' : this.get('attr').left+'%'
			});

			this.typeModel.player_onPreload();
			this.typeVisual.player_onPreload();
		},
		player_onPlay : function(z)
		{
			this.updateZIndex( z );

			this.moveOnStage();
			this.typeModel.player_onPlay();
			this.typeVisual.player_onPlay();
		},
		player_onPause : function()
		{
			this.typeModel.player_onPause();
			this.typeVisual.player_onPause();
		},
		player_onPlayPause : function()
		{
			if( this.isPlaying )
			{
				this.isPlaying = false;
				this.player_onPause();
			}
			else
			{
				this.isPlaying = true;
				this.player_onPlay();
			}
		},
		player_onExit : function()
		{
			this.moveOffStage();
			this.typeModel.player_onExit();
			this.typeVisual.player_onExit();
		},
		player_onUnrender : function()
		{
			this.typeModel.player_onUnrender();
			this.typeVisual.player_onUnrender();
		},
		player_onRenderError : function()
		{
			this.typeModel.player_onRenderError();
			this.typeVisual.player_onRenderError();
		},

		/*	editor actions	*/

		/*	needs implementation	*/

		editor_onLayerEnter : function()
		{

		},
		editor_onLayerExit : function()
		{

		},
		editor_onControlsOpen : function()
		{

		},
		editor_onControlsClosed : function()
		{

		},
		
		/*		utilities		*/

		moveOnStage :function()
		{
			this.typeVisual.$el.css({
				'top' : this.get('attr').top +'%',
				'left' : this.get('attr').left+'%'
			});
		},
		
		moveOffStage :function()
		{
			this.typeVisual.$el.css({
				'top' : '-1000%',
				'left' : '-1000%'
			});
		},

		updateZIndex : function( z )
		{
			this.typeVisual.$el.css('z-index', z);
		}

	});

	Layer.Views.Visual = Backbone.View.extend({
				
		LAYER_TIMEOUT : 30000,
		
		layerClassName : '',
		
		draggable : true,
		linkable : true,
		
		initialize : function()
		{
			
		},
		
		initListeners : function()
		{
			//editor_removeLayerFromFrame
			if( this.model.player )
			{
				this.model.on('player_preload', this.private_onPreload, this);
				this.model.on('player_play', this.private_onPlay, this);
				this.model.on('player_exit', this.private_onExit, this);
				this.model.on('player_unrender', this.private_onUnrender, this);
				this.model.on('error', this.private_renderError, this);
			}
			else
			{
				this.model.on('editor_layerEnter editor_layerRender', this.private_onLayerEnter, this);
				this.model.on('editor_layerExit editor_removeLayerFromFrame', this.private_onLayerExit, this);
				this.model.on('editor_controlsOpen', this.private_onControlsOpen, this);
				this.model.on('editor_controlsClosed', this.private_onControlsClosed, this);
			}
		},
		
		events : {},
		eventTriggers : {},
		
		init : function(){},
		
		/*******************
		
		PUBLIC EDITOR FUNCTIONS
		
		*******************/
		
		onLayerEnter : function(){},
		
		onLayerExit : function()
		{
			this.model.trigger('editor_readyToRemove');
		},
		
		onControlsOpen : function(){},
		
		onControlsClosed : function(){},
		
		// cleanupEditor : function(){},
		
		
		/*******************
		
		PUBLIC PLAYER FUNCTIONS
		
		*******************/
		

		private_renderError : function()
		{
			this.typeClass.$el.empty()
				.css({
					'background-color' : 'rgba(255,0,0,0.25)',
					'min-height' : '25px'
				});
				return this;
		},

		playPause : function()
		{
			if( this.isPlaying )
			{
				this.isPlaying = false;
				this.onPause();
			}
			else
			{
				this.isPlaying = true;
				this.onPlay();
			}
		},

		onPause : function(){},
		
		onPlay : function(){},
		
		onExit : function(){},
		
		onUnrender : function(){},
		
		
		/*******************
		
		PRIVATE EDITOR FUNCTIONS
		
		*******************/
		
		private_onLayerEnter : function()
		{
			if(this.draggable) this.makeDraggable();
			this.onLayerEnter();
		},
		
		private_onLayerExit : function()
		{
			this.model.on('editor_readyToRemove', this.remove, this );
			this.onLayerExit();
		},
		
		private_onControlsOpen : function()
		{
			this.onControlsOpen();
		},
		
		private_onControlsClosed : function()
		{
			this.onControlsClosed();
		},
		
		////// HELPERS //////
		
		makeDraggable : function()
		{
			var _this = this;
			$(this.el).draggable({
				
				start : function(e,ui)
				{
				},
				
				stop : function(e,ui)
				{
					//convert to % first // based on parent
					var topCent = ( ui.position.top / $(this).parent().height() ) * 100;
					var leftCent = ( ui.position.left / $(this).parent().width() ) * 100;
					
					_this.model.update({
						top: topCent,
						left: leftCent
					});
				}
			});
		},
		
		/*******************
		
		PRIVATE PLAYER FUNCTIONS
		
		*******************/
		
		private_onPreload : function()
		{
			var _this = this;
			
			this.typeClass.onPreload();

			if(this.timer) clearTimeout(this.timer);
			this.timer = setTimeout(function(){
				if(_this.model.status != 'ready')
				{
					console.log('ERROR: LAYER TIMEOUT!! '+_this.model.id);
					_this.model.status = 'error';
					_this.model.trigger('error', _this.model.id);
				}
				//else console.log('no error! loaded normally!!');
			},this.LAYER_TIMEOUT);
		},
		
		private_onPlay : function( z )
		{
			this.isPlaying = true;
			if(!this.onStage)
			{
				this.onStage = true;
				if(this.model.get('attr').dissolve) $(this.el).clearQueue().css({opacity:0.01});
			}
			this.moveOnStage();

			if(z) this.updateZIndex( z );

			if(this.model.status != 'error' ) this.model.layerTypeModel.onPlay();

			this.model.inFocus = true;
			
			//dissolve
			if(this.model.get('attr').dissolve) $(this.el).fadeTo(1000,this.model.get('attr').opacity);
			
			//make the linked layers blink on entrance
			if(this.model.get('attr').link || this.model.get('type') == 'Link')
			{
				var _this = this;
				setTimeout( function(){ $(_this.el).addClass('link-blink'); }, 250 );
				setTimeout( function(){ $(_this.el).removeClass('link-blink'); }, 2000 );
			}
		},
		
		private_onExit : function()
		{
			this.isPlaying = false;
			this.moveOffStage();
			this.onStage=false;
			this.onExit();
			this.model.inFocus = false;
		},
		
		private_onUnrender : function()
		{
			this.onUnrender();
			this.model.inFocus = false;
			this.model.rendered = false;
			this.remove();
		},
		
		////// HELPERS //////
		
		moveOnStage :function()
		{
			this.typeClass.$el.css({
				'top' : this.model.get('attr').top +'%',
				'left' : this.model.get('attr').left+'%'
			});
		},
		
		updateZIndex : function( z )
		{
			this.typeClass.$el.css('z-index', z);
		},
		
		moveOffStage :function()
		{
			this.typeClass.$el.css({
				'top' : '-1000%',
				'left' : '-1000%'
			});
		}
		
	});

	return Layer;

});