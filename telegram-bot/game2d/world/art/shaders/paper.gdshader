// Full-screen finishing pass over the world (below the HUD): paper grain, soft vignette, warm grade.
shader_type canvas_item;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform float grain = 0.05;
uniform float vignette = 0.14;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
	vec3 c = texture(screen_tex, SCREEN_UV).rgb;
	float n = hash(floor(FRAGCOORD.xy / 2.0));
	float fibre = hash(vec2(floor(FRAGCOORD.y / 3.0), 7.0)) * 0.5 + hash(vec2(floor(FRAGCOORD.x / 40.0), floor(FRAGCOORD.y))) * 0.5;
	c *= 1.0 - grain + grain * mix(n, fibre, 0.3) * 1.6;
	vec2 d = (SCREEN_UV - 0.5) * vec2(1.0, 0.85);
	c *= 1.0 - vignette * smoothstep(0.35, 0.8, length(d));
	c = mix(c, c * vec3(1.03, 1.0, 0.95), 0.7);
	COLOR = vec4(c, 1.0);
}
