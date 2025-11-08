$.screen("512x40" );
$.setColor( "#ffffff" );

$.setFont( 1 );

const margin = 1;
const w = 6 + margin * 2;
const h = 8 + margin * 2;
let x = margin;
let y = margin;
for( let c = 0; c < 255; c += 1 ) {
	$.setPosPx( x, y );
	$.print( String.fromCharCode( c ), true );
	x += w;
	if( x >= $.width() ) {
		x = margin;
		y += h;
	}
}

let isWhite = true;
for( let y = margin; y < $.height(); y += h ) {
	for( let x = margin; x < $.width(); x += w ) {
		const color = isWhite ? "#888888": "#000000";
		$.setColor( color );
		//$.rect( x, y, w, h, color );
		isWhite = !isWhite;
	}
	isWhite = !isWhite;
}