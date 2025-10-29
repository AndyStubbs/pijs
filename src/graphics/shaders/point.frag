#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 fragColor;

void main() {

	// Premultiply alpha for correct blending
	fragColor = vec4(v_color.rgb * v_color.a, v_color.a);
}