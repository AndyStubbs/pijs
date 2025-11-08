const g_Fonts = {};
let g_FontId = 0;
let g_FontsLoading = 0;
let g_FontsLoaded = 0;

const images = document.querySelectorAll( "#images img" );
for( let i = 0; i < images.length; i++ ) {
	const width = parseInt( images[ i ].dataset.width );
	const height = parseInt( images[ i ].dataset.height );
	const margin = parseInt( images[ i ].dataset.margin );
	loadFont( images[ i ], width, height, margin );
}

function loadFont( img, width, height, margin ) {
	const previewCanvas = document.createElement( "canvas" );
	previewCanvas.width = img.width;
	previewCanvas.height = img.height;
	previewCanvas.className = "font-preview";
	img.insertAdjacentElement( "afterend", previewCanvas );

	// Set the font data
	const font = {
		"id": g_FontId++,
		"width": width,
		"height": height,
		"margin": margin,
		"img": img,
		"data": [],
		"previewCanvas": previewCanvas
	};

	// Add to global fonts
	g_Fonts[ font.id ] = font;

	g_FontsLoading += 1;

	setTimeout( function () {
		getFontData( font );
	}, 1 );

}

function getFontData( font ) {

	// Create a new canvas to read the pixel data
	const canvas = document.createElement( "canvas" );
	const context = canvas.getContext( "2d", { "willReadFrequently": true } );
	canvas.width = font.img.width;
	canvas.height = font.img.height;

	// Draw the image onto the canva
	context.drawImage( font.img, 0, 0 );

	// Get the image data
	const data = context.getImageData( 0, 0, font.img.width, font.img.height );
	const imgWidth = font.img.width;
	const imgHeight = font.img.height;
	const TOTAL_CHARS = 256;
	const layout = getFontLayout( imgWidth, imgHeight, font.width, font.height, TOTAL_CHARS );
	const charsPerRow = layout.charsPerRow;
	const rows = layout.rows;
	const cellWidth = layout.cellWidth;
	const cellHeight = layout.cellHeight;
	let padX = Math.max( Math.floor( ( cellWidth - font.width ) / 2 ), 0 );
	let padY = Math.max( Math.floor( ( cellHeight - font.height ) / 2 ), 0 );
	let offsetsResolved = false;
	font.data.length = 0;

	// Loop through all characters in the atlas
	for( let i = 0; i < TOTAL_CHARS; i++ ) {
		const col = i % charsPerRow;
		const row = Math.floor( i / charsPerRow );
		const cellX = col * cellWidth;
		const cellY = row * cellHeight;
		let xStart = cellX + padX;
		let yStart = cellY + padY;

		if( yStart >= imgHeight ) {
			break;
		}

		if( !offsetsResolved ) {
			let minX = cellWidth;
			let minY = cellHeight;
			let maxX = -1;
			let maxY = -1;

			for( let cy = 0; cy < cellHeight; cy++ ) {
				const globalY = cellY + cy;
				if( globalY >= imgHeight ) {
					break;
				}

				for( let cx = 0; cx < cellWidth; cx++ ) {
					const globalX = cellX + cx;
					if( globalX >= imgWidth ) {
						break;
					}

					const idx = globalY * ( imgWidth * 4 ) + globalX * 4;
					const r = data.data[ idx ];
					const g = data.data[ idx + 1 ];
					const b = data.data[ idx + 2 ];
					const a = data.data[ idx + 3 ];
					if( ( r > 1 || g > 1 || b > 1 ) && a > 1 ) {
						if( cx < minX ) {
							minX = cx;
						}
						if( cy < minY ) {
							minY = cy;
						}
						if( cx > maxX ) {
							maxX = cx;
						}
						if( cy > maxY ) {
							maxY = cy;
						}
					}
				}
			}

			if( maxX >= minX && maxY >= minY ) {
				const potentialPadX = minX;
				const potentialPadY = minY;
				if(
					potentialPadX + font.width <= cellWidth &&
					potentialPadY + font.height <= cellHeight
				) {
					padX = potentialPadX;
					padY = potentialPadY;
					xStart = cellX + padX;
					yStart = cellY + padY;
					offsetsResolved = true;
				}
			}
		}

		font.data.push( [] );
		for( let y = yStart; y < yStart + font.height; y++ ) {
			const rowData = [];
			font.data[ i ].push( rowData );

			if( y >= imgHeight ) {
				for( let x = 0; x < font.width; x++ ) {
					rowData.push( 0 );
				}
				continue;
			}

			for( let x = xStart; x < xStart + font.width; x++ ) {
				if( x >= imgWidth ) {
					rowData.push( 0 );
					continue;
				}

				const index = y * ( imgWidth * 4 ) + x * 4;
				const r = data.data[ index ];
				const g = data.data[ index + 1 ];
				const b = data.data[ index + 2 ];
				const a = data.data[ index + 3 ];
				if( ( r > 1 || g > 1 || b > 1 ) && a > 1 ) {
					rowData.push( 1 );
				} else {
					rowData.push( 0 );
				}
			}
		}
	}

	g_FontsLoaded += 1;

	if( g_FontsLoaded === g_FontsLoading ) {
		writeCompressedFont();
	}

}

