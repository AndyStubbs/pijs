# Pi.js - A JavaScript Library for Retro-Style Games and Demos

Welcome to **Pi.js**, a JavaScript library designed to simplify the creation of retro-style games and demos. Inspired by the programming language **QBasic**, Pi.js offers a beginner-friendly approach to building 2D games on modern web browsers.

Please checkout the official website for Pi.js (https://pijs.org) for detailed documentation and to
find the latest version.

---

## **Overview**

Pi.js is named after the mathematical constant **π (pi)**, which plays a key role in many graphics and game development functions. It provides an all-in-one solution for handling graphics, sound, and user input, making it an excellent choice for creating interactive and nostalgic game experiences.

Built on top of the **HTML5 Canvas API**, Pi.js has:
- **Retro Inspiration**: draw retro style graphics without modern effects like anti-aliasing
- **Great at Primatives**: lines, circles, pixels - remember those? Pi.js is great for creating primatives for retro graphics.
- **Print command**: A modern graphics library that has a print command - Yes.
- **Beginner-friendly**: with a simple and intuitive API.
- Capable of supporting **modern 2D games** alongside retro-style creations.

---

## **Features**

- **Graphics**: 
	- Simple drawing functions for 2D shapes, images, and text.
	- Support for sprite animations to bring your characters and objects to life.

- **Sound**:
	- Play and manage sound effects and background music.
	- Even generate your own sounds based on frequency or notes!

- **Input Handling**:
	- Capture keyboard and mouse input with ease.

- **Beginner-Friendly**:
	- Easy-to-use API that makes it accessible for newcomers to game development.

- **Retro Game Aesthetics**:
	- Perfect for creating games inspired by the 80s and 90s.

---

## **Getting Started**

To start using Pi.js, please visit (https://pijs.org) for instructions on how to use pijs. The following 
instructions are for working on the pi.js library itself.

# Setting Up for Local Development

To work on the **Pi.js** library, you'll need to configure your local development environment to handle its custom build process. This involves installing dependencies and running the custom build script to generate the library files.

---

## **Prerequisites**

Make sure you have the following installed on your system:

1. **Node.js** (v18 or later) and **npm** (Node Package Manager).
   - The project includes a `.nvmrc` file. Use `nvm use` to automatically switch to the correct version.
2. A code editor, such as **Visual Studio Code** or **Cursor**.

---

## **Setup Instructions**

1. **Clone the Repository**
   git clone https://github.com/your-repo/pi.js.git
   cd pi.js

2. **Install Dependencies**
   Run the following command to install all necessary Node.js packages:
   npm install

3. **Understand the Build Process**
   The build process uses a custom Node.js script (`build.js`) with the following steps:
   - Reads configurations from `build.toml` and `change-log.toml`.
   - Combines and minifies source files.
   - Updates version numbers and build dates.
   - Outputs multiple build artifacts:
     - Full library file: `<name>-<version>.js`
     - Minified library file: `<name>-<version>.min.js`
     - Source map: `<name>-<version>.min.js.map`
     - Extra command file: `<name>-extra.js`
   - Writes a `change-log.json` file for easy version tracking.

4. **Run the Build Script**
   Execute the custom build script to generate the library files:
   node build.js

5. **Generated Files**
   After the build process completes, the output files will be available in the `build/` directory:
   - `pi-latest.js`: The latest version of the library.
   - Version-specific files (e.g., `pi-1.0.0.js`, `pi-1.0.0.min.js`).
   - Source maps and additional files for development and debugging.

6. **Testing the Build**
   To test the build, serve the files locally using a web server. For example:
   npx http-server
   Open the browser at the provided local address and load your test files.

---

## **Development Workflow**

- **Modify Source Files**: Edit the JavaScript source files as needed.
- **Update `build.toml`**: Update the `build.toml` file to define build configurations such as file lists, version numbers, and extra commands.
- **Run the Build Script**: Use the `node build.js` command to rebuild the library.

---

## **Coding Conventions**

This project follows specific coding conventions to maintain consistency. Key conventions include:

- **Tabs** for indentation (not spaces)
- **Double quotes** for strings, backticks only for template literals
- **Spaces inside parentheses**: `func( arg )` not `func(arg)`
- **No space before parens** in control statements: `if(` not `if (`
- **Always quote object properties**: `{ "key": "value" }`
- **No ternary operators** - use explicit if/else statements
- **JSDoc comments** at the top of all JavaScript files

For complete details, see the `.cursorrules` file in the project root.

---

## **Contributing**

For contributions, ensure your changes:
1. Follow the coding conventions in `.cursorrules`
2. Pass the build process without errors
3. Include appropriate tests for new features

Submit pull requests with details of your updates, including how they impact the build.

---

## **Troubleshooting**

If you encounter issues:
1. Ensure all required dependencies are installed.
2. Check for errors in the `build.toml` or `change-log.toml` configuration files.
3. Review the console output for details about errors or warnings during the build process.

For further assistance, open an issue in the repository.

---
