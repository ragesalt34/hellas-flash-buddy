// Sea seen in perspective: haze at the horizon, deep teal near the quay, drifting wave dashes that get
// bigger towards the viewer, glitter in the sun's reflection column. UV.y = 0 horizon, 1 quay edge.
shader_type canvas_item;

uniform vec4 far_color : source_color = vec4(0.70, 0.84, 0.85, 1.0);
uniform vec4 near_color : source_color = vec4(0.25, 0.55, 0.62, 1.0);
uniform vec4 line_color : source_color = vec4(0.92, 0.97, 0.96, 1.0);
uniform float sun_x = 0.74;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void fragment() {
	float depth = UV.y;
	vec3 c = mix(far_color.rgb, near_color.rgb, pow(depth, 0.7));
	// perspective row coordinate: rows bunch up at the horizon
	float v = 1.0 / (depth + 0.07);
	float rowf = v * 1.6 - TIME * 0.12;
	float band = fract(rowf);
	float id = floor(rowf);
	float line = smoothstep(0.0, 0.05, band) * (1.0 - smoothstep(0.07, 0.13, band));
	float freq = 18.0 / (depth + 0.12);
	float dash = smoothstep(0.55, 0.75, sin(UV.x * freq + id * 2.39 + TIME * 0.6));
	c = mix(c, line_color.rgb, line * dash * mix(0.25, 0.75, depth));
	// glitter under the sun
	float col = exp(-pow((UV.x - sun_x) * 7.0, 2.0)) * (1.0 - depth * 0.6);
	float sp = step(0.965, hash(floor(vec2(UV.x * 260.0, v * 30.0)) + floor(TIME * 2.5)));
	c = mix(c, vec3(1.0, 0.99, 0.94), sp * col);
	// soft haze band right at the horizon
	c = mix(c, far_color.rgb * 1.04, smoothstep(0.08, 0.0, depth) * 0.6);
	COLOR = vec4(c, 1.0);
}