function writeCompressedFont() {
	const BYTE_SIZES = [];

	// Add byte sizes to try
	for( let bs = 5; bs <= 52; bs += 1 ) {
		for( let bb = 5; bb <= 36; bb += 1 ) {
			BYTE_SIZES.push( [ bs, bb ] );
		}
	}

	const COMPRESSION_FNS = [
		compressFont
	];

	let totalSize = 0;
	let msg = `"use strict";\n\n`;

	for( const i in g_Fonts ) {
		const font = g_Fonts[ i ];

		let bestFontStr = "";
		let bestFontSize = Infinity;
		let bestByteSize = "";
		let bestByteBase = "";
		for( const sizes of BYTE_SIZES ) {
			for( const compressionFn of COMPRESSION_FNS ) {
				let fontStr = compressionFn( font.data, sizes[ 0 ], sizes[ 1 ] );
				let fontSize = fontStr.length;
				if( fontSize < bestFontSize ) {
					bestFontStr = fontStr;
					bestFontSize = fontSize;
					bestByteSize = sizes[ 0 ];
					bestByteBase = sizes[ 1 ];
				}
			}
		}
		
		totalSize += bestFontSize;
		msg += `// Font ${font.width + "x" + font.height}\n// String length: ${bestFontSize}\n`;
		msg += `// Compression: ${bestByteSize}x${bestByteBase}\n`;
		msg += `const m_font${font.width}x${font.height} = {\n`;
		msg += `\t"byteSize": ${bestByteSize},\n`;
		msg += `\t"byteBase": ${bestByteBase},\n`;
		msg += `\t"width": ${font.width},\n`;
		msg += `\t"height": ${font.height},\n`;
		msg += `\t"margin": ${font.margin},\n`;
		msg += `\t"str": "${bestFontStr}"\n`;
		msg += "};\n\n";

		drawFontPreview(
			font,
			bestFontStr,
			bestByteSize,
			bestByteBase
		);
	}

	msg = `// Total Size: ${totalSize} bytes\n\n` + msg;
	document.getElementById( "fontTextArea" ).innerHTML += msg;
}

function compressFont( font, byteSize, byteBase ) {
	let bitStr = "";
	let dataStr = "";

	for( let i = 0; i < font.length; i++ ) {
		bitStr += getBits( font[ i ] );
	}

	for( let i = 0; i < bitStr.length; i += byteSize ) {
		const j = i + byteSize;
		let byteStr;
		if( j > bitStr.length ) {
			byteStr = bitStr.substring( i );
			while( byteStr.length < byteSize ) {
				byteStr += "0";
			}
		} else {
			byteStr = bitStr.substring( i, j );
		}
		const numStr = parseInt( byteStr, 2 ).toString( byteBase );
		dataStr += numStr + ",";
	}

	dataStr = dataStr.substring( 0, dataStr.length - 1 );

	//return encodeMessage( dataStr );
	return dataStr;
}

function getBits( fontData ) {
	let bits = "";
	for( let i = 0; i < fontData.length; i++ ) {
		for( let j = 0; j < fontData[ i ].length; j++ ) {
			bits += fontData[ i ][ j ];
		}
	}
	return bits;
}

