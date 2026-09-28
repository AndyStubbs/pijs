/**
 * Page entry for offline-render tests of sample source types. It registers a plugin that
 * depends on "sound" and exposes getSampleType as `__sampleType( name, rootFrequency, loop )`,
 * so a page can play a loaded file through sound() and synth() before sample instruments use
 * the module. Built by audio-browser-suite.js when a suite lists it in `sources`.
 */
import * as g_sampleSource from "../../plugins/sound-advanced/sample-source.js";

window.pi.registerPlugin( {
	"name": "sample-source-probe",
	"dependencies": [ "sound" ],
	"init": pluginApi => {
		const service = pluginApi.getService( "sound" );
		window.__sampleType = ( name, rootFrequency, loop ) => {
			return g_sampleSource.getSampleType( service, name, rootFrequency, loop );
		};
	}
} );
