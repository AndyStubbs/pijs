/**
 * Gamepad bundle wiring against fresh in-memory full and lite-plus-gamepad bundles: the commands
 * are registered, both argument forms reach the plugin, a pad is read through
 * `navigator.getGamepads()`, and `clearEvents( "gamepad" )` is known. The plugin's logic is
 * tested in `gamepad-validation.test.js`.
 * Run with node --test test/unit/gamepad-validation-browser.test.js; no server is required.
 */
import * as g_test from "node:test";
import * as g_harness from "./browser-source-harness.js";
const { test } = g_test;

const { probe } = g_harness.useBrowserBundles( {
	"litePlugins": [ "gamepad" ]
} );

for( const bundle of g_harness.BUNDLES ) {
	for( const overload of [ "positional", "object" ] ) {
		test( `${bundle}: gamepad commands are wired with ${overload} arguments`, async () => {
			await probe( bundle, overload => {
				const pad = { "index": 0, "id": "test-pad", "connected": true,
					"mapping": "", "timestamp": 0, "buttons": [],
					"axes": [ 0.5, -0.5, 0.1, -0.1, 0, 1, -1 ] };
				const nativeRequest = window.requestAnimationFrame;
				const nativeCancel = window.cancelAnimationFrame;
				Object.defineProperty( navigator, "getGamepads", {
					"configurable": true, "value": () => [ pad ]
				} );
				window.requestAnimationFrame = () => 1;
				window.cancelAnimationFrame = () => {};
				function set( value ) {
					if( overload === "object" ) {
						$.setGamepadDeadZone( { "deadZone": value } );
					} else {
						$.setGamepadDeadZone( value );
					}
				}
				function read( index ) {
					if( overload === "object" ) {
						return $.inGamepad( { "gamepadIndex": index } );
					}
					return $.inGamepad( index );
				}
				try {
					for( const name of [ "startGamepad", "stopGamepad", "inGamepad",
						"setGamepadDeadZone", "onGamepad", "offGamepad" ]
					) {
						if( typeof $[ name ] !== "function" ) {
							throw new Error( `Missing command ${name}` );
						}
					}
					for( const name of [ "ingamepad", "setGamepadSensitivity" ] ) {
						if( $[ name ] !== undefined ) {
							throw new Error( `The old name ${name} is still registered` );
						}
					}

					// The dead zone reaches the plugin, and the first read records the pad
					set( 0.25 );
					const axes = read( 0 ).axes;
					if( Math.abs( axes[ 0 ] - 1 / 3 ) > 1e-10 || axes[ 2 ] !== 0 ) {
						throw new Error( `Unexpected axes ${axes.join( ", " )}` );
					}
					let caught;
					try { set( "0.2" ); } catch( error ) { caught = error; }
					if( !( caught instanceof TypeError ) ||
						caught.code !== "INVALID_DEAD_ZONE"
					) {
						throw new Error( "Expected a validation error" );
					}
					if( $.inGamepad().length !== 1 ) {
						throw new Error( "Expected one pad in the list" );
					}

					// The option is gamepadDeadZone; the old option fails as unknown (Core 8)
					$.set( { "gamepadDeadZone": 0.3 } );
					let optionError;
					try {
						$.set( { "gamepadSensitivity": 0.3 } );
					} catch( error ) {
						optionError = error;
					}
					if( !optionError || optionError.code !== "INVALID_OPTION" ) {
						throw new Error( "Expected gamepadSensitivity to be an unknown option" );
					}
					$.clearEvents( "gamepad" );
				} finally {
					$.stopGamepad();
					window.requestAnimationFrame = nativeRequest;
					window.cancelAnimationFrame = nativeCancel;
					delete navigator.getGamepads;
				}
			}, overload );
		} );
	}
}
