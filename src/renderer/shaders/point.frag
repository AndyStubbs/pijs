#version 300 es
precision mediump float;
in vec4 v_color;
uniform vec4 u_noiseMin;
uniform vec4 u_noiseMax;
uniform float u_time;
out vec4 fragColor;

// Pseudorandom noise function
float random( vec2 st, float seed ) {
	return fract( sin( dot( st.xy + seed, vec2( 12.9898, 78.233 ) ) ) * 43758.5453123 );
}

// Map value from [0,1] range to [min,max] range
float mapRange( float value, float min, float max ) {
	return min + value * ( max - min );
}

void main() {
	
	// Use v_color as base color (interpolated per-pixel)
	vec4 baseColor = v_color;
	
	// Apply noise only if noise data is available
	// Check if any channel has a non-zero range (noiseMin != noiseMax)
	vec4 pixelNoise = vec4( 0.0 );
	float noiseRange = abs( u_noiseMax.r - u_noiseMin.r ) + 
	                   abs( u_noiseMax.g - u_noiseMin.g ) + 
	                   abs( u_noiseMax.b - u_noiseMin.b ) + 
	                   abs( u_noiseMax.a - u_noiseMin.a );
	
	if( noiseRange > 0.0001 ) {
		
		// Generate unique random values for each RGBA channel using different seeds
		vec2 fragCoord = gl_FragCoord.xy;
		float noiseR = random( fragCoord + u_time, 0.0 );
		float noiseG = random( fragCoord + u_time, 1.0 );
		float noiseB = random( fragCoord + u_time, 2.0 );
		float noiseA = random( fragCoord + u_time, 3.0 );
		
		// Map noise values to the specified ranges
		pixelNoise.r = mapRange( noiseR, u_noiseMin.r, u_noiseMax.r );
		pixelNoise.g = mapRange( noiseG, u_noiseMin.g, u_noiseMax.g );
		pixelNoise.b = mapRange( noiseB, u_noiseMin.b, u_noiseMax.b );
		pixelNoise.a = mapRange( noiseA, u_noiseMin.a, u_noiseMax.a );
	}
	
	// Add noise to base color and clamp to [0.0, 1.0]
	vec4 finalColor = baseColor + pixelNoise;
	fragColor = clamp( finalColor, 0.0, 1.0 );
}

