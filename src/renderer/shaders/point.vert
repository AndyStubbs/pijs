#version 300 es
in vec2 a_position;
in vec4 a_color;
uniform vec2 u_resolution;
out vec4 v_color;

void main() {

	// Convert screen coords to NDC with pixel center adjustment
	// Add 0.5 to center the pixel, then convert to NDC
	vec2 pixelCenter = a_position + 0.5;
	vec2 ndc = ((pixelCenter / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);
	gl_Position = vec4(ndc, 0.0, 1.0);
	gl_PointSize = 1.0;
	v_color = a_color;
}

