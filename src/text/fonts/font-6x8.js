/**
 * Pi.js - Font 6x8 Module
 * 
 * Default bitmap font for Pi.js with 6x8 pixel character glyphs in 8x10 character cells.
 * Uses a custom base32-encoded format for synchronous font loading, enabling immediate text
 * rendering without requiring the $.ready() command to wait for font assets to load.
 * 
 * This font is unique among Pi.js fonts in that it uses base32 encoding instead of Base64
 * WebP encoding. While WebP offers better compression and ease of use, the base32 encoding
 * allows the font data to be embedded directly in JavaScript, enabling synchronous loading
 * and making it ideal for simple "Hello World" examples that don't require async asset
 * management.
 * 
 * The font provides a complete ASCII character set (0-255) with retro-style bitmap glyphs.
 * Characters are 6 pixels wide and 8 pixels tall, with each character occupying an 8x10
 * pixel cell to provide spacing between characters.
 * 
 * @module text/fonts/font-6x8
 * @see /tools/fonts/gen-fonts.js - Font encoding script
 * 
 * @example
 * // Font is automatically loaded as the default font on initialization
 * $.print( "Hello, World!" );
 */

// Font 6x8
// String length: 2431
// Compression: 48x36
const m_font6x8 = {
	"byteSize": 48,
	"byteBase": 36,
	"width": 6,
	"height": 8,
	"margin": 0,
	"str": "0,1blc8udu8u,1cbkhzwsm6,wpp1xfvgg,coebolreo,d5nukh2cc,coe2eccv0,65jplhc,2rrpnxyccf,0,0,azkg0jpqw,j5ihd7hxo,nly3soshc,nly42td40,dkvajkdak,1f2tcd2lts,39po4vukg,d6e29q3uw,voa3n9udc,1dd8ay5r40,majymyen0,4r8g0,d6e2i2i4f,d6ebp7j7k,co4b4mebk,7307h2ww,78xcoo3k,80mu96o,g90j3o5c,74q25kao,1j83fxkao,0,d5xai464g,vo9y0dkao,voutnk5q8,d7qk1tfr4,18caako74,cyn4y7kow,co7x9kqgw,cvgmd4740,p51ihjmyo,hnt6v75s,3khmlszk,pow,8bnthc,pog,wl5log0,18hslmrwg0,d2kxm9lkw,18halx058g,18haltkhkw,6japxtny8,2pg5ex9zwg,j3ykqif40,2phicbtjpc,18hqina874,18hqj26t4w,74i0nugw,74i0nuhc,6fqfmdlog,ukzeakg,p51hxkg74,18hajmifpc,18hwjobyf4,cyzwjl3ls,2lzffaao74,j5phy2vpc,2lzfcieqdc,2p3nb23s74,2p3nb23lkw,j5phz0lfk,1huhdyxjsw,17ukqfasqo,lxadcq0ow,26fz67fm4g,2fp5guls3k,1ic4kdfc74,1i8m9a9g8w,18hqkb7shs,2lzff9z94w,18hqkb8hs3,2lzffb8jnk,18hpizqeio,2pokva2znk,1huh678wsg,1huh677nk0,1huh8gfaww,1hi03e73pc,1hua29iwow,2phicbv6v4,2g3ele8o3k,1eo82xhoow,2fi0wks268,cyzw9tpmo,1r,co2068kjk,dtwj5q8,23860tetq8,e2shedc,9eixrx874,e2x5s74,j5hseuwhs,d3a881o,23881h7i4g,chbdmk9hc,34buepwv0,23870bnr7k,11m2zty1vk,pz8ndz4,m3d2d8g,e2ssmww,tqjd4qg,d3uih3i,qu79kao,f1qczy8,pcts9aups,h1ch2f4,h1cfgn4,h3ln400,gxcj3i8,h1cgbzw,um4hny8,9jvh9ef7k,co3z8madc,2311eu3da8,t4svfdzi8,7aoozlhc,18hpkro330,vkry6glc,ipvap80sg,18hleduav4,1h0inglklc,11faaz7pfk,chbclspz4,e28hnkc,18hnlvwutc,1h0kuyo4jk,11fciha9ds,1k4rjs1hj4,18hlfeludc,11fabzz8xs,1h7hguv81s,co0929o5c,9dlbfia9s,orcjkhs,mbrplsz28,cyj2ztqm8,ttkqcjcw,p4zq8wp34,cyj4nraww,p4zrwu9ds,ttme9pr0,1h7hgqgmww,1h0ntdz280,cof2w6djc,j5hsewhkw,1hikteekn4,2m32k36f3m,iyd2l9grc,ipt375gu8,ipt47x0cg,6fiigughs,3mhmfvgg,15lstet6kg,15gjbpd9xc,18jink6l1c,12b0vaw3k0,ch3jttxc0,hcdfk0,h7m8lc,tc5on8j33,tc4p4v62q,e18f6vi8,91vaa29s,zcpsr7r4,rdwjrp3dw,xrpq1jqei,2cwu2vechn,co41gj1fs,co41o0qh4,corq1de6g,fu5215hu2,9p8y2,row8vm0,fuso6leh6,fu51tnssq,ulsat8q,fuso76zgg,fu521r2tc,corq1cohs,8rcw8,co41hlnnk,co41p3cow,9uoso,co41hmdc8,9tz40,co41p42dk,co7hskgso,fu51ttf2i,fu5j1pts0,7gmtnka,fut5enfgg,v2zr98q,fu5j148sq,v30cu80,fut5e1uh6,cov45hcsg,fu521wp34,v30djwo,9uv7u,fu51uf01s,co7hsjr40,7gnfy88,2d66i,fu521xl6y,cov6detjc,co41o00sg,2czrc,2rrvthnxtr,9zldr,2gosa7pa2g,b33j9ynrb,2rrvt7ocg0,cnr79s0,p16ep15s,1iubfwjy8,rrfz0t4w,2phoaj5qbk,f408g74,g19nt3xc,mg0a7ocg,2ov1ky6o8u,j5q8b5xc0,j5pzx5vpc,m7xcjszuo,geqgaku8,1mantcco0,j3ykq5kw0,18hqkb7ssg,r6vxlclc,couodj5hc,ckirtofwg,cvghtiikg,9kr8exk3s,co41glw60,j00j709hc,mfz9m9s0,j5ifndeyo,3dqjuo,1vf9c,b0fboebd8,2g6yvj277k,12an04etc0,e13wsn4,0"
};

export function getFontImage() {
	const charWidth = m_font6x8.width;
	const charHeight = m_font6x8.height;
	const margin = m_font6x8.margin;
	const cellWidth = m_font6x8.width + margin * 2;
	const cellHeight = m_font6x8.height + margin * 2;
	const width = cellWidth * 64;
	const height = cellHeight * 4;
	const chars = decompressFont( m_font6x8 );
	
	// Clear memory
	m_font6x8.str = "";

	// Create a Uint8ClampedArray for pixel data
	const data = new Uint8ClampedArray( width * height * 4 );

	let x = margin;
	let y = margin;
	for( const char of chars ) {

		// Write the char data to the screen
		for( let dataY = 0; dataY < charHeight; dataY += 1 ) {
			for( let dataX = 0; dataX < charWidth; dataX += 1 ) {
				const bit = char[ dataY ][ dataX ];
				if( bit === 1 ) {
					const i = ( ( width * ( y + dataY ) ) + ( x + dataX ) ) * 4;
					data[ i ] = 255;
					data[ i + 1 ] = 255;
					data[ i + 2 ] = 255;
					data[ i + 3 ] = 255;
				}
			}
		}

		// Increment to next character
		x += cellWidth;
		if( x >= width ) {
			x = margin;
			y += cellHeight;
		}
	}

	// Create ImageData from the array
	const imageData = new ImageData( data, width, height );

	// Create the canvas and draw the image data
	const canvas = document.createElement( "canvas" );
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext( "2d" );
	context.putImageData( imageData, 0, 0 );

	return canvas;
}

function decompressFont( fontData ) {
	let numStr = fontData.str;
	const width = fontData.width;
	const height = fontData.height;
	const byteSize = fontData.byteSize;
	const byteBase = fontData.byteBase;
	let bin = "";
	const data = [];
	
	numStr = "" + numStr;
	const nums = numStr.split( "," );

	// Loop through all the base-32 numbers
	for( let i = 0; i < nums.length; i++ ) {

		// Convert base-32 string to binary string
		let num = parseInt( nums[ i ], byteBase ).toString( 2 );

		// Pad the front with 0's so that num has length of 32
		while( num.length < byteSize ) {
			num = "0" + num;
		}

		// Add to the binary string
		bin += num;
	}

	// Loop through all the bits and build character data
	let i = 0;
	if( bin.length % byteSize > 0 ) {
		console.warn( "loadFont: Invalid font data." );
		return data;
	}

	while( i < bin.length ) {

		// Push a new character onto data
		data.push( [] );

		// Store the index of the font character
		const index = data.length - 1;

		// Loop through all rows
		for( let y = 0; y < height; y += 1 ) {

			// Push a new row onto the character data
			data[ index ].push( [] );

			// Loop through columns in this row
			for( let x = 0; x < width; x += 1 ) {

				let num;
				if( i >= bin.length ) {
					num = 0;
				} else {
					num = parseInt( bin[ i ] );
					if( isNaN( num ) ) {
						num = 0;
					}
				}

				// Push the bit onto the character
				data[ index ][ y ].push( num );

				// Increment the bit position
				i += 1;
			}
		}
	}

	return data;
}