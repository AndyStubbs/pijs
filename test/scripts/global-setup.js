/**
 * Global setup for Playwright tests
 * Checks if dev server is running before starting tests
 */

const http = require( "http" );

module.exports = async function globalSetup() {
	return new Promise( ( resolve, reject ) => {
		let settled = false;

		const req = http.get( "http://localhost:8080/", ( res ) => {
			if( settled ) return;
			settled = true;

			// Consume response to free up socket
			res.resume();

			if( res.statusCode === 200 || res.statusCode === 404 ) {
				console.log( "\n✓ Server is running on http://localhost:8080\n" );
				resolve();
			} else {
				console.error( "\n❌ Server not responding correctly on http://localhost:8080" );
				console.error( "Please start the server first with: npm run server\n" );
				process.exit( 1 );
			}
		} );

		req.on( "error", ( error ) => {
			if( settled ) return;
			settled = true;

			console.error( "\n❌ Server is not running on http://localhost:8080" );
			console.error( "Please start the server first with: npm run server\n" );
			process.exit( 1 );
		} );

		req.setTimeout( 5000, () => {
			if( settled ) return;
			settled = true;

			req.destroy();
			console.error( "\n❌ Server timeout on http://localhost:8080" );
			console.error( "Please start the server first with: npm run server\n" );
			process.exit( 1 );
		} );

		req.end();
	} );
};

