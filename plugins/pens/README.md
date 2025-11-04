# Pens Plugin

Basic plugin to add pens to pi.js. This plugin is incomplete. I may not continue development
because the pens just didn't look very good and I don't think they are important. 

I may instead create a brushes plugin to simulate different brush strokes for drawing applications.
But I will take a different approach for brushes. I will use gl.points for the brush, this will
be slower than geometry but it's more like what I did in previous version, but I will add a 
Set to prevent duplicate points in a brush stroke. This will fix blending issues.

I also will support drawing shapes such as lines, ellipses, rects, circles, etc. This will be a lot
easier if I don't try to generate geometry and instead use points.

I also want to support custom brushes using 2d arrays.
