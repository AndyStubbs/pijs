#version 300 es
in vec2 a_position;
in vec4 a_color;
uniform vec2 u_resolution;
out vec4 v_color;

void main() {
	
	// For TRIANGLES/LINES, a_position directly represents the desired vertex
	// position (e.g., top-left of a pixel boundary).
	// No 0.5 offset needed for precise geometry rasterization.
	vec2 ndc = ((a_position / u_resolution) * 2.0 - 1.0) * vec2(1.0, -1.0);
	gl_Position = vec4(ndc, 0.0, 1.0);
	v_color = a_color;
}