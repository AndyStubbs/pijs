$.screen("512x56" );
$.setColor( "#ffffff" );

$.setFont( 3 );

const w = 8;
const h = 14;
let x = 0;
let y = 0;
for( let c = 0; c < 255; c += 1 ) {
	$.setPos( x, y );
	$.print( String.fromCharCode( c ), true );
	x += 1;
	if( x > 63 ) {
		x = 0;
		y += 1;
	}
}

let isWhite = true;
for( let y = 0; y < $.height(); y += h ) {
	for( let x = 0; x < $.width(); x += w ) {
		const color = isWhite ? "#888888": "#000000";
		$.setColor( color );
		//$.rect( x, y, w, h, color );
		isWhite = !isWhite;
	}
	isWhite = !isWhite;
}