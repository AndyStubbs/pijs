import test from "node:test";
import assert from "node:assert/strict";

// A stand-in for Pi.js: play() hands out track IDs, onPlay() keeps the note handler, and the
// two clocks (the page's and the audio context's) are numbers the test moves by hand.
const clock = { "page": 0, "audio": 0 };
const fake = { "handlers": {}, "plays": 0, "nextId": 1 };
globalThis.performance = { "now": () => clock.page };
globalThis.window = {
	"pi": {
		"onPlay": ( mode, fn ) => {
			fake.handlers[ mode ] = fn;
		},
		"play": () => {
			fake.plays += 1;
			return fake.nextId++;
		},
		"stopPlay": () => {},
		"defineInstrument": () => {},
		"setBusEffect": () => {}
	}
};

const { Player } = await import( "../src/player.js" );
const { buildTemplate } = await import( "../src/song.js" );

// Moves both clocks forward together, as they run while the song plays
function advance( ms ) {
	clock.page += ms;
	clock.audio += ms / 1000;
}

// Plays the song for `steps` steps, delivering a note event of the first lane on every step
// and updating the player every frame, and returns the positions the playhead reported
function run( player, steps ) {
	const positions = [];
	const stepMs = player.stepSec * 1000;
	for( let i = 0; i < steps; i++ ) {
		const trackId = [ ...player.calls.keys() ][ 0 ];
		fake.handlers.note( { trackId, "time": clock.audio, "delay": 0, "duration": 0.1 } );
		for( let frame = 0; frame < 4; frame++ ) {
			player.update();
			positions.push( player.position() );
			advance( stepMs / 4 );
		}
	}
	return positions;
}

test( "the playhead stays in step after the audio clock stood still", () => {
	const player = new Player();
	player.setSong( buildTemplate( "chip" ) );
	const total = player.plan.total;

	// A first, ordinary playback
	clock.page = 1000;
	clock.audio = 1;
	player.play( 0 );
	let positions = run( player, 16 );
	assert.ok( positions.every( p => p >= 0 && p < 17 ), "first playback follows the song" );
	player.stop();

	// Overnight the page's clock runs on while the audio clock stands still, as it does when
	// the browser suspends idle audio or the computer sleeps
	clock.page += 8 * 3600 * 1000;
	const playsBefore = fake.plays;
	player.play( 0 );
	const lanes = fake.plays - playsBefore;
	positions = run( player, 32 );

	// The playhead moves forward through the first two bars, and nothing restarts
	assert.equal( fake.plays - playsBefore, lanes, "no lane is started again" );
	for( let i = 1; i < positions.length; i++ ) {
		assert.ok(
			positions[ i ] >= positions[ i - 1 ] - 0.01 && positions[ i ] < 34 && positions[ i ] < total,
			`position ${positions[ i ]} after ${positions[ i - 1 ]}`
		);
	}
	assert.ok( positions.at( -1 ) > 28, `the playhead reaches bar 2: ${positions.at( -1 )}` );
} );
