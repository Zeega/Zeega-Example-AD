var layerTypes = [
	'image',
	'rectangle',
	'text',
	'video',
	'audio',
	'link',
	'popup',
	'geo'
];

define([
	'zeega_layers/image/image',
	'zeega_layers/rectangle/rectangle',
	'zeega_layers/text/text',
	'zeega_layers/video/video',
	'zeega_layers/audio/audio',
	'zeega_layers/link/link',
	'zeega_layers/popup/popup',
	'zeega_layers/geo/geo'
],
	function(
		image,
		rectangle,
		text,
		video,
		audio,
		link,
		popup,
		geo
	)
	{
		eval('var Plugins = _.extend('+ layerTypes.toString() +')');
		return Plugins;
	}
)