# Instructions for publishing to NPM

# Build and copy artifacts into releases/pi-latest/dist
npm run build
npm run copy-to-release

# In terminal cd to specific version folder
cd releases\[folder]

# login
npm login

# For version 1
npm publish --access public --tag canvas2d

# For version 2
npm publish --access public
