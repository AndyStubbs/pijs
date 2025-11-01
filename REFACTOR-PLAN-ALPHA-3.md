# Pi.js Alpha 2 - WebGL Migration Plan

## Overview

Migrate Pi.js from 2D Canvas ImageData rendering to WebGL2 for improved performance, while 
simplifying the architecture by removing non-pixel mode and canvas font support. Implement 
incrementally, starting with a minimal shell and building up feature by feature.  Completly 
removing canvas2d fallback and only building one renderer WebGL2.  Also dropping support for
audio and input. Audio and input will continue to be supported but as plugins instead of being
a part of the core library.
