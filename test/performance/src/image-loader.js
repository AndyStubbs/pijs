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

export function init() {

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
			console.warn( `Failed to load spritesheet: ${spritePath}`, error );
		}
	}
	
	console.log( `Total images loaded: ${m_imageNames.length}` );
	console.log( `Total sprites loaded: ${m_spriteNames.length}` );
}
