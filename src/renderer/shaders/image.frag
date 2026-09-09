#version 300 es
precision highp float;

in vec4 v_color;
in vec2 v_texCoord;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {

	// Sample the color from the texture at the given texture coordinates
	vec4 texColor = texture(u_texture, v_texCoord);

	// Textures are premultiplied; tint colors are straight RGBA.
	outColor = vec4(texColor.rgb * v_color.rgb * v_color.a, texColor.a * v_color.a);
}

