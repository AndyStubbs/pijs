// A small immediate-mode UI drawn with Pi.js graphics. Widgets are drawn every frame and
// return what happened to them (clicked, new value), using pointer events collected by
// the Pi.js pointer commands between frames.

const $ = window.pi;

// Sweetie 16 palette
export const PAL = {
	"black": "#1a1c2c",
	"purple": "#5d275d",
	"red": "#b13e53",
	"orange": "#ef7d57",
	"yellow": "#ffcd75",
	"lime": "#a7f070",
	"green": "#38b764",
	"teal": "#257179",
	"navy": "#29366f",
	"blue": "#3b5dc9",
	"sky": "#41a6f6",
	"cyan": "#73eff7",
	"white": "#f4f4f4",
	"light": "#94b0c2",
	"gray": "#566c86",
	"dark": "#333c57"
};

export const COL = {
	"bg": PAL.black,
	"face": PAL.dark,
	"hi": PAL.gray,
	"lo": "#10111c",
	"text": PAL.white,
	"dim": PAL.light,
	"accent": PAL.yellow,
	"on": PAL.teal
};

export const CHAR = {
	"right": String.fromCharCode( 16 ),
	"left": String.fromCharCode( 17 ),
	"up": String.fromCharCode( 30 ),
	"down": String.fromCharCode( 31 ),
	"note": String.fromCharCode( 14 ),
	"stop": String.fromCharCode( 254 ),
	"star": String.fromCharCode( 15 ),
	"block": String.fromCharCode( 219 ),
	"dot": String.fromCharCode( 250 )
};

export const CW = 6;  // character width of font 1
export const CH = 8;  // character height

const shadeCache = new Map();

// Mixes a hex color toward the background (f = 0) or keeps it (f = 1), or toward white (f > 1).
export function shade( hex, f ) {
	const key = hex + f;
	if( shadeCache.has( key ) ) {
		return shadeCache.get( key );
	}
	const n = parseInt( hex.slice( 1 ), 16 );
	const c = [ ( n >> 16 ) & 255, ( n >> 8 ) & 255, n & 255 ];
	const bg = [ 26, 28, 44 ];
	const out = c.map( ( v, i ) => {
		if( f <= 1 ) {
			return Math.round( bg[ i ] + ( v - bg[ i ] ) * f );
		}
		return Math.round( v + ( 255 - v ) * ( f - 1 ) );
	} );
	const str = "#" + out.map( v => Math.max( 0, Math.min( 255, v ) ).toString( 16 ).padStart( 2, "0" ) ).join( "" );
	shadeCache.set( key, str );
	return str;
}

// ---------------------------------------------------------------------------------------------
// Drawing

export function fill( x, y, w, h, c ) {
	if( w <= 0 || h <= 0 ) {
		return;
	}
	$.setColor( c );
	$.rect( x, y, w, h, c );
}

export function frame( x, y, w, h, c ) {
	if( w <= 0 || h <= 0 ) {
		return;
	}
	$.setColor( c );
	$.rect( x, y, w, h );
}

export function text( x, y, str, c ) {
	$.setColor( c );
	$.setPosPx( Math.round( x ), Math.round( y ) );
	$.print( str, true );
}

// Text in the 6x6 font, for tight spots like note labels.
export function smallText( x, y, str, c ) {
	$.setFont( 0 );
	text( x, y, str, c );
	$.setFont( 1 );
}

export function textCenter( x, y, w, str, c ) {
	text( x + Math.floor( ( w - str.length * CW ) / 2 ), y, str, c );
}

export function bigText( x, y, str, c, scale ) {
	$.setPrintSize( scale, scale );
	text( x, y, str, c );
	$.setPrintSize( 1, 1 );
}

export function fit( str, chars ) {
	return str.length > chars ? str.slice( 0, Math.max( 0, chars - 1 ) ) + "." : str;
}

export function bevel( x, y, w, h, face, hi = COL.hi, lo = COL.lo ) {
	fill( x, y, w, h, face );
	fill( x, y, w, 1, hi );
	fill( x, y, 1, h, hi );
	fill( x, y + h - 1, w, 1, lo );
	fill( x + w - 1, y, 1, h, lo );
}

export function panel( x, y, w, h, title, color = PAL.sky ) {
	fill( x + 3, y + 3, w, h, "#0b0c14" );
	bevel( x, y, w, h, COL.face );
	frame( x + 2, y + 2, w - 4, h - 4, COL.lo );
	if( title ) {
		fill( x + 3, y + 3, w - 6, 11, color );
		text( x + 7, y + 5, title, PAL.black );
	}
}

// ---------------------------------------------------------------------------------------------
// Input and widgets

