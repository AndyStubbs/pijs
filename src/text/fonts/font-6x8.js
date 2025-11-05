const m_font6x8 = {
	"str": "0,ugs,3gvtm2u,1tvmss7,vtskvf,2v710g0,g8efjg,21008e2,vfl8gs,g8e77p,311o003,f7hg00,3vvpoc7,vvu045,h8igg0,3v1mrdm,3efu71h,1ep4i8o,oi94hg,33oof4j,34233hg,u97i95,cq08mn,2pspiqc,21gsfn3,400233,2v3go40,gsv213,3jggka5,a50180,1val6h8,2h80e9j,94hj4s,3p,3jo08ef,24fjghv,gsvah0,2100842,lfjgg0,82fgg,2000044,v41000,8421,3g00098,1voa800,8477r,3g000vf,2e21000,0,8e7,4200g0,18ka000,kaf,2afih80,gug70b,33000p9,442ac0,gk4aki,1380844,0,ggg841,100g41,211100,k4fh1,1000021,fh0g00,0,2110000,f00000,0,210000g,2222200,1p2jamb,jg08ca,4213s0,1p21332,no0sh0,260k9o0,8ca97o,11o1ug8,u0k9o0,oggf4a,jg1uh1,442100,1p2h74a,jg0sh8,2f0g9o0,84000,2100042,10gg,888820,20g000f,2007o00,10820gg,2200sh0,22200g0,1p2nalq,3g08a8,2hfka40,3oi9729,ng0c98,g828o0,3oi94i9,ng1u94,e42bs0,3si8721,700c98,g9i8s0,252hfka,k80s42,4211o0,s4214i,1301ia5,c52j60,3gg8421,no12ra,2l8ka40,25il9ka,k80sh8,2h8k9o0,3oi9721,700sh8,2h8l9o3,3oi9731,1680sh8,e0k9o0,3ta4210,23g12h8,2h8k9o0,252h8k9,11012h8,2lal980,24ka22h,14812h5,4211o0,3t22222,no1og8,g843g0,210820g,g41o42,4213g0,gkh8g0,0,1v,g82000,7,17k9u0,30g8539,lg0007,h849o0,c216kq,1jc0007,hfk1o0,oi8e21,700006,2h8jo5s,30ga6i9,m80806,4211o0,4030ga,k9pg84,2a62h40,1g84210,23g000d,lalak0,mcka,k80007,h8k9o0,u4i9,323g006,2i93g8e,r6i1,700007,2g70bo0,10gu421,hg0008,2h8kpk0,h8k9,1100008,2lal980,h511,1480008,2h8jo5s,v111,7o0642,o210c0,g84010,2101g42,321300,15c0000,45,h8kbs0,1p2g8jg,309o0i0,i94hs0,o0e8nq,3g0sh6,274hs0,240c13i,13o0o06,274hs0,g0c13i,13o0007,g83gcc,1p2e8nq,3g1207,hfk1o0,1g0e8nq,3g1406,4211o0,1p2c210,23g0o06,4211o0,248a8nq,k80840,e8nq40,c0v43h,7o000c,267khk0,skifki,14o08a0,e8k9o0,12074a,jg0g40,e8k9o0,gk08ka,jg0g40,h8k9o0,1208k9,3g9p245,h8igg0,240h8ka,jg0847,2g83og8,oi8e22,ng12af,24fh0g0,3ome4it,if4c52,e212go,o0c13i,13o0c06,4211o0,88074a,jg0022,h8k9o0,1lc0f4a,k80qj0,pakq40,1p4i7g3,3g00oi9,c07g00,g04442,jg0000,v84000,fg8,g00iq6,r5cecv,15kbdiq,3s84080,842100,aaa2g,2g000k5,555000,1348p26,1268ll5,1l5d9ba,3ctreup,3erm842,4210g8,g84270,210g84e,4e10g8,ka52n8,2h8k000,fh8ka,s270,210ga5e,21eh8ka,ka52h8,2h8k00f,21eh8ka,kat0no,a52,25fg000,g8s270,0,e10g8,g8421s,842,4fo000,7s,210g842,43p0g8,7s,842,4fp0g8,g87i1s,210ga52,252p8ka,ka5i1s,3,342p8ka,katg7s,f,30ep8ka,ka5i1c,2h8k00f,30fo000,katg7c,2h8k84f,30fo000,ka52ns,f,30fp0g8,7s,2h8ka52,253o000,g87i1s,3,343p0g8,1s,2h8ka52,25fp8ka,g8vi7s,210g842,4e0000,1s,210hvvv,3vvvvvv,7v,3vvvose,se73ho,e73hos,1osfvvv,3vg0000,cqki,2i400e8,2u8ni10,1uh842,4000fq,252h8k0,3t28322,no0007,2ka5100,i94jl,2200cp,2210g80,3s8e8k9,313sc98,1voa8o0,oigoa9,mc0e83,f8c5s0,impdd,g00117,2iqbp10,oggf41,1g0sh8,2h8ka40,v07o1,3o0084f,24203s0,g41110,7o0888,8203s0,c94i10,210g842,4252go,oc0fo0,31g00cp,206co00,oi9300,0,630000,1g,721,216h8c,3h4i94g,oi2,8f0000,e73h,3000000"
};

export function getFontImage() {
	const charWidth = 6;
	const charHeight = 8;
	const cellWidth = 8;
	const cellHeight = 10;
	const width = 512;
	const height = 40;
	const chars = decompressFont( m_font6x8.str, charWidth, charHeight );
	
	// Clear memory
	m_font6x8.str = "";
	const canvas = document.createElement( "canvas" );
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext( "2d" );
	const imageData = context.getImageData( 0, 0, width, height );
	const data = imageData.data;

	let x = 1;
	let y = 1;
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
			x = 1;
			y += cellHeight;
		}
	}

	// Write the image data
	context.putImageData( imageData, 0, 0 );

	return canvas;
}

function decompressFont( numStr, width, height ) {
	const size = 32;
	const base = 32;
	let bin = "";
	const data = [];
	
	numStr = "" + numStr;
	const nums = numStr.split( "," );

	// Loop through all the base-32 numbers
	for( let i = 0; i < nums.length; i++ ) {

		// Convert base-32 string to binary string
		let num = parseInt( nums[ i ], base ).toString( 2 );

		// Pad the front with 0's so that num has length of 32
		while( num.length < size ) {
			num = "0" + num;
		}

		// Add to the binary string
		bin += num;
	}

	// Loop through all the bits and build character data
	let i = 0;
	if( bin.length % size > 0 ) {
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