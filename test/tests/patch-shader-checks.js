/** Asymmetric source and independent pass assertions shared by browser and visual tests. */
window.runPatchShaderChecks = async function() {
	await $.ready();
	const source = document.createElement( "canvas" );
	source.width = source.height = 8;
	const context = source.getContext( "2d" );
	const colors = [ "#ff0000", "#00ff00", "#0000ff", "#ffff00" ];
	const expected = [ [ 255, 0, 0 ], [ 0, 255, 0 ], [ 0, 0, 255 ], [ 255, 255, 0 ] ];
	const points = [ [ 1, 1 ], [ 6, 1 ], [ 1, 6 ], [ 6, 6 ] ];
	colors.forEach( ( color, index ) => {
		context.fillStyle = color;
		context.fillRect( index % 2 * 4, Math.floor( index / 2 ) * 4, 4, 4 );
	} );
	const image = new Image();
	image.src = source.toDataURL();
	await image.decode();
	const bitmap = await createImageBitmap( source );
	const offCanvas = new OffscreenCanvas( 8, 8 );
	offCanvas.getContext( "2d" ).drawImage( source, 0, 0 );
	const namedCanvas = $.loadImage( source, "patch-canvas" );
	const namedImage = $.loadImage( image, "patch-image" );
	const video = document.createElement( "video" );
	video.width = video.height = 8;
	video.muted = true;
	video.srcObject = source.captureStream( 30 );
	const track = video.srcObject.getVideoTracks()[ 0 ];
	const header = `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
out vec4 fragColor;
`;
	const identity = $.createShader( header +
		"void main() { fragColor = texture(u_texture, v_texCoord); }" );
	const mix = $.createShader( header + `uniform sampler2D u_map;
void main() {
	fragColor = 0.5 * (texture(u_texture, v_texCoord) + texture(u_map, v_texCoord));
}` );
	const array = $.createShader( header + `uniform sampler2D u_maps[2];
void main() {
	fragColor = 0.5 * texture(u_texture, v_texCoord) +
		0.25 * texture(u_maps[0], v_texCoord) + 0.25 * texture(u_maps[1], v_texCoord);
}` );
	let checked = 0;
	const results = [];
	function checkPixel( pixel, corner, label ) {

		// Allow small video conversion / privacy readback differences, not flipped corners.
		const tolerance = 3;
		if( expected[ corner ].some( ( value, i ) =>
			Math.abs( value - pixel[ i ] ) > tolerance
		) || pixel[ 3 ] !== 255 ) {
			throw new Error( label + ": corner " + corner + " is " + pixel );
		}
	}
	function check( screen, label ) {
		points.forEach( ( point, index ) => {
			const pixel = screen.getPixel( ...point );
			checkPixel( pixel.array, index, label );
		} );
		checked++;
	}
	try {

		// Timed capture works without CanvasCaptureMediaStreamTrack.requestFrame (Firefox).
		// Keep painting only until a decoded frame arrives, with bounded cleanup on failure.
		let timeout;
		let callback;
		const repaint = setInterval( () => context.drawImage( image, 0, 0 ), 33 );
		try {
			const decoded = new Promise( ( resolve, reject ) => {
				timeout = setTimeout( () => reject( new Error( "video decode timeout" ) ), 5000 );
				callback = video.requestVideoFrameCallback( resolve );
			} );
			await Promise.all( [ decoded, video.play() ] );
		} finally {
			clearInterval( repaint );
			clearTimeout( timeout );
			if( callback !== undefined ) { video.cancelVideoFrameCallback( callback ); }
			video.pause();
		}
		for( const isOffscreen of [ false, true ] ) {
			const dest = $.screen( { "aspect": "8x8",
				"isOffscreen": isOffscreen, "noCss": true } );
			const shared = $.screen( { "aspect": "8x8", "isOffscreen": true, "parent": dest } );
			const separate = $.screen( { "aspect": "8x8", "isOffscreen": true } );
			const visible = $.screen( { "aspect": "8x8", "noCss": true } );
			for( const screen of [ shared, separate, visible ] ) { screen.drawImage( source, 0, 0 ); }
			const sources = [ source, offCanvas, context.getImageData( 0, 0, 8, 8 ), bitmap,
				image, namedCanvas, namedImage, video, shared, separate, visible ];
			for( const [ index, input ] of sources.entries() ) {
				dest.drawImage( input, 0, 0 );
				check( dest, "draw " + index );
				dest.applyShader( identity );
				check( dest, "identity " + index );
				dest.applyShader( mix, { "u_map": input } );
				check( dest, "first " + index );
				dest.applyShader( mix, { "u_map": input } );
				check( dest, "second " + index );
				dest.applyShader( array, { "u_maps": [ input, source ] } );
				check( dest, "array " + index );
				dest.setDisplayShader( mix, { "u_map": input } );
				await new Promise( resolve => requestAnimationFrame( resolve ) );
				check( dest, "display leaves FBO " + index );
				if( !isOffscreen ) {
					const copy = document.createElement( "canvas" );
					copy.width = copy.height = 8;
					const ctx = copy.getContext( "2d" );
					ctx.drawImage( dest.canvas(), 0, 0, 8, 8 );
					points.forEach( ( point, corner ) => {
						const pixel = ctx.getImageData( ...point, 1, 1 ).data;
						checkPixel( pixel, corner, "display " + index );
					} );
					results.push( ctx.getImageData( 0, 0, 8, 8 ) );
				}
				dest.setDisplayShader( null );
			}
			for( const screen of [ shared, separate, visible, dest ] ) { screen.removeScreen(); }
		}
	} finally {
		track.stop();
		bitmap.close();
		$.removeImage( namedCanvas ); $.removeImage( namedImage );
		for( const shader of [ identity, mix, array ] ) { $.removeShader( shader ); }
	}

	// Render all samples through Pi.js, using integer scaling and no DOM gallery or fonts.
	const output = $.screen( "640x160" );
	output.setColor( "#222222" );
	output.rect( 0, 0, 640, 160, "#222222" );
	results.forEach( ( image, index ) => {
		output.drawImage( { "image": image, "x": 16 + index * 48, "y": 60,
			"scaleX": 5, "scaleY": 5 } );
	} );
	await new Promise( resolve => requestAnimationFrame( resolve ) );
	return checked;
};
