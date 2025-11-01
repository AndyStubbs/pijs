#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_texCoord;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {

	// Sample the color from the texture at the given texture coordinates
	vec4 texColor = texture(u_texture, v_texCoord);

	// Multiply the texture color by the vertex color (which can be used for tinting/alpha)
	// If v_color is white (1,1,1,1), it will just use the texColor.
	outColor = texColor * v_color;
}