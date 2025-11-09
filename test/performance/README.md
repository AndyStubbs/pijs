# Performance Test System

This is a modular performance testing system for Pi.js graphics operations.

## Structure

- `src/app.js` - Main application module
- `src/test-manager.js` - Test management and execution system
- `src/tests/` - Individual test modules
  - `line-test.js` - Line drawing performance test
  - `arc-test.js` - Arc drawing performance test
- `index.html` - Main HTML file that imports the application

## Adding New Tests

To add a new performance test, create a new test module in the `src/tests/` directory:

### Example Test Module

```javascript
/**
 * My New Test Module
 * 
 * Description of what this test does.
 * 
 * @module my-new-test
 */

class MyNewTest {
	constructor() {
		this.m_data = {};
	}

	/**
	 * Initializes the test
	 * 
	 * @param {Object} data - Test data object
	 * @returns {void}
	 */
	init( data ) {
		
		// Initialize any test-specific data
		data.pal = $.getPal();
		this.m_data = data;
	}

	/**
	 * Runs the test with specified item count
	 * 
	 * @param {number} itemCount - Number of items to process
	 * @param {Object} data - Test data object
	 * @returns {void}
	 */
	run( itemCount, data ) {
		// Your test implementation here
		const pal = data.pal;
		$.cls();
		for( let i = 0; i < itemCount; i += 1 ) {
			$.setColor( Math.floor( Math.random() * pal.length ) );
			// Your drawing operations here
		}
	}

	/**
	 * Gets the test configuration object
	 * 
	 * @returns {Object} Test configuration
	 */
	getTestConfig() {
		return {
			"name": "My New Test",
			"run": this.run.bind( this ),
			"init": this.init.bind( this ),
			"data": this.m_data,
			"itemCountStart": 100  // Starting item count
		};
	}
}

export default MyNewTest;
```

### Registering the Test

To register your new test, modify `src/app.js`:

1. Import your test module:
```javascript
import MyNewTest from "./tests/my-new-test.js";
```

2. Create an instance in the constructor:
```javascript
constructor() {
	// ... existing code ...
	this.m_myNewTest = new MyNewTest();
}
```

3. Register the test in the `init()` method:
```javascript
// Register tests
this.m_testManager.registerTest( this.m_lineTest.getTestConfig() );
this.m_testManager.registerTest( this.m_arcTest.getTestConfig() );
this.m_testManager.registerTest( this.m_myNewTest.getTestConfig() );  // Add this line
```

## Test Configuration

Each test configuration object should have:

- `name` - Display name for the test
- `run` - Function to execute the test
- `init` - Function to initialize test data
- `data` - Data object for the test
- `itemCountStart` - Starting number of items to process

## How It Works

1. The system calculates the target FPS for the current system
2. Tests are run with increasing item counts until the FPS drops below 95% of target
3. The system finds the maximum stable item count for each test
4. Results are displayed showing items per frame and items per second

## Running Tests

Open `index.html` in a web browser. The system will:
1. Calculate target FPS
2. Wait for a key press to begin
3. Run each test automatically
4. Display results when complete
