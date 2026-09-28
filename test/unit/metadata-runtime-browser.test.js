/**
 * SYS-012 and CORE-020: the runtime command set of each bundle against the metadata the
 * declarations are generated from. The Full bundle is compared with the core and bundled-plugin
 * metadata; Lite, with every plugin loaded standalone including sound-advanced, also with
 * metadata/plugin-sound-advanced. Every registered command needs metadata with the same parameter
 * names in the same order, and the functions on $ and on a screen must be exactly the declared
 * commands, which also checks each command's screen flag, including the forms installed outside
 * the registry (removeScreen, and a screen's clearEvents). Settings are the set-prefixed
 * commands, so they are covered.
 * Run with node --test test/unit/metadata-runtime-browser.test.js.
 */
import * as g_test from "node:test";
import * as g_assert from "node:assert/strict";
import * as g_harness from "./browser-source-harness.js";
import * as g_generateMetadata from "../../scripts/generate-metadata.js";
const { test } = g_test;
const assert = g_assert;

const PLUGINS = [ "gamepad", "keyboard", "sound", "pointer", "polygons", "sound-advanced" ];

const { probe } = g_harness.useBrowserBundles( {
	"expose": "metadataTest",
	"litePlugins": PLUGINS
} );

/**
 * The newest metadata for a bundle: the core and bundled plugins for Full, and also the
 * standalone sound-advanced plugin for Lite with every plugin.
 *
 * @param {string} bundle - "full" or "lite"
 * @returns {Map<string, Object>} Method reference entries by name
 */
function expectedMethods( bundle ) {
	const methods = new Map( g_generateMetadata.layerMetadata().methods );
	if( bundle === "lite" ) {
		for( const method of g_generateMetadata.readPluginMethods( "sound-advanced" ) ) {
			methods.set( method.name, method );
		}
	}
	return methods;
}

for( const bundle of g_harness.BUNDLES ) {
	test( `SYS-012 ${bundle}: runtime commands match their metadata`, async () => {
		const runtime = await probe( bundle, () => {
			const screen = $.screen( "4x4" );
			const functionNames = object => Object.keys( object ).filter( name => {
				return typeof object[ name ] === "function";
			} ).sort();
			return {
				"commands": metadataTest.commands.getCommandDescriptors(),
				"api": functionNames( $ ),
				"screen": functionNames( screen )
			};
		} );
		const methods = expectedMethods( bundle );

		// Every registered command has metadata with the same parameters
		const mismatches = [];
		for( const command of runtime.commands ) {
			const method = methods.get( command.name );
			if( !method ) {
				mismatches.push( `${command.name}: no metadata` );
				continue;
			}
			const names = method.parameters.map( parameter => parameter.name );
			if( JSON.stringify( names ) !== JSON.stringify( command.parameterNames ) ) {
				mismatches.push(
					`${command.name}: parameters ${names.join( ", " )} in metadata, ` +
					`${command.parameterNames.join( ", " )} at runtime`
				);
			}
		}
		assert.deepEqual( mismatches, [] );

		// The functions on $ and on a screen are exactly the declared commands and screen commands
		const declared = Array.from( methods.keys() ).sort();
		const screenDeclared = Array.from( methods.values() ).filter( method => {
			return method.isScreen || method.screenForm;
		} ).map( method => method.name ).sort();
		assert.deepEqual( runtime.api, declared );
		assert.deepEqual( runtime.screen, screenDeclared );
	} );
}
