#version 300 es
in vec4 a_position;
in vec4 a_color;
in vec2 a_texCoord;

uniform vec2 u_resolution;

out vec4 v_color;
out vec2 v_texCoord;

void main() {
	
	// Convert from pixel space (0 to u_resolution) to clip space (-1 to 1)
	vec2 zeroToOne = a_position.xy / u_resolution;
	vec2 zeroToTwo = zeroToOne * 2.0;
	vec2 clipSpace = zeroToTwo - 1.0;

	// Flip the Y-coordinate to match standard 2D graphics (top-left origin)
	// In WebGL, +Y is typically up, but for 2D, we want +Y down.
	gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

	v_color = a_color;
	v_texCoord = a_texCoord;
}