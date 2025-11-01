#version 300 es
precision mediump float;
in vec4 v_color;
out vec4 fragColor;

void main() {
	
	// The fragColor will always be the straight alpha v_color.
	// The blend state (enabled/disabled) will determine how it's written.
	fragColor = v_color;
}