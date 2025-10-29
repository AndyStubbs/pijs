#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
out vec4 fragColor;

void main() {
	vec4 texColor = texture(u_texture, v_texCoord);
	
	// The FBO already contains STRAIGHT ALPHA, so just output it directly.
	fragColor = texColor;
}