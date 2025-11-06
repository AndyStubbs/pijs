#version 300 es
precision mediump float;
in vec4 v_color;
uniform vec4 u_noiseMin;
uniform vec4 u_noiseMax;
uniform float u_time;
out vec4 fragColor;

// A hash function that works with integer coordinates
// This tends to be very effective at breaking coherence.
float hash(vec2 p) {
	p = fract(p * vec2(5.3983, 5.4439));
	p += dot(p, p.yx + 2.153); // Add a small value to break symmetry
	return fract(p.x * p.y * 954.3121);
}

// Map value from [0,1] range to [min,max] range
float mapRange(float value, float min, float max) {
	return min + value * (max - min);
}

void main() {

	vec4 baseColor = v_color;
	vec4 pixelNoise = vec4(0.0);

	float noiseRange = abs(u_noiseMax.r - u_noiseMin.r) +
	                   abs(u_noiseMax.g - u_noiseMin.g) +
	                   abs(u_noiseMax.b - u_noiseMin.b) +
	                   abs(u_noiseMax.a - u_noiseMin.a);

	if (noiseRange > 0.0001) {

		// Use integer coordinates for the hash function
		// This is critical for noise that looks truly random at pixel level
		vec2 iFragCoord = floor(gl_FragCoord.xy);

		// Combine iFragCoord with u_time and different offsets for each channel
		// The offsets here can be smaller because the hash itself is strong.
		float noiseR = hash(iFragCoord + vec2(u_time * 0.01, u_time * 0.02) + vec2(10.0, 20.0));
		float noiseG = hash(iFragCoord + vec2(u_time * 0.03, u_time * 0.04) + vec2(30.0, 40.0));
		float noiseB = hash(iFragCoord + vec2(u_time * 0.05, u_time * 0.06) + vec2(50.0, 60.0));
		float noiseA = hash(iFragCoord + vec2(u_time * 0.07, u_time * 0.08) + vec2(70.0, 80.0));

		pixelNoise.r = mapRange(noiseR, u_noiseMin.r, u_noiseMax.r);
		pixelNoise.g = mapRange(noiseG, u_noiseMin.g, u_noiseMax.g);
		pixelNoise.b = mapRange(noiseB, u_noiseMin.b, u_noiseMax.b);
		pixelNoise.a = mapRange(noiseA, u_noiseMin.a, u_noiseMax.a);
	}

	vec4 finalColor = baseColor + pixelNoise;
	fragColor = clamp(finalColor, 0.0, 1.0);
}