$.screen("640x72" );
$.setColor( "#ffffff" );

$.setFont( 4 );

const w = 10;
const h = 18;
let x = 1;
let y = 1;
for( let c = 0; c < 255; c += 1 ) {
	$.setPosPx( x, y );
	$.print( String.fromCharCode( c ), true );
	x += w;

	if( x >= $.width() ) {
		x = 1;
		y += h;
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