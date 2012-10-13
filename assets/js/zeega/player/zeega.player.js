/*---------------------------------------------


	Object: Player
	The Zeega project web player. Part of Core.


	ideas:
	master list of layers/frames - loading/loaded to check against

---------------------------------------------*/

// This contains the module definition factory function, application state,
// events, and the router.

define([
  "zeega",
  // Libs
  "backbone",

  // Modules
  // Plugins
  'zeega_base/player/layer',
  //'zeega_base/player/layer.view.visual'
  'libs/modernizr'
],

function(Zeega, Backbone, Layer) {

	Zeega.Player = Backbone.Model.extend({

		ready : false,
		
		defaults : {
			appName : null,
			branding : true,
			chromeless : false,
			fadeOutOverlays : true,
			frameID : null,
			fullscreenEnabled : true,
			layerCitations : true,
			mode :'standalone',
			navbar : false,
            navbar_bottom : true,
            navbar_top : true,
 			playerCitation : false,
			social : true,
			viewportRatio : 4/3,
			viewportFull : true,
		},

		init : function()
		{
			this.parseProject( this.toJSON() );
			this.set( 'frameID', this.get('frameID') || this.project.sequences.at(0).frames.at(0).id );

			this.project.on('ready', this.onProjectReady, this );
			this.project.renderPlayer();
		},
		
		onProjectReady : function()
		{
			this.ready = true;
			this.project.off('ready', this.playProject );
			if(this.get('mode') != 'editor') this.startRouter();
			this.project.goToFrame( this.get('frameID') );
		},

		parseProject : function(data)
		{
			this.project = new Zeega.Player.ProjectModel( data );
			var _this = this;
			this.project.on('all', function(e,opts){ _this.trigger(e,opts) }); //pass along events from the project model
			this.project.load();
		},
		
		exit : function()
		{
			var _this = this;

			if( this.get('mode') != 'editor') clearInterval(this.fsCheck);

			if(document.exitFullscreen)					document.exitFullscreen();
			else if (document.mozCancelFullScreen)		document.mozCancelFullScreen();
			else if (document.webkitCancelFullScreen)	document.webkitCancelFullScreen();

			// remove the player div
			this.project.unrenderPlayer();

			if(this.get('mode') == 'editor') zeega.app.restoreFromPreview(); // needs fixin'

			//Backbone.history.stop();

			//this.trigger('player_exit');
			return false;
		},

		startRouter: function()
		{
			var _this = this;
			var Router = Backbone.Router.extend({

				routes : {
					//'frame/:frameID' : 'goToFrame'
				},

				goToFrame : function( frameID ){ _this.project.goToFrame(frameID) }

			});
			this.router = new Router();
			//Backbone.history.start();
		},


		/*********

			API fxns

		************/

		playPause : function()
		{
			this.project.playPause();
		},
		play : function()
		{
			this.project.play();
		},

		pause : function()
		{
			this.project.pause();
		},

		next : function()
		{
			this.project.goRight();
		},

		prev : function()
		{
			this.project.goLeft();
		},

		getSize : function()
		{
			var _this = this;
			var playerView = this.project.layout.getView(function(view){ return view.model === _this.project });
			var size = {
				height : playerView.$('#preview-media').height(),
				width : playerView.$('#preview-media').width()
			};
			return size;
		},

		getPosition : function()
		{
			var _this = this;
			var playerView = this.project.layout.getView(function(view){ return view.model === _this.project });
			return playerView.$('#preview-media').position();
		}

	})



	/*	MODELS 	*/

	Zeega.Player.ProjectModel = Backbone.Model.extend({
			
		editor : true,
		has_played : false,
		PRELOAD_ON_SEQUENCE : 2, // will preload n frames ahead/behind in sequence
		DELAY_AFTER_LOAD : 5000,

		initialize : function()
		{
			//var Layer = zeega.module('layer');
			var layerArray = [];
			_.each( this.get('layers'), function( layerData ){
				var layer = new Layer.Model( layerData, {player:true} );
				layer.id = parseInt(layer.id);
				layerArray.push( layer );
			});

			this.layers = new Zeega.Player.LayerCollection( layerArray );
			this.frames = new Zeega.Player.FrameCollection( this.get('frames'));
			this.sequences = new Zeega.Player.SequenceCollection( this.get('sequences'));
			this.unset('sequences');
			this.unset('frames');
			this.unset('layers');
			
		},
		
		load : function()
		{
			//	call the verify functions on the sequences and frames to make sure there is no bad data
			this.sequences.load( this );
			this.frames.load( this );
		},
		
		renderPlayer : function()
		{
			var _this = this;
			this.layout = new Backbone.Layout({
				el: "body",
				afterRender : function()
				{
					_this.trigger('ready');
				}
			});

			var playerView = new Zeega.Player.PlayerView({model:this})
			this.layout.insertView( playerView );
      
			// Render the layout into the DOM.
			this.layout.render(function(){
				playerView.initEvents();
			});
			
		},
		
		unrenderPlayer : function()
		{
			var _this = this;
			this.currentFrame.unrender();
			var playerView = this.layout.getView(function(view){ return view.model === _this });
			playerView.remove();
			_this.trigger('player_exit');
		},
		
		goToFrame : function( frameID )
		{
			this.cancelFrameAdvance();
			if(this.currentFrame) this.currentFrame.unrender( frameID );

			var frame = this.frames.get(frameID);
			
			if(frame.status == 'waiting')
			{
				frame.on('ready',this.renderFrame, this);
				frame.renderLoader();
			}
			else if( frame.status = 'ready')
			{
				this.renderFrame( frameID );
			}
			else if(frame.status == 'loading' && frame.isLoaded())
			{
				frame.onFrameLoaded();
				this.renderFrame( frameID );
			}
			this.preloadFrames(frame);
			

			//if(Zeega.player.get('mode') != 'editor') Zeega.player.router.navigate('frame/'+ frameID );
			this.currentFrame = frame;
		},
		
		preloadFrames : function(fr)
		{
			var _this = this;
			_.each( fr.framesToPreload, function(frameID){
				var frame = _this.frames.get(frameID);
				if(frame.status == 'waiting') frame.preload();
			})
		},
		
		renderFrame : function(frameID)
		{
			var _this = this;

			var frame = this.frames.get(frameID);
			var fromFrameID = this.currentFrame ? this.currentFrame.id : frameID;
			frame.render( fromFrameID );

			this.trigger('frame_rendered', frame);
			frame.on('timeupdate', function(opts){ _this.trigger('timeupdate',opts); })
			this.setFrameAdvance( frameID );

		},
		
		goLeft : function()
		{
			if( this.currentFrame.before ) this.goToFrame( this.currentFrame.before );
		},
		
		goRight : function()
		{
			if( this.currentFrame.after ) this.goToFrame( this.currentFrame.after );
		},

		play : function()
		{
			if( !this.currentFrame.isPlaying )
			{
				console.log('current frame', this.currentFrame, this.elapsedTime )
				var _this = this;
				//var remainingTime = this.currentFrame.get('attr').advance - this.elapsedTime;
				//this.timerStarted = new Date(); 
				//this.timer = setTimeout( function(){ _this.goRight() }, remainingTime );
				if( this.currentFrame.get('attr').advance > 0 )
					this.timer = setTimeout( function(){ _this.goRight() }, this.currentFrame.get('attr').advance )
				this.currentFrame.play();
			}
		},

		pause : function()
		{
			if( this.currentFrame.isPlaying )
			{
				this.cancelFrameAdvance();
				// var now = new Date();
				// var et = new Date( now - this.timerStarted );
				// this.elapsedTime += et.getTime();
				this.currentFrame.pause();
			}
		},

		/*
			play and pause layer media
			also will pick up and reset the timer for layers that have advance attributes set.
		*/
		playPause : function()
		{
			if( this.timer )
			{
				var _this = this;
				if(this.currentFrame.isPlaying)
				{

					this.cancelFrameAdvance();
					var now = new Date();
					var et = new Date( now - this.timerStarted );
					this.elapsedTime += et.getTime();
				}
				else
				{
					var remainingTime = this.currentFrame.get('attr').advance - this.elapsedTime;
					this.timerStarted = new Date(); 
					this.timer = setTimeout( function(){ _this.goRight() },remainingTime )
				}
			}
			this.currentFrame.playPause();
		},

		
		setFrameAdvance : function( id )
		{
			var frame = id ? this.frames.get(id) : this.currentFrame;

			if(this.timer) clearTimeout( this.t )
			var adv = frame.get('attr').advance;
			if( adv > 0) //after n milliseconds
			{
				var _this = this;
				this.autoAdvance = true;
				this.elapsedTime = 0;
				this.timerStarted = new Date(); 
				this.timer = setTimeout( function(){ _this.goRight() },adv )
			}
			else this.autoAdvance = false;

		},
		
		cancelFrameAdvance : function()
		{
			if(this.timer) clearTimeout( this.timer );
		}
		
	});
	



	

	
	Zeega.Player.SequenceModel = Backbone.Model.extend({
		
		load : function()
		{
			var _this = this;

			var frameModels = _.map( this.get('frames'), function(frameID){
				var frame = Zeega.player.project.frames.get(frameID);
				
				var index = _.indexOf( _this.get('frames'), frameID );
				
				var before = index > 0 ? _this.get('frames')[index-1] : null;
				var after = index+1 < _this.get('frames').length ? _this.get('frames')[index+1] : null;
				
				frame.setPosition(index, before, after);
				return frame;
			});
			this.frames = new Zeega.Player.FrameCollection( frameModels );
		},
		
		verify : function( project )
		{
			//	make sure all referenced frames are valid

			var brokenFrames = _.map( this.get('frames'), function(frameID){ 
				if( _.isUndefined( project.frames.get(frameID) ) ) return frameID;
			});
			if( _.compact(brokenFrames).length )
			{
				var frameArray = _.without( this.get('frames'), _.compact(brokenFrames) );
				this.set('frames', frameArray)
			}

			return this;
		}
	});

	Zeega.Player.SequenceCollection = Backbone.Collection.extend({

		model : Zeega.Player.SequenceModel,

		load : function( project )
		{
			this.each(function(sequence){ sequence.verify( project ).load() })
		}
	});




	
	Zeega.Player.FrameModel = Backbone.Model.extend({
		
		PRELOAD_ON_SEQUENCE : 2,
		status : 'waiting',
		
		initialize : function()
		{
			this.on('layer_ready', this.onLayerLoaded, this);
		},
		
		preload : function()
		{
			var _this = this;
			this.status = 'loading';

			// preload layers
			_.each( _.toArray(this.layers), function(layer){
				if(layer.status == 'waiting')
				{
					layer.on('ready', _this.onLayerReady, _this);
					layer.on('error', _this.onLayerError, _this);

					layer.status = 'loading';
					layer.player_onPreload();
					layer.on('timeupdate', function(opts){_this.trigger('timeupdate', opts)}); //relay timeupdates to the frame
				}
			})
		},
		
		onLayerReady : function(id)
		{
			var layer = this.layers.get(id);
			layer.off('ready');
			layer.status = 'ready'; // move this to the layer model?

			this.loaderView.onLayerUpdate( id, 'ready' );

			if( this.isLoaded() ) this.onFrameLoaded();
		},

		onLayerError : function(id)
		{
			var layer = this.layers.get(id);
			layer.off('error');

			this.loaderView.onLayerUpdate( id, 'error' );

			layer.status = 'error'; // move this to the layer model?
			if( this.isLoaded() ) this.onFrameLoaded();
		},

		onFrameLoaded : function()
		{
			var _this = this;
			_.delay(function(){
				_this.status = 'ready';
				_this.trigger('ready',_this.id);
			},5000);
		},

		play : function()
		{
			this.isPlaying = true;
			_.each( _.toArray(this.layers), function(layer){
				layer.typeVisual.play();
			})
		},

		pause : function()
		{
			this.isPlaying = false;
			_.each( _.toArray(this.layers), function(layer){
				layer.typeVisual.pause();
			})
		},

		playPause : function()
		{
			this.isPlaying = !this.isPlaying;
			_.each( _.toArray(this.layers), function(layer){
				layer.typeVisual.playPause();
			})
		},

		isLoaded : function()
		{
			var statusArray = _.map(_.toArray(this.layers),function(layer){ return layer.status });
			if( _.include(statusArray,'loading') || _.include(statusArray,'waiting') ) return false;
			else return true;
		},

		render : function( fromFrameID )
		{
			var _this = this;
			this.isPlaying = true;
			// display citations
			if(Zeega.player.get('layerCitations')) $('#citation-tray').html( this.citationView.render().el );

			// update arrows
			this.updateArrows();
			
			var layersToRender = _.without( this.get('layers'), this.commonLayers[fromFrameID] );

			// draw and update layer media
			_.each( this.get('layers'), function(layerID,z){
				var layer = _this.layers.get(layerID)
				if( _.include(_this.commonLayers, layerID) ) layer.updateZIndex( z );
				else layer.trigger('player_play', z );
			})

		},

		unrender : function( toFrameID )
		{
			var _this = this;
			this.isPlaying = false;

			var layersToUnrender = _.without( this.get('layers'), this.commonLayers[toFrameID] );
			_.each( layersToUnrender, function(layerID){
				_this.layers.get( layerID ).trigger('player_exit');
			})
		},

		renderLoader : function()
		{
			$('#loader-tray').html( this.loaderView.render().el );
		},
		
		load : function()
		{
			var layerModels = _.map( this.get('layers'), function(layerID){ return Zeega.player.project.layers.get(layerID) });
			this.layers = new Zeega.Player.LayerCollection( layerModels );

			if( this.layers.length == 0 ) this.status = 'ready';

			// determine and store connected and linked frames
			this.getLinks();
			// determine and store arrow state for frame (l, r, lr, none)
			this.setArrowState();

			// make and store loader view
			// make and store citations
			this.setViews();

			// determine and store persistent layers in and out of linked frames
		},
		
		verify : function( project )
		{
			//	make sure all referenced layers are valid
			var brokenLayers = _.map( this.get('layers'), function(layerID){
				var layer = project.layers.get(layerID);
				
				// remove missing layers and link layers with bad data
				if( _.isUndefined( layer ) ) return layerID;
				else if( layer.get('type') == 'Link')
				{
					var fromFrame = layer.get('attr').from_frame;
					var toFrame = layer.get('attr').to_frame;
					if( _.isUndefined( fromFrame ) && _.isUndefined( toFrame ) ) return layerID;
					else if( _.isUndefined( project.frames.get(fromFrame)) || _.isUndefined( project.frames.get(toFrame)) ) return layerID;
				}
			});
			if( _.compact(brokenLayers).length )
			{
				var frameArray = _.without( this.get('frames'), _.compact(brokenLayers) );
				this.set('layers', frameArray)
			}

			return this;
		},
		
		setPosition : function(index, before,after)
		{
			this.index = index;
			this.before = before;
			this.after = after;
		},

		setFramesToPreload : function()
		{
			var _this = this;
			this.framesToPreload = [this.id];
			var targetArray = [this.id];
			for( var i = 0 ; i < this.PRELOAD_ON_SEQUENCE ; i++)
			{
				_.each( targetArray, function(frameID){
					var before = Zeega.player.project.frames.get(frameID).before;
					var after = Zeega.player.project.frames.get(frameID).after;
					var linksOut = Zeega.player.project.frames.get(frameID).linksOut;
					var linksIn = Zeega.player.project.frames.get(frameID).linksIn;

					targetArray = _.compact([before,after]);
					_this.framesToPreload = _.union(_this.framesToPreload,targetArray,linksOut, linksIn);
				})
			}
			this.framesToPreload = _.uniq(this.framesToPreload);

			this.setCommonLayers();
		},

		// pre-determine common layers between this frame an all connected frames
		setCommonLayers : function()
		{
			var _this = this;
			this.commonLayers = {};
			_.each( this.framesToPreload, function(frameID){
				if( _this.id != frameID)
					_this.commonLayers[frameID] = _.intersection( Zeega.player.project.frames.get(frameID).get('layers'), _this.get('layers') );
			})
		},
		
		getLinks : function()
		{
			var _this = this;
			this.linksOut = [];
			this.linksIn = [];
			_.each( _.toArray( this.layers ), function(layer){
				if( layer.get('type') == 'Link' && !_.isUndefined(layer.get('attr').from_frame) && !_.isUndefined(layer.get('attr').to_frame)  )
				{
					if( layer.get('attr').from_frame == _this.id ) _this.linksOut.push( layer.get('attr').to_frame );
					else if( layer.get('attr').to_frame == _this.id )
					{
						// remove from this layer's link array too
						var layerArray = _this.get('layers');
						_this.set({layers: _.without(layerArray,layer.id)});
						_this.layers.remove(layer);
						_this.linksIn.push( layer.get('attr').from_frame );
					}
				
				}
			})
		},
		
		setArrowState : function()
		{
			if( this.get('attr').advance > 0 ) this.arrowState = 'none'; // if auto advance is selected
			else
			{
				if( _.isNull(this.before) && _.isNull(this.after) ) this.arrowState = 'none'; // if only frame in the sequence
				else if( _.isNull(this.before) ) this.arrowState = 'r'; // if no frame before
				else if( _.isNull(this.after) ) this.arrowState = 'l'; // if no frame after
				else this.arrowState = 'lr';
			}
		},
		
		setViews : function()
		{
			this.citationView = new Zeega.Player.CitationTrayView({model:this});
			this.loaderView = new Zeega.Player.LoaderView({model:this});
		},
		
		updateArrows : function()
		{
			switch(this.arrowState)
			{
				case 'none':
					if( $('#preview-left').is(':visible') ) $('#preview-left').fadeOut('fast');
					if( $('#preview-right').is(':visible') ) $('#preview-right').fadeOut('fast');
					break;
				case 'r':
					if( $('#preview-left').is(':visible') ) $('#preview-left').fadeOut('fast');
					if( $('#preview-right').is(':hidden') ) $('#preview-right').fadeIn('fast');
					break;
				case 'l':
					if( $('#preview-left').is(':hidden') ) $('#preview-left').fadeIn('fast');
					if( $('#preview-right').is(':visible') ) $('#preview-right').fadeOut('fast');
					break;
				case 'lr':
					if( $('#preview-left').is(':hidden') ) $('#preview-left').fadeIn('fast');
					if( $('#preview-right').is(':hidden') ) $('#preview-right').fadeIn('fast');
					break;
			}
		},
		
		
	});

	Zeega.Player.FrameCollection = Backbone.Collection.extend({

		model : Zeega.Player.FrameModel,

		load : function( project )
		{
			this.each(function(frame){ frame.verify( project ).load() });
			this.each(function(frame){ frame.setFramesToPreload() })
		}
	});


	/*		COLLECTIONS		*/


	Zeega.Player.LayerCollection = Backbone.Collection.extend({});


//////

/*		VIEWS		*/

	Zeega.Player.PlayerView = Backbone.View.extend({
		
		manage: true,

    	template: "player",

		isFullscreen : false,
		overlaysVisible : true,
		viewportRatio : 4/3,
		viewportFull : true,

		id : 'zeega-player',

		serialize : function()
		{
			var base = sessionStorage.getItem('hostname') + sessionStorage.getItem('directory');
			return _.extend( {url_base: base } ,this.model.toJSON());
		},

		initEvents : function()
		{
			var _this = this;

			this.$('#preview-media').css( this.getWindowSize() );

			$(window).bind( 'keydown', function(e){
			    switch(e.which)
				{
					case 27:
						//if(_this.model.editor) _this.exit(); //don't close if standalone player
						break;
					case 8:
						if(_this.model.editor) _this.exit(); //don't close if standalone player
						break;
					case 37:
						if( _this.model.autoAdvance != true ) _this.goLeft();
						break;
					case 39:
						if( _this.model.autoAdvance != true ) _this.goRight();
						break;
					case 32:
						_this.playPause();
						break;
				}
			});

			//resize player on window resize
			window.onresize = function(event)
			{
				//constrain proportions in player
				_this.$('#preview-media').clearQueue().animate( _this.getWindowSize() ,500, function(){_this.model.trigger('preview_resize');} );
			}

			if( Zeega.player.get('fadeOutOverlays') )
			{
				//	fadeout overlays after mouse inactivity
				var fadeOutOverlays = _.debounce(function(){_this.fadeOutOverlays()},5000);
				//hide all controls and citation
				onmousemove = function()
				{
					if( _this.overlaysVisible ) fadeOutOverlays( _this );
					else _this.fadeInOverlays();
				}
			}
			
		},

		getWindowSize : function()
		{
			var viewWidth = window.innerWidth;
			var viewHeight = window.innerHeight;

			var initial_size = {};
			console.log('vf ``		viewport full', this)
			if(this.model.get('viewportFull'))
			{
				if(viewWidth / viewHeight > this.viewportRatio)
				{
					initial_size.height = (viewWidth / this.viewportRatio)  +'px'; // 4/3
					initial_size.width = viewWidth +'px';
				}
				else
				{
					initial_size.height = viewHeight  +'px'; // 4/3
					initial_size.width = viewHeight * this.viewportRatio +'px';
				}
			}
			else
			{
				if( viewWidth / viewHeight > this.viewportRatio )
				{
					initial_size.height = viewHeight +'px';
					initial_size.width = viewHeight * this.viewportRatio +'px'
				}
				else
				{
					initial_size.height = viewWidth / this.viewportRatio +'px';
					initial_size.width = viewWidth +'px'
				}
			}
			return initial_size;
		},
		
		fadeOutOverlays : function()
		{
			this.overlaysVisible = false;
			this.$el.find('.player-overlay').fadeOut('slow');
		},
		
		fadeInOverlays : function()
		{
			this.overlaysVisible = true;
			this.$el.find('.player-overlay').fadeIn('fast');
		},
		

		unsetListeners : function()
		{
			$(window).unbind( 'keydown' ); //remove keylistener
			onmousemove = null;
		},
		
		events : {
			'click #preview-close' : 'exit',
			'click #preview-left' : 'goLeft',
			'click #preview-right' : 'goRight',

			'click .fullscreen' : 'toggleFullscreen',
		},
		
		exit : function()
		{
			this.unsetListeners();
			if(this.isFullscreen) this.leaveFullscreen();
			Zeega.player.exit();
			return false;
		},
		
		goLeft : function(){ this.model.goLeft() },
		goRight : function(){ this.model.goRight() },
		
		playPause : function()
		{
			this.model.playPause();
		},

		toggleFullscreen : function()
		{
			if(this.isFullscreen) this.leaveFullscreen();
			else this.goFullscreen();
			return false;
		},

		goFullscreen : function()
		{
			this.isFullscreen = true;
			docElm = document.getElementById('zeega-player');
					
			if (docElm.requestFullscreen) docElm.requestFullscreen();
			else if (docElm.mozRequestFullScreen) docElm.mozRequestFullScreen();
			else if (docElm.webkitRequestFullScreen) docElm.webkitRequestFullScreen();

			this.$el.find('.zicon-go-fullscreen').removeClass('zicon-go-fullscreen').addClass('zicon-exit-fullscreen');
		},

		leaveFullscreen : function()
		{
			this.isFullscreen = false;
			if (document.exitFullscreen) 				document.exitFullscreen();
			else if (document.mozCancelFullScreen) 		document.mozCancelFullScreen();
			else if (document.webkitCancelFullScreen) 	document.webkitCancelFullScreen();

			this.$el.find('.zicon-exit-fullscreen').removeClass('zicon-exit-fullscreen').addClass('zicon-go-fullscreen');
		}
	});

// could be turned into a layout!!
	Zeega.Player.CitationTrayView = Backbone.View.extend({

		tagName : 'ul',
		className : 'citation-list',
		
		render : function()
		{
			var _this = this;
			this.$el.empty();
			_.each( _.toArray(this.model.layers), function(layer){
				if( Zeega.player.get('appName') && Zeega.Player.CitationView[Zeega.player.get('appName')] )
					var citation = new Zeega.Player.CitationView[Zeega.player.get('appName')]({model:layer});
				else var citation = new Zeega.Player.CitationView({model:layer});

				_this.$el.append( citation.render().el );
				citation.delegateEvents();
			})
			
			return this;
		}
		
	});
	
	Zeega.Player.CitationView = Backbone.View.extend({
		
		tagName : 'li',

		render : function()
		{
			
			// need to add error state for icons!!
			this.$el.html( _.template( this.getTemplate(),this.model.toJSON()) );
			return this;
		},
		
		events : {
			'mouseover .citation-icon' : 'onMouseover',
			'mouseout .citation-icon' : 'onMouseout'
		},
		
		onMouseover : function()
		{
			if(this.model.status != 'error') this.$el.find('.citation-icon i').addClass('loaded');
			this.$el.find('.player-citation-bubble').show();
		},
		
		onMouseout : function()
		{
			this.$el.find('.citation-icon i').removeClass('loaded');
			this.$el.find('.player-citation-bubble').hide();
		},
		
		getTemplate : function()
		{
			
			var html =

				"<div class='player-citation-bubble clearfix hide'>"+
					"<div class='player-citation-content'>"+
						"<h3><%= attr.title %></h3>"+
						"<div class='content'><span class='citation-subhead'>DESCRIPTION:</span> <%= attr.description %></div>"+
						"<div class='creator'><span class='citation-subhead'>CREATED BY:</span> <%= attr.media_creator_realname %></div>";
						//"<div class='date-created'><span class='citation-subhead'>CREATED ON:</span> <%= attr.date_created %></div>";

					if( !_.isNull( this.model.get('attr').media_geo_longitude ) )
					{
						html += "<div class='location-created'><span class='citation-subhead'>LOCATION:</span> <%= attr.media_geo_longitude %>, <%= attr.media_geo_latitude %></div>";
					}
					html +=
						"<div class='trackback'><span class='citation-subhead'>click below to view original</span></div>"+
					"</div>"+
					"<div class='player-citation-thumb'><img src='<%= attr.thumbnail_url %>' height='100px' width='100px'/></div>"+
				"</div>";
			if(this.model.get('attr').archive =="Dropbox")	html+=	"<a href='<%= attr.attribution_uri %>' class='citation-icon' target='blank'><i class='zitem-<%= attr.media_type.toLowerCase() %> zitem-30'></i></a>";
			else if(!_.isUndefined(this.model.get('attr').archive )) html+=	"<a href='<%= attr.attribution_uri %>' class='citation-icon' target='blank'><i class='zitem-<% if( !_.isUndefined(attr.archive) ){ %><%= attr.archive.toLowerCase() %><% } %> zitem-30'></i></a>";
				
			return html;
		}
	});
	
	
	Zeega.Player.LoaderView = Backbone.View.extend({
		
		className : 'progress-bar',
		loadedCount : 0,

		render : function()
		{
			var _this = this;
			this.$el.html( _.template(this.getTemplate(), Zeega.player.project.toJSON() ) );

			this.$el.find('.progress-types ul').empty();
			_.each( _.toArray(this.model.layers), function(layer){
				
				if( layer.displayCitation != false && layer.get('type') != 'Link' )
				{
					if(layer.get('attr').archive=="Dropbox") var itemType = layer.get('type').toLowerCase();
					else var itemType = ( layer.get('attr').archive) ? layer.get('attr').archive.toLowerCase() : layer.get('type').toLowerCase();
					
					_this.$el.find('.progress-types ul').append('<li class="layer-load-icon-'+ layer.id +'"><i class="zitem-'+ itemType +'"></i></li>')
				}
			})

			this.$el.find('.bar')
				.stop()
				.animate({width : 0.25/this.model.get('layers').length * 100 +'%' },200)
				.animate({width : 0.75/this.model.get('layers').length * 100 +'%' },100000)

			return this;
		},
		
		onLayerUpdate : function( layerID, status )
		{
			var _this = this;
			
			this.loadedCount++;
			if(status == 'ready') this.$el.find('.layer-load-icon-'+ layerID +' i').addClass('loaded');
			else this.$el.find('.layer-load-icon-'+ layerID +' i').addClass('error');
			
			$(this.el).find('.bar')
				.stop()
				.animate({width : this.loadedCount/this.model.get('layers').length * 100 +'%' },2000)
				.animate({width : this.loadedCount*1.5/this.model.get('layers').length * 100 +'%' },100000);
			
			if(this.model.isLoaded() ) _.delay( function(){_this.fadeOut()}, 5000 );
		},
		
		fadeOut : function()
		{
			var _this = this;
			$(this.el).fadeOut('slow', function(){ _this.remove(); });
		},

		getTemplate : function()
		{
			html =
			
				"<div class='progress-head'>"+
					"<h6>Please be patient while we load this immersive experience.</h6>"+
				"</div></br>"+
				"<div class='progress progress-striped active progress-danger'>"+
					"<div class='bar' style='width:0'></div>"+
				"</div>";

				// "<div class='progress-head'>"+
				// 	"<h3 class='estimate'>Estimated time to experience this project. . .</h3>"+
				// 	"<h3 class='time'><%= estimated_time %></h3>"+
				// "</div>"+
				// "<div class='progress progress-striped active progress-danger'>"+
				// 	"<div class='bar' style='width:0'></div>"+
				// "</div>"+
				// "<div class='progress-types'>"+
				// 	"<ul></ul>"+
				// "</div>";
			
			return html;
		}
	});	


	return Zeega;

});