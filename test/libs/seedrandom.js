/**
 * Tiny seeded PRNG for tests and benchmarks.
 *
 * @param {string|number} seed - Seed value for the stream.
 * @param {boolean|{ "entropy"?: boolean }} [options] - Entropy options.
 * @returns {() => number} Generator that returns values in [0, 1).
 */
export default function seedrandom( seed, options ) {
	let entropy = false;
	if( options === true ) {
		entropy = true;
	} else if( options && typeof options === "object" && options.entropy === true ) {
		entropy = true;
	}

	let source = "";
	if( seed != null ) {
		source = String( seed );
	}
	if( entropy ) {
		source += `\0${Date.now()}\0${Math.random()}`;
	}

	const rng = mulberry32( hashString( source ) );
	if( this === Math ) {
		Math.random = rng;
	}
	return rng;
}

Math.seedrandom = seedrandom;

/**
 * Mix a string into a 32-bit seed.
 *
 * @param {string} value - Seed string.
 * @returns {number} Unsigned 32-bit hash.
 */
function hashString( value ) {
	let hash = 1779033703 ^ value.length;
	for( let i = 0; i < value.length; i++ ) {
		hash = Math.imul( hash ^ value.charCodeAt( i ), 3432918353 );
		hash = hash << 13 | hash >>> 19;
	}
	return hash >>> 0;
}

/**
 * Mulberry32 generator from a numeric seed.
 *
 * @param {number} seed - Unsigned 32-bit seed.
 * @returns {() => number} Generator that returns values in [0, 1).
 */
function mulberry32( seed ) {
	let a = seed >>> 0;
	return function rng() {
		a = a + 0x6D2B79F5 | 0;
		let t = Math.imul( a ^ a >>> 15, 1 | a );
		t = t + Math.imul( t ^ t >>> 7, 61 | t ) ^ t;
		return ( ( t ^ t >>> 14 ) >>> 0 ) / 4294967296;
	};
}