function getFontLayout( imgWidth, imgHeight, charWidth, charHeight, totalChars ) {
	let best = {
		"charsPerRow": Math.max( Math.floor( imgWidth / charWidth ), 1 ),
		"rows": Math.max( Math.floor( imgHeight / charHeight ), 1 ),
		"cellWidth": charWidth,
		"cellHeight": charHeight,
		"score": Number.POSITIVE_INFINITY
	};

	const divisors = [];
	for( let i = 1; i <= totalChars; i++ ) {
		if( totalChars % i === 0 ) {
			divisors.push( i );
		}
	}

	for( let i = 0; i < divisors.length; i++ ) {
		const charsPerRow = divisors[ i ];
		const rows = totalChars / charsPerRow;
		const cellWidth = Math.floor( imgWidth / charsPerRow );
		const cellHeight = Math.floor( imgHeight / rows );

		if( cellWidth < charWidth || cellHeight < charHeight ) {
			continue;
		}

		const wastedX = cellWidth - charWidth;
		const wastedY = cellHeight - charHeight;
		const score = ( wastedX * wastedX ) + ( wastedY * wastedY );

		if( score < best.score ) {
			best = {
				"charsPerRow": charsPerRow,
				"rows": rows,
				"cellWidth": cellWidth,
				"cellHeight": cellHeight,
				"score": score
			};
		}
	}

	if( best.score !== Number.POSITIVE_INFINITY ) {
		return best;
	}

	const fallbackCharsPerRow = Math.max( Math.floor( imgWidth / charWidth ), 1 );
	const fallbackRows = Math.max( Math.floor( imgHeight / charHeight ), 1 );
	return {
		"charsPerRow": fallbackCharsPerRow,
		"rows": fallbackRows,
		"cellWidth": Math.floor( imgWidth / fallbackCharsPerRow ),
		"cellHeight": Math.floor( imgHeight / fallbackRows ),
		"score": 0
	};
}

function decompressFont( numStr, width, height, byteSize, byteBase, charCount ) {
	const data = [];

	if( !numStr ) {
		return data;
	}

	const nums = ( "" + numStr ).split( "," );
	let bin = "";

	for( let i = 0; i < nums.length; i++ ) {
		const value = parseInt( nums[ i ], byteBase );
		if( isNaN( value ) ) {
			continue;
		}
		let binSegment = value.toString( 2 );
		while( binSegment.length < byteSize ) {
			binSegment = "0" + binSegment;
		}
		bin += binSegment;
	}

	const bitsPerChar = width * height;
	const totalChars = charCount || Math.floor( bin.length / bitsPerChar );
	let index = 0;

	for( let charIndex = 0; charIndex < totalChars; charIndex++ ) {
		const charData = [];
		for( let y = 0; y < height; y++ ) {
			const row = [];
			for( let x = 0; x < width; x++ ) {
				let bit = 0;
				if( index < bin.length ) {
					bit = bin.charAt( index ) === "1" ? 1 : 0;
					index += 1;
				}
				row.push( bit );
			}
			charData.push( row );
		}
		data.push( charData );
	}

	return data;
}

function drawFontPreview( font, fontStr, byteSize, byteBase ) {
	const canvas = font.previewCanvas;
	if( !canvas ) {
		return;
	}

	const context = canvas.getContext( "2d", { "willReadFrequently": true } );
	const width = canvas.width;
	const height = canvas.height;
	const imageData = context.createImageData( width, height );
	const buffer = imageData.data;
	const charData = decompressFont(
		fontStr,
		font.width,
		font.height,
		byteSize,
		byteBase,
		font.data.length
	);

	let xStart = 0;
	let yStart = 0;

	for( let i = 0; i < charData.length; i++ ) {
		const char = charData[ i ];
		for( let y = 0; y < font.height; y++ ) {
			for( let x = 0; x < font.width; x++ ) {
				const bit = char && char[ y ] ? char[ y ][ x ] : 0;
				if( bit === 1 ) {
					const destX = xStart + x;
					const destY = yStart + y;
					if( destX < width && destY < height ) {
						const destIndex = ( destY * width + destX ) * 4;
						buffer[ destIndex ] = 255;
						buffer[ destIndex + 1 ] = 255;
						buffer[ destIndex + 2 ] = 255;
						buffer[ destIndex + 3 ] = 255;
					}
				}
			}
		}

		xStart += font.width;
		if( xStart >= width ) {
			xStart = 0;
			yStart += font.height;
			if( yStart >= height ) {
				break;
			}
		}
	}

	context.putImageData( imageData, 0, 0 );
}
