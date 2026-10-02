// A small immediate-mode widget kit drawn and driven entirely by Pi.js.
//
// Every frame, widgets draw themselves with Pi.js primitives and bitmap text and register a hit
// box with their handlers. Pi.js pointer handlers (onPress, onWheel) hit-test the boxes of the
// last drawn frame and run the handlers inside the input event, so a click counts as a user
// gesture for audio, the clipboard, and downloads.

import { C, CHAR_H } from "./theme.js";

const m_widgets = [];
let m_frameWidgets = [];
let m_active = null;
let m_hoverId = null;
let m_hoverTip = "";
let m_blocked = false;
let m_onAnyPress = null;

export function initGui( onAnyPress ) {
	m_onAnyPress = onAnyPress;
	$.onPress( "down", onDown );
	$.onPress( "move", onMove );
	$.onPress( "up", onUp );
	$.onWheel( onWheel );
}

// Ignores pointer input, for example while an input() prompt is open
export function setBlocked( isBlocked ) {
	m_blocked = isBlocked;
	if( isBlocked ) {
		m_active = null;
	}
}

export function beginFrame() {
	m_widgets.length = 0;
}

export function endFrame() {
	m_frameWidgets = m_widgets.slice();
	const mouse = $.inMouse();
	const hit = mouse ? hitTest( mouse.x, mouse.y ) : null;
	m_hoverId = hit ? hit.id : null;
	m_hoverTip = hit && hit.tip ? hit.tip : "";
}

export function hoverTip() {
	return m_hoverTip;
}

export function isActive( id ) {
	return m_active !== null && m_active.widget.id === id;
}

function isHot( id ) {
	return m_hoverId === id;
}

function register( widget ) {
	m_widgets.push( widget );
}

function contains( w, x, y ) {
	return x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h;
}

// Topmost (last registered) widget under the point
function hitTest( x, y ) {
	for( let i = m_frameWidgets.length - 1; i >= 0; i-- ) {
		const w = m_frameWidgets[ i ];
		if( contains( w, x, y ) ) {
			return w;
		}
	}
	return null;
}

function onDown( press ) {
	if( m_onAnyPress ) {
		m_onAnyPress();
	}
	if( m_blocked ) {
		return;
	}
	const widget = hitTest( press.x, press.y );
	if( !widget ) {
		return;
	}
	const isRight = ( press.buttons & 2 ) !== 0;
	m_active = { widget, isRight };
	if( isRight ) {
		if( widget.rightClick ) {
			widget.rightClick();
		}
	} else if( widget.down ) {
		widget.down( press );
	}
}

function onMove( press ) {
	if( m_blocked || !m_active || m_active.isRight ) {
		return;
	}
	if( m_active.widget.drag ) {
		m_active.widget.drag( press );
	}
}

function onUp( press ) {
	if( m_blocked || !m_active ) {
		return;
	}
	const { widget, isRight } = m_active;
	m_active = null;
	if( isRight ) {
		return;
	}

	// up also runs for a cancelled press, so something held by the press is always let go
	if( widget.up ) {
		widget.up( press );
	}
	if( press.cancelled ) {
		return;
	}
	if( widget.click && contains( widget, press.x, press.y ) ) {
		widget.click();
	}
}

function onWheel( wheel ) {
	if( m_blocked ) {
		return;
	}
	const widget = hitTest( wheel.x, wheel.y );
	if( widget && widget.wheel && wheel.deltaY !== 0 ) {
		widget.wheel( wheel.deltaY > 0 ? -1 : 1 );
	}
}

// ---- Drawing helpers ----

export function text( msg, x, y, color ) {
	$.setColor( color );
	$.setPosPx( Math.round( x ), Math.round( y ) );
	$.print( msg, true );
}

export function textRight( msg, rightX, y, color ) {
	text( msg, rightX - $.calcWidth( msg ), y, color );
}

export function textCenter( msg, centerX, y, color ) {
	text( msg, centerX - Math.floor( $.calcWidth( msg ) / 2 ), y, color );
}

// Shortens a string to fit a pixel width
export function fit( msg, width ) {
	if( $.calcWidth( msg ) <= width ) {
		return msg;
	}
	while( msg.length > 1 && $.calcWidth( msg + "." ) > width ) {
		msg = msg.slice( 0, -1 );
	}
	return msg + ".";
}

export function box( x, y, w, h, fill, edge ) {
	$.setColor( edge || fill );
	$.rect( x, y, w, h, fill );
}

export function panel( x, y, w, h, title ) {
	box( x, y, w, h, C.panel, C.panelEdge );
	if( title ) {
		box( x, y, w, 13, C.panelEdge );
		text( title, x + 6, y + 3, C.title );
	}
}

export function hline( x1, x2, y, color ) {
	$.setColor( color );
	$.line( x1, y, x2, y );
}

// ---- Widgets ----

// opts: on, disabled, tip, fill, fillHot, onRight, onWheel, onDown and onUp (for a button that
// acts while it is held), textColor, textX (left-align the label at this x instead of centering
// it)
export function button( id, x, y, w, h, label, onClick, opts = {} ) {
	const hot = isHot( id ) && !opts.disabled;
	const down = isActive( id );
	let fill = opts.fill || C.btn;
	let edge = C.btnEdge;
	if( opts.on ) {
		fill = C.on;
		edge = C.onEdge;
	}
	if( hot ) {
		fill = opts.on ? C.on : ( opts.fillHot || C.btnHot );
		edge = opts.on ? C.onEdge : C.btnEdgeHot;
	}
	if( down ) {
		fill = C.btnDown;
	}
	box( x, y, w, h, fill, edge );
	const color = opts.disabled ? C.dim : ( opts.textColor || C.text );
	const textY = y + Math.floor( ( h - CHAR_H ) / 2 ) + 1;
	if( opts.textX !== undefined ) {
		// Left-aligned at a given x, so a column of buttons can line up its labels
		text( fit( label, x + w - 2 - opts.textX ), opts.textX, textY, color );
	} else {
		textCenter( fit( label, w - 4 ), x + w / 2, textY, color );
	}
	register( {
		id, x, y, w, h,
		"tip": opts.tip,
		"click": opts.disabled ? null : onClick,
		"down": opts.disabled ? null : opts.onDown,
		"up": opts.onUp,
		"rightClick": opts.onRight,
		"wheel": opts.onWheel
	} );
}

// Steps through a list of options: click for next, right-click for previous, wheel either way
export function cycle( id, x, y, w, h, label, onStep, opts = {} ) {
	button( id, x, y, w, h, "< " + label + " >", () => onStep( 1 ), {
		...opts,
		"onRight": () => onStep( -1 ),
		"onWheel": dir => onStep( -dir )
	} );
}

// A horizontal slider over a position t from 0 to 1.
// handlers: set( t ), reset(), step( dir ), release(), tip, dim
export function slider( id, x, y, w, h, t, handlers ) {
	const hot = isHot( id );
	const down = isActive( id );
	box( x, y, w, h, C.track, hot || down ? C.btnEdgeHot : C.btnEdge );
	const fillW = Math.round( ( w - 2 ) * Math.min( 1, Math.max( 0, t ) ) );
	if( fillW > 0 ) {
		box( x + 1, y + 1, fillW, h - 2, handlers.dim ? C.fillDim : C.fill );
	}
	const knobX = x + 1 + fillW;
	box( Math.min( knobX, x + w - 2 ) - 1, y - 1, 3, h + 2, C.knob );

	function setFromPress( press ) {
		handlers.set( ( press.x - x - 1 ) / ( w - 2 ) );
	}
	register( {
		id, x, "y": y - 2, w, "h": h + 4,
		"tip": handlers.tip,
		"down": setFromPress,
		"drag": setFromPress,
		"up": () => handlers.release && handlers.release(),
		"rightClick": handlers.reset,
		"wheel": handlers.step
	} );
}

// An invisible hit area, for wheel scrolling of lists
export function area( id, x, y, w, h, handlers ) {
	register( { id, x, y, w, h, ...handlers } );
}
