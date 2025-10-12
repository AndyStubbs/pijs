/**
 * Pi.js - Image Operations Module
 * 
 * Handles image loading, sprite sheets, and image drawing/manipulation.
 * 
 * @module modules/images
 */

export function init( pi ) {
	const piData = pi._.data;
	const m_piWait = pi._.wait;
	const m_piResume = pi._.resume;
	let m_callback = null;

	// LOADIMAGE - Load image from URL or element
	pi._.addCommand( "loadImage", loadImage, false, false, [ "src", "name" ] );

	function loadImage( args ) {
		let src = args[ 0 ];
		let name = args[ 1 ];
		let image;
		let callback;
		let tempOnload;

		if( typeof src === "string" ) {
			// Create a new image
			image = new Image();

			// Set the source
			image.src = src;
		} else {
			if( !src || ( src.tagName !== "IMG" && src.tagName !== "CANVAS" ) ) {
				const error = new TypeError(
					"loadImage: src must be a string, image element, or canvas."
				);
				error.code = "INVALID_IMAGE_SOURCE";
				throw error;
			}
			image = src;
		}

		if( typeof name !== "string" ) {
			name = "" + piData.imageCount;
			piData.imageCount += 1;
		}

		piData.images[ name ] = {
			"image": null,
			"type": "image"
		};

		// Store callback locally
		callback = m_callback;
		m_callback = null;

		if( !image.complete ) {
			m_piWait();
			if( pi.util.isFunction( image.onload ) ) {
				tempOnload = image.onload;
			}
			image.onload = function() {
				if( tempOnload ) {
					tempOnload();
				}
				piData.images[ name ].image = image;
				if( pi.util.isFunction( callback ) ) {
					callback();
				}
				m_piResume();
			};
		} else {
			piData.images[ name ].image = image;
			if( pi.util.isFunction( callback ) ) {
				callback();
			}
		}

		return name;
	}

	// LOADSPRITESHEET - Load spritesheet with grid or auto-detection
	pi._.addCommand( "loadSpritesheet", loadSpritesheet, false, false,
		[ "src", "name", "width", "height", "margin" ]
	);

	function loadSpritesheet( args ) {
		let src = args[ 0 ];
		let name = args[ 1 ];
		let spriteWidth = args[ 2 ];
		let spriteHeight = args[ 3 ];
		let margin = args[ 4 ];

		if( margin == null ) {
			margin = 0;
		}

		let isAuto = false;
		if( spriteWidth == null && spriteHeight == null ) {
			isAuto = true;
			spriteWidth = 0;
			spriteHeight = 0;
			margin = 0;
		}

		spriteWidth = Math.round( spriteWidth );
		spriteHeight = Math.round( spriteHeight );
		margin = Math.round( margin );

		// Validate spriteWidth and spriteHeight
		if(
			!isAuto && (
				!pi.util.isInteger( spriteWidth ) ||
				!pi.util.isInteger( spriteHeight )
			)
		) {
			const error = new TypeError(
				"loadSpriteSheet: width, and height must be integers."
			);
			error.code = "INVALID_SPRITE_SIZE";
			throw error;
		}

		// Size cannot be less than 1
		if( !isAuto && ( spriteWidth < 1 || spriteHeight < 1 ) ) {
			const error = new RangeError(
				"loadSpriteSheet: width, and height must be greater than 0."
			);
			error.code = "INVALID_SPRITE_SIZE";
			throw error;
		}

		// Validate margin
		if( !pi.util.isInteger( margin ) ) {
			const error = new TypeError( "loadSpriteSheet: margin must be an integer." );
			error.code = "INVALID_MARGIN";
			throw error;
		}

		// Validate name
		if( typeof name !== "string" ) {
			name = "" + piData.imageCount;
			piData.imageCount += 1;
		}

		// Load the frames when the image gets loaded
		m_callback = function() {

			// Update the image data
			const imageData = piData.images[ name ];
			imageData.type = "spritesheet";
			imageData.spriteWidth = spriteWidth;
			imageData.spriteHeight = spriteHeight;
			imageData.margin = margin;
			imageData.frames = [];
			imageData.isAuto = isAuto;

			// Prepare for loops
			const width = imageData.image.width;
			const height = imageData.image.height;

			if( imageData.isAuto ) {

				// Find all clusters of pixels (auto-detect sprites)
				const searched = {};
				const canvas = document.createElement( "canvas" );
				canvas.width = width;
				canvas.height = height;
				const context = canvas.getContext( "2d", { "willReadFrequently": true } );
				context.drawImage( imageData.image, 0, 0 );
				const dirs = [
					[ -1, -1 ], [ 0, -1 ], [ 1, -1 ],
					[ -1,  0 ],             [ 1,  0 ],
					[ -1,  1 ], [ 0,  1 ], [ 1,  1 ]
				];
				const data = context.getImageData( 0, 0, width, height ).data;

				// Helper: Get cluster of connected pixels (for auto-detection)
				function getCluster( x, y, frameData ) {
					const clusterName = x + "_" + y;
					if(
						searched[ clusterName ] || x < 0 || x >= width || 
						y < 0 || y >= height
					) {
						return;
					}

					const clusters = [];
					clusters.push( [ x, y, clusterName ] );

					while( clusters.length > 0 ) {
						const cluster = clusters.pop();
						x = cluster[ 0 ];
						y = cluster[ 1 ];
						const name = cluster[ 2 ];
						searched[ name ] = true;
						const index = ( x + y * width ) * 4;

						if( data[ index + 3 ] > 0 ) {
							frameData.x = Math.min( frameData.x, x );
							frameData.y = Math.min( frameData.y, y );
							frameData.right = Math.max( frameData.right, x );
							frameData.bottom = Math.max( frameData.bottom, y );
							frameData.width = frameData.right - frameData.x + 1;
							frameData.height = frameData.bottom - frameData.y + 1;

							for( let i = 0; i < dirs.length; i++ ) {
								const x2 = x + dirs[ i ][ 0 ];
								const y2 = y + dirs[ i ][ 1 ];
								const name2 = x2 + "_" + y2;
								if(
									!( searched[ name2 ] || x2 < 0 || x2 >= width || 
									y2 < 0 || y2 >= height )
								) {
									clusters.push( [ x2, y2, name2 ] );
								}
							}
						}
					}
				}

				// Read the alpha component of each pixel
				for( let i = 3; i < data.length; i += 4 ) {
					if( data[ i ] > 0 ) {
						const index = ( i - 3 ) / 4;
						const x1 = index % width;
						const y1 = Math.floor( index / width );
						const frameData = {
							"x": width,
							"y": height,
							"width": 0,
							"height": 0,
							"right": 0,
							"bottom": 0
						};
						getCluster( x1, y1, frameData );
						if( ( frameData.width + frameData.height ) > 4 ) {
							imageData.frames.push( frameData );
						}
					}
				}
			} else {

				// Grid-based sprite detection
				let x1 = imageData.margin;
				let y1 = imageData.margin;
				let x2 = x1 + imageData.spriteWidth;
				let y2 = y1 + imageData.spriteHeight;

				// Loop through all the frames
				while( y2 <= height - imageData.margin ) {
					while( x2 <= width - imageData.margin ) {
						imageData.frames.push( {
							"x": x1,
							"y": y1,
							"width": imageData.spriteWidth,
							"height": imageData.spriteHeight,
							"right": x1 + imageData.spriteWidth - 1,
							"bottom": y1 + imageData.spriteHeight - 1
						} );
						x1 += imageData.spriteWidth + imageData.margin;
						x2 = x1 + imageData.spriteWidth;
					}
					x1 = imageData.margin;
					x2 = x1 + imageData.spriteWidth;
					y1 += imageData.spriteHeight + imageData.margin;
					y2 = y1 + imageData.spriteHeight;
				}
			}
		};

		loadImage( [ src, name ] );

		return name;
	}

	// GETSPRITESHEETDATA - Get spritesheet frame information
	pi._.addCommand( "getSpritesheetData", getSpritesheetData, false, true, [ "name" ] );

	function getSpritesheetData( screenData, args ) {
		const name = args[ 0 ];

		// Validate name
		if( !piData.images[ name ] ) {
			const error = new Error( "getSpritesheetData: invalid sprite name" );
			error.code = "INVALID_SPRITE_NAME";
			throw error;
		}

		const sprite = piData.images[ name ];

		if( sprite.type !== "spritesheet" ) {
			const error = new Error( "getSpritesheetData: image is not a sprite" );
			error.code = "NOT_A_SPRITESHEET";
			throw error;
		}

		const spriteData = {
			"frameCount": sprite.frames.length,
			"frames": []
		};

		for( let i = 0; i < sprite.frames.length; i++ ) {
			spriteData.frames.push( {
				"index": i,
				"x": sprite.frames[ i ].x,
				"y": sprite.frames[ i ].y,
				"width": sprite.frames[ i ].width,
				"height": sprite.frames[ i ].height,
				"left": sprite.frames[ i ].x,
				"top": sprite.frames[ i ].y,
				"right": sprite.frames[ i ].right,
				"bottom": sprite.frames[ i ].bottom
			} );
		}

		return spriteData;
	}

	// GETIMAGE - Capture image from screen region
	pi._.addCommand( "getImage", getImage, false, true, [ "name", "x1", "y1", "x2", "y2" ] );

	function getImage( screenData, args ) {
		let name = args[ 0 ];
		const x1 = Math.round( args[ 1 ] );
		const y1 = Math.round( args[ 2 ] );
		const x2 = Math.round( args[ 3 ] );
		const y2 = Math.round( args[ 4 ] );

		if( isNaN( x1 ) || isNaN( y1 ) || isNaN( x2 ) || isNaN( y2 ) ) {
			const error = new TypeError( "getImage: parameters x1, x2, y1, y2 must be integers." );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		if( typeof name !== "string" ) {
			name = "" + piData.imageCount;
			piData.imageCount += 1;
		} else if( piData.images[ name ] ) {
			const error = new Error(
				`getImage: name ${name} is already used; name must be unique.`
			);
			error.code = "DUPLICATE_IMAGE_NAME";
			throw error;
		}

		const canvas = document.createElement( "canvas" );
		const context = canvas.getContext( "2d" );
		const width = Math.abs( x1 - x2 );
		const height = Math.abs( y1 - y2 );
		canvas.width = width;
		canvas.height = height;

		screenData.screenObj.render();
		context.drawImage( screenData.screenObj.canvas(), x1, y1, width, height, 0, 0, width, height );

		piData.images[ name ] = {
			"image": canvas,
			"type": "image"
		};

		return name;
	}

	// REMOVEIMAGE - Remove loaded image from cache
	pi._.addCommand( "removeImage", removeImage, false, false, [ "name" ] );

	function removeImage( args ) {
		const name = args[ 0 ];

		if( typeof name !== "string" ) {
			const error = new TypeError( "removeImage: name must be a string." );
			error.code = "INVALID_NAME";
			throw error;
		}

		delete piData.images[ name ];
	}

	// DRAWIMAGE - Draw image to screen
	pi._.addCommand( "drawImage", drawImage, false, true,
		[ "name", "x", "y", "angle", "anchorX", "anchorY", "alpha", "scaleX", "scaleY" ]
	);

	function drawImage( screenData, args ) {
		const name = args[ 0 ];
		const x = args[ 1 ];
		const y = args[ 2 ];
		const angle = args[ 3 ];
		const anchorX = args[ 4 ];
		const anchorY = args[ 5 ];
		const alpha = args[ 6 ];
		const scaleX = args[ 7 ];
		const scaleY = args[ 8 ];

		let img;

		if( typeof name === "string" ) {
			if( !piData.images[ name ] ) {
				const error = new Error( "drawImage: invalid image name" );
				error.code = "INVALID_IMAGE_NAME";
				throw error;
			}
			img = piData.images[ name ].image;
		} else {
			if( !name || ( !name.canvas && !name.getContext ) ) {
				const error = new TypeError(
					"drawImage: image source object type must be an image " +
					"already loaded by the loadImage command or a screen."
				);
				error.code = "INVALID_IMAGE_SOURCE";
				throw error;
			}
			if( pi.util.isFunction( name.canvas ) ) {
				img = name.canvas();
			} else {
				img = name;
			}
		}

		if( isNaN( x ) || isNaN( y ) ) {
			const error = new TypeError( "drawImage: parameters x and y must be numbers" );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		drawItem( screenData, img, x, y, angle, anchorX, anchorY, alpha, null, scaleX, scaleY );
	}

	// DRAWSPRITE - Draw sprite frame to screen
	pi._.addCommand( "drawSprite", drawSprite, false, true,
		[
			"name", "frame", "x", "y", "angle", "anchorX", "anchorY",
			"alpha", "scaleX", "scaleY"
		]
	);

	function drawSprite( screenData, args ) {
		const name = args[ 0 ];
		const frame = args[ 1 ];
		const x = args[ 2 ];
		const y = args[ 3 ];
		const angle = args[ 4 ];
		const anchorX = args[ 5 ];
		const anchorY = args[ 6 ];
		const alpha = args[ 7 ];
		const scaleX = args[ 8 ];
		const scaleY = args[ 9 ];

		// Validate name
		if( !piData.images[ name ] ) {
			const error = new Error( "drawSprite: invalid sprite name" );
			error.code = "INVALID_SPRITE_NAME";
			throw error;
		}

		// Validate frame
		if(
			!pi.util.isInteger( frame ) ||
			frame >= piData.images[ name ].frames.length ||
			frame < 0
		) {
			const error = new RangeError( "drawSprite: frame number is not valid" );
			error.code = "INVALID_FRAME";
			throw error;
		}

		if( isNaN( x ) || isNaN( y ) ) {
			const error = new TypeError( "drawSprite: parameters x and y must be numbers" );
			error.code = "INVALID_COORDINATES";
			throw error;
		}

		const img = piData.images[ name ].image;

		drawItem(
			screenData, img, x, y, angle, anchorX, anchorY, alpha,
			piData.images[ name ].frames[ frame ], scaleX, scaleY
		);
	}

	// Helper: Draw image or sprite with transformations
	function drawItem(
		screenData, img, x, y, angle, anchorX, anchorY, alpha, spriteData, scaleX, scaleY
	) {
		if( scaleX == null || isNaN( Number( scaleX ) ) ) {
			scaleX = 1;
		}

		if( scaleY == null || isNaN( Number( scaleY ) ) ) {
			scaleY = 1;
		}

		if( angle == null ) {
			angle = 0;
		}

		// Convert the angle from degrees to radian
		angle = pi.util.degreesToRadian( angle );

		if( !anchorX ) {
			anchorX = 0;
		}
		if( !anchorY ) {
			anchorY = 0;
		}

		if( !alpha && alpha !== 0 ) {
			alpha = 255;
		}

		if( spriteData ) {
			anchorX = Math.round( spriteData.width * anchorX );
			anchorY = Math.round( spriteData.height * anchorY );
		} else {
			anchorX = Math.round( img.width * anchorX );
			anchorY = Math.round( img.height * anchorY );
		}

		const context = screenData.context;
		const oldAlpha = context.globalAlpha;
		context.globalAlpha = ( alpha / 255 );

		screenData.screenObj.render();

		context.translate( x, y );
		context.rotate( angle );
		context.scale( scaleX, scaleY );

		if( spriteData == null ) {
			context.drawImage( img, -anchorX, -anchorY );
		} else {
			context.drawImage(
				img,
				spriteData.x, spriteData.y, spriteData.width, spriteData.height,
				-anchorX, -anchorY, spriteData.width, spriteData.height
			);
		}

		context.scale( 1 / scaleX, 1 / scaleY );
		context.rotate( -angle );
		context.translate( -x, -y );
		context.globalAlpha = oldAlpha;

		piData.commands.resetImageData( screenData );
	}
}

