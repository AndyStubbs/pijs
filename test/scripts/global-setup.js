/** Require the run-owned visual server; discovery with --list needs no server. */
export default async function globalSetup() {
	if( !process.env.PI_TEST_BASE_URL ) {
		throw new Error( "Run npm run test:visual to build artifacts and start the test server." );
	}
}
