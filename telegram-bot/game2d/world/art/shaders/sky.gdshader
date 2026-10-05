// Warm Mediterranean sky: vertical gradient + soft sun glow and disc. UV covers the sky rect.
shader_type canvas_item;

uniform vec4 top_color : source_color = vec4(0.96, 0.90, 0.86, 1.0);
uniform vec4 horizon_color : source_color = vec4(0.99, 0.82, 0.74, 1.0);
uniform vec4 sun_color : source_color = vec4(1.0, 0.97, 0.86, 1.0);
uniform vec2 sun_uv = vec2(0.74, 0.42);
uniform float aspect = 4.0;   // rect width / height, keeps the sun round

void fragment() {
	vec3 c = mix(top_color.rgb, horizon_color.rgb, smoothstep(0.0, 1.0, UV.y));
	vec2 p = vec2(UV.x * aspect, UV.y);
	vec2 s = vec2(sun_uv.x * aspect, sun_uv.y);
	float d = distance(p, s);
	c = mix(c, sun_color.rgb, smoothstep(0.9, 0.0, d) * 0.45);
	c = mix(c, vec3(1.0, 0.99, 0.95), smoothstep(0.075, 0.065, d));
	COLOR = vec4(c, 1.0);
}
