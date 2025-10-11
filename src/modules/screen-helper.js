/**
 * Pi.js - Screen Helper Functions Module
 * 
 * Helper functions for screen operations, color resolution, pixel operations,
 * blend modes, and pen drawing.
 * 
 * @module modules/screen-helper
 */

export function init( pi ) {
	const piData = pi._.data;

	// Blend Commands

	pi._.addBlendCommand( "normal", normalBlend );

	function normalBlend( screenData, x, y, c ) {
		const data = screenData.imageData.data;

		// Calculate the index
		const i = ( ( screenData.width * y ) + x ) * 4;

		data[ i ] = c.r;
		data[ i + 1 ] = c.g;
		data[ i + 2 ] = c.b;
		data[ i + 3 ] = c.a;
	}

	pi._.addBlendCommand( "blend", blendPixel );

	function blendPixel( screenData, x, y, c ) {
		const data = screenData.imageData.data;

		// Calculate the index
		const i = ( ( screenData.width * y ) + x ) * 4;

		// displayColor = sourceColor × alpha / 255 + backgroundColor × (255 – alpha) / 255
		// blend = ( source * source_alpha) + destination * ( 1 - source_alpha)
		const pct = c.a / 255;
		const pct2 = ( 255 - c.a ) / 255;

		data[ i ] = ( c.r * pct ) + data[ i ] * pct2;
		data[ i + 1 ] = ( c.g * pct ) + data[ i + 1 ] * pct2;
		data[ i + 2 ] = ( c.b * pct ) + data[ i + 2 ] * pct2;
	}

	// ImageData Helpers

	pi._.addCommand( "getImageData", getImageData, true, false );

	function getImageData( screenData ) {
		if( screenData.dirty === false || screenData.imageData === null ) {
			screenData.imageData = screenData.context.getImageData(
				0, 0, screenData.width, screenData.height
			);
		}
	}

	pi._.addCommand( "resetImageData", resetImageData, true, false );

	function resetImageData( screenData ) {
		screenData.imageData = null;
	}

	pi._.addCommand( "setImageDirty", setImageDirty, true, false );

	function setImageDirty( screenData ) {
		if( screenData.dirty === false ) {
			screenData.dirty = true;

			if(
				screenData.isAutoRender &&
				!screenData.autoRenderMicrotaskScheduled
			) {
				screenData.autoRenderMicrotaskScheduled = true;

				pi.util.queueMicrotask( function() {
					if( screenData.screenObj && screenData.isAutoRender ) {
						screenData.screenObj.render();
					}
					screenData.autoRenderMicrotaskScheduled = false;
				} );
			}
		}
	}

	// Pixel Operations

	pi._.addCommand( "setPixel", setPixel, true, false );

	function setPixel( screenData, x, y, c ) {
		screenData.blendPixelCmd( screenData, x, y, c );
	}

	pi._.addCommand( "setPixelSafe", setPixelSafe, true, false );
	pi._.addPen( "pixel", setPixelSafe, "square" );

	function setPixelSafe( screenData, x, y, c ) {
		if( x < 0 || x >= screenData.width || y < 0 || y >= screenData.height ) {
			return;
		}

		piData.commands.getImageData( screenData );
		c = getPixelColor( screenData, c );
		screenData.blendPixelCmd( screenData, x, y, c );
		piData.commands.setImageDirty( screenData );
	}

	pi._.addCommand( "getPixelColor", getPixelColor, true, false );

	function getPixelColor( screenData, c ) {
		const noise = screenData.pen.noise;

		if( !noise ) {
			return c;
		}

		const c2 = { "r": c.r, "g": c.g, "b": c.b, "a": c.a };
		const half = noise / 2;

		if( pi.util.isArray( noise ) ) {
			c2.r = pi.util.clamp(
				Math.round( c2.r + pi.util.rndRange( -noise[ 0 ], noise[ 0 ] ) ),
				0, 255
			);
			c2.g = pi.util.clamp(
				Math.round( c2.g + pi.util.rndRange( -noise[ 1 ], noise[ 1 ] ) ),
				0, 255
			);
			c2.b = pi.util.clamp(
				Math.round( c2.b + pi.util.rndRange( -noise[ 2 ], noise[ 2 ] ) ),
				0, 255
			);
			c2.a = pi.util.clamp(
				c2.a + pi.util.rndRange( -noise[ 3 ], noise[ 3 ] ),
				0, 255
			);
		} else {
			const change = Math.round( Math.random() * noise - half );
			c2.r = pi.util.clamp( c2.r + change, 0, 255 );
			c2.g = pi.util.clamp( c2.g + change, 0, 255 );
			c2.b = pi.util.clamp( c2.b + change, 0, 255 );
		}

		return c2;
	}

	// Pen Drawing Functions

	pi._.addCommand( "drawSquarePen", drawSquarePen, true, false );
	pi._.addPen( "square", drawSquarePen, "square" );

	function drawSquarePen( screenData, x, y, c ) {
		// Size must always be an odd number
		const size = screenData.pen.size * 2 - 1;

		// Compute the center offset of the square
		const offset = Math.round( size / 2 ) - 1;

		// Draw the square
		for( let y2 = 0; y2 < size; y2++ ) {
			for( let x2 = 0; x2 < size; x2++ ) {
				piData.commands.setPixelSafe(
					screenData,
					x2 + x - offset,
					y2 + y - offset,
					c
				);
			}
		}

		piData.commands.setImageDirty( screenData );
	}

	pi._.addCommand( "drawCirclePen", drawCirclePen, true, false );
	pi._.addPen( "circle", drawCirclePen, "round" );

	function drawCirclePen( screenData, x, y, c ) {
		// Special case for pen size 2
		if( screenData.pen.size === 2 ) {
			piData.commands.setPixelSafe( screenData, x, y, c );
			piData.commands.setPixelSafe( screenData, x + 1, y, c );
			piData.commands.setPixelSafe( screenData, x - 1, y, c );
			piData.commands.setPixelSafe( screenData, x, y + 1, c );
			piData.commands.setPixelSafe( screenData, x, y - 1, c );
			piData.commands.setImageDirty( screenData );
			return;
		}

		// Double size to get the size of the outer box
		const size = screenData.pen.size * 2;

		// Half is size of radius
		const half = screenData.pen.size;

		// Calculate the center of circle
		const offset = half - 1;

		// Loop through the square boundary outside of the circle
		for( let y2 = 0; y2 < size; y2++ ) {
			for( let x2 = 0; x2 < size; x2++ ) {

				// Compute the coordinates
				const x3 = x2 - offset;
				const y3 = y2 - offset;

				// Compute the radius of point - round to make pixel perfect
				const r = Math.round( Math.sqrt( x3 * x3 + y3 * y3 ) );

				// Only draw the pixel if it is inside the circle
				if( r < half ) {
					piData.commands.setPixelSafe( screenData, x3 + x, y3 + y, c );
				}
			}
		}

		piData.commands.setImageDirty( screenData );
	}

	pi._.addCommand( "getPixelInternal", getPixelInternal, true, false );

	function getPixelInternal( screenData, x, y ) {
		const data = screenData.imageData.data;

		// Calculate the index of the color
		const i = ( ( screenData.width * y ) + x ) * 4;

		return {
			"r": data[ i ],
			"g": data[ i + 1 ],
			"b": data[ i + 2 ],
			"a": data[ i + 3 ]
		};
	}

	pi._.addCommand( "getPixelSafe", getPixelSafe, true, false );

	function getPixelSafe( screenData, x, y ) {
		piData.commands.getImageData( screenData );
		return getPixelInternal( screenData, x, y );
	}

	// Color Resolution

	pi._.addCommand( "findColorValue", findColorValue, true, false );

	function findColorValue( screenData, colorInput, commandName ) {
		let colorValue;

		if( pi.util.isInteger( colorInput ) ) {
			if( colorInput > screenData.pal.length ) {
				const error = new RangeError(
					`${commandName}: parameter color is not a color in the palette.`
				);
				error.code = "COLOR_OUT_OF_RANGE";
				throw error;
			}
			colorValue = screenData.pal[ colorInput ];
		} else {
			colorValue = pi.util.convertToColor( colorInput );
			if( colorValue === null ) {
				const error = new TypeError(
					`${commandName}: parameter color is not a valid color format.`
				);
				error.code = "INVALID_COLOR";
				throw error;
			}
		}

		return colorValue;
	}

	// Set defaults
	piData.defaultPenDraw = setPixelSafe;
	piData.defaultBlendCmd = normalBlend;
}