export const ui = {
	"mx": -100,
	"my": -100,
	"px": -100,
	"py": -100,
	"down": false,
	"pressed": false,
	"released": false,
	"rpressed": false,
	"wheel": 0,
	"wheelY": 0,
	"active": null,
	"grabbed": null,
	"hot": null, // id of the widget or area under the pointer, for the pop-up tips
	"enabled": true,
	"heldSince": 0,
	"lastRepeat": 0,
	"events": [],
	"onClick": null,

	init() {
		$.onPress( "down", d => {
			if( d.buttons & 1 ) {
				this.events.push( { "t": "down", "x": d.x, "y": d.y } );
			}
		} );
		$.onPress( "move", d => this.events.push( { "t": "move", "x": d.x, "y": d.y } ) );
		$.onPress( "up", d => this.events.push( { "t": "up", "x": d.x, "y": d.y } ) );
		$.onMouse( "down", d => {
			if( ( d.buttons & 2 ) && !( d.buttons & 1 ) ) {
				this.events.push( { "t": "rdown", "x": d.x, "y": d.y } );
			}
		} );
		$.onMouse( "move", d => this.events.push( { "t": "move", "x": d.x, "y": d.y } ) );
		$.onWheel( d => {
			this.wheel += d.deltaY;
		} );
	},

	beginFrame() {
		this.pressed = false;
		this.released = false;
		this.rpressed = false;
		this.grabbed = null;
		this.hot = null;
		this.wheelY = this.wheel;
		this.wheel = 0;
		const events = this.events;
		this.events = [];
		for( const e of events ) {
			if( e.t === "down" ) {
				// A second press in one frame waits for the next frame
				if( this.pressed || this.released ) {
					this.events.push( e );
					continue;
				}
				this.pressed = true;
				this.down = true;
				this.px = e.x;
				this.py = e.y;
				this.heldSince = performance.now();
			} else if( e.t === "up" ) {
				if( this.down ) {
					this.released = true;
				}
				this.down = false;
			} else if( e.t === "rdown" ) {
				this.rpressed = true;
				this.px = e.x;
				this.py = e.y;
			}
			this.mx = e.x;
			this.my = e.y;
		}
	},

	endFrame() {
		if( this.released || !this.down ) {
			this.active = null;
		}
	},

	over( x, y, w, h ) {
		return this.mx >= x && this.mx < x + w && this.my >= y && this.my < y + h;
	},

	pressIn( x, y, w, h ) {
		return this.enabled && this.pressed && this.active === null &&
			this.px >= x && this.px < x + w && this.py >= y && this.py < y + h;
	},

	rightIn( x, y, w, h ) {
		return this.enabled && this.rpressed &&
			this.px >= x && this.px < x + w && this.py >= y && this.py < y + h;
	},

	grab( id ) {
		this.active = id;
		this.grabbed = id;
	},

	// Names the widget or area at this place, so a tip can explain it. Later calls win, so
	// name an area before the widgets inside it.
	hint( id, x, y, w, h ) {
		if( this.enabled && this.over( x, y, w, h ) ) {
			this.hot = id;
		}
	},

	// Button with a label; returns true when clicked. Options: on (toggle look), color,
	// textColor, repeat (fires while held), disabled.
	button( id, x, y, w, h, label, o = {} ) {
		const enabled = this.enabled && !o.disabled;
		this.hint( id, x, y, w, h );
		if( enabled && this.pressIn( x, y, w, h ) ) {
			this.grab( id );
		}
		const held = this.active === id && this.down && this.over( x, y, w, h );
		const hover = enabled && this.active === null && this.over( x, y, w, h );
		let clicked = false;
		if( o.repeat && this.active === id && this.down ) {
			const now = performance.now();
			if( this.grabbed === id ) {
				clicked = true;
				this.lastRepeat = now + 300;
			} else if( now > this.lastRepeat ) {
				clicked = true;
				this.lastRepeat = now + 60;
			}
		} else if( this.released && this.active === id && this.over( x, y, w, h ) && enabled ) {
			clicked = true;
		}
		let face = o.on ? ( o.color || COL.on ) : COL.face;
		if( hover ) {
			face = shade( face, 1.15 );
		}
		if( held ) {
			bevel( x, y, w, h, shade( face, 0.8 ), COL.lo, COL.hi );
		} else {
			bevel( x, y, w, h, face );
		}
		if( label ) {
			const tc = o.disabled ? COL.hi : o.textColor || ( o.on ? PAL.white : COL.text );
			textCenter( x, y + Math.floor( ( h - CH ) / 2 ) + ( held ? 1 : 0 ), w, label, tc );
		}
		if( clicked && this.onClick && !o.repeat ) {
			this.onClick();
		}
		return clicked;
	},

	// Horizontal slider; returns the (possibly new) value. curve > 1 gives finer control
	// at the low end. Options: color, curve, format.
	slider( id, x, y, w, h, value, min, max, o = {} ) {
		const curve = o.curve || 1;
		this.hint( id, x, y, w, h );
		if( this.pressIn( x, y, w, h ) ) {
			this.grab( id );
		}
		let v = value;
		if( this.active === id && this.down ) {
			const t = Math.max( 0, Math.min( 1, ( this.mx - x - 1 ) / ( w - 3 ) ) );
			v = min + Math.pow( t, curve ) * ( max - min );
		}
		if( this.enabled && this.active === null && this.over( x, y, w, h ) && this.wheelY ) {
			const t0 = Math.pow( ( value - min ) / ( max - min ), 1 / curve );
			const t = Math.max( 0, Math.min( 1, t0 - Math.sign( this.wheelY ) * 0.05 ) );
			v = min + Math.pow( t, curve ) * ( max - min );
			this.wheelY = 0;
			this.grabbed = id;
		}
		const t = Math.pow( Math.max( 0, Math.min( 1, ( v - min ) / ( max - min ) ) ), 1 / curve );
		const color = o.color || PAL.sky;
		bevel( x, y, w, h, COL.lo, COL.lo, COL.hi );
		const fw = Math.round( t * ( w - 2 ) );
		fill( x + 1, y + 1, fw, h - 2, shade( color, 0.7 ) );
		fill( x + 1, y + 1, fw, 1, color );
		fill( x + Math.min( w - 3, fw ), y, 2, h, this.active === id ? PAL.white : color );
		return v;
	}
};
