#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_texture;
out vec4 fragColor;

void main() {
	vec4 texColor = texture(u_texture, v_texCoord);
	
	// Unpremultiply alpha for display
	if (texColor.a > 0.0) {
		fragColor = vec4(texColor.rgb / texColor.a, texColor.a);
	} else {
		fragColor = texColor;
	}
}