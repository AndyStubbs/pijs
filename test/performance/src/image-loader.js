/**
 * Loads images for use in tests
 * 
 * Handles loading images and sprites for tests
 * 
 * @module image-loader
 */

const m_loadedImages = [];
const m_imageNames = [];
const m_loadedSprites = [];
const m_spriteNames = [];

export { m_imageNames as images };
export { m_spriteNames as sprites };

/**
 * Start loading benchmark assets.
 * @param {Object} [options] - Loading options
 * @param {boolean} [options.strict=false] - Surface synchronous loading errors to the caller
 * @param {boolean} [options.explicitSpritesOnly=false] - Load only sheets with frame dimensions
 * @returns {void}
 */
export function init( options = {} ) {

	// List of image files from the media folder
	const imageFiles = [
		"spaceship_0.png",
		"bat_image.png",
		"bomb.png",
		"cat_image.png",
		"cherry_image.png",
		"dog_image.png",
		"parrot_image.png",
		"pirate_image.png",
		"pirate-sword_image.png",
		"scorpian_image.png",
		"shark_image.png",
		"treasure_image.png"
	];
	
	// Load each image
	for( let i = 0; i < imageFiles.length; i++ ) {
		const imageName = `img_${i}`;
		const imagePath = `../media/${imageFiles[i]}`;
		
		try {
			$.loadImage( imagePath, imageName );
			m_imageNames.push( imageName );
			m_loadedImages.push( {
				"name": imageName,
				"path": imagePath
			} );
			console.log( `Loaded image: ${imageName} from ${imagePath}` );
		} catch( error ) {
			if( options.strict ) {
				throw new Error( `Failed to load image ${imageName} (${imagePath}): ${error}` );
			}
			console.warn( `Failed to load image: ${imagePath}`, error );
		}
	}
	
	// Load spritesheets
	const spritesheetFiles = [
		{ "file": "8x8 fantasytiles.png", "width": 8, "height": 8, "margin": 0 },
		{ "file": "font-8x14.png", "width": 8, "height": 14, "margin": 0 },
		{ "file": "gnsh-bitmapfont-colour2.png", "width": 5, "height": 12, "margin": 0 },
		{ "file": "thief.png" },
		{ "file": "Fruits.png" },
		{ "file": "shark_sprite.png" },
		{ "file": "pirate_sprite.png" },
		{ "file": "scorpian_sprite.png" },
		{ "file": "parrot_sprite.png" },
		{ "file": "pirate-sword_sprite.png" },
		{ "file": "monkey_sprite.png" },
		{ "file": "dog_sprite.png" },
		{ "file": "bat_sprite.png" },
		{ "file": "cat_sprite.png" },
		{ "file": "bomb_sprite.png" },
	];
	
	for( let i = 0; i < spritesheetFiles.length; i++ ) {
		const spriteName = `sprite_${i}`;
		const spritePath = `/test/media/${spritesheetFiles[i].file}`;
		const { width, height, margin } = spritesheetFiles[i];

		// Fixed workloads use the explicit frame layouts accepted by every supported 2.x core.
		if( options.explicitSpritesOnly && ( width === undefined || height === undefined ) ) {
			continue;
		}
		
		try {
			$.loadSpritesheet( spritePath, spriteName, width, height, margin );
			m_spriteNames.push( spriteName );
			m_loadedSprites.push( {
				"name": spriteName,
				"path": spritePath,
				"width": width,
				"height": height,
				"margin": margin
			} );
			console.log( `Loaded spritesheet: ${spriteName} from ${spritePath} (${width}x${height})` );
		} catch( error ) {
			if( options.strict ) {
				throw new Error( `Failed to load spritesheet ${spriteName} (${spritePath}): ${error}` );
			}
			console.warn( `Failed to load spritesheet: ${spritePath}`, error );
		}
	}
	
	console.log( `Total images loaded: ${m_imageNames.length}` );
	console.log( `Total sprites loaded: ${m_spriteNames.length}` );
}
