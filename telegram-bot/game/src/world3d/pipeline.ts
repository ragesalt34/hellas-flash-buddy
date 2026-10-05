import * as THREE from 'three';

// The look is calibrated in display values (Unity gamma workflow): no sRGB↔linear conversions anywhere.
THREE.ColorManagement.enabled = false;

/**
 * Chants-of-Sennaar-style rendering, re-implemented:
 * - surfaces are a flat colour; shade is that colour times a per-level shade tint;
 * - shadowed surfaces get fine diagonal hatching in screen space;
 * - outlines come from a post pass over depth + normals (not per-object geometry), coloured by the
 *   surface colour times the level's edge tint;
 * - a filter colour is multiplied in with distance from the camera and with low world height.
 */
export interface Look {
  /** Shade = surface colour × shade (measured from reference frames, not derived). */
  shade: THREE.Color;
  /** Multiplies lit colour (a slight warm cast). */
  lightTint: THREE.Color;
  /** Outline colour = surface colour × edgeTint × edgeDark. */
  edgeTint: THREE.Color;
  edgeDark: number;
  /** Depth / normal edge sensitivity. */
  edgeDepth: number;
  edgeNormal: number;
  /** Filter strip: texture column `filterU`, sampled vertically by filter amount. */
  filterTex: THREE.Texture;
  filterU: number;
  filterRate: number;
  /** Added (not multiplied) filter colour, for hazy levels; 0 = off. */
  additiveRate: number;
  minDepth: number;
  maxDepth: number;
  minY: number;
  maxY: number;
  /** Hatching in shade: 0 = none. */
  hatchRate: number;
  hatchSpacing: number;
}

/** A vertical two-colour strip usable as `filterTex` (our own looks have no painted strip). */
export function gradientStrip(top: THREE.ColorRepresentation, bottom: THREE.ColorRepresentation): THREE.DataTexture {
  const a = new THREE.Color(top);
  const b = new THREE.Color(bottom);
  const h = 64;
  const data = new Uint8Array(4 * h);
  for (let i = 0; i < h; i++) {
    const c = b.clone().lerp(a, i / (h - 1)); // row 0 = bottom
    data.set([c.r * 255, c.g * 255, c.b * 255, 255], i * 4);
  }
  const t = new THREE.DataTexture(data, 1, h);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

const ramp = new THREE.DataTexture(new Uint8Array([0, 0, 255, 255]), 4, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;

/** Layer for things the edge pass must skip (screen-space lines, text planes). */
export const NO_EDGE_LAYER = 1;

export class SennaarPipeline {
  readonly look: Look;
  private readonly colorRT: THREE.WebGLRenderTarget;
  private readonly normalRT: THREE.WebGLRenderTarget;
  private readonly normalMat = new THREE.MeshNormalMaterial();
  private readonly post: THREE.ShaderMaterial;
  private readonly postScene = new THREE.Scene();
  private readonly postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly materials = new Map<number, THREE.MeshToonMaterial>();
  private readonly hatch = { rate: { value: 0 }, spacing: { value: 7 } };

  constructor(private readonly renderer: THREE.WebGLRenderer, look: Look) {
    this.look = look;
    this.colorRT = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) });
    this.normalRT = new THREE.WebGLRenderTarget(1, 1);
    this.post = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.colorRT.texture },
        tDepth: { value: this.colorRT.depthTexture },
        tNormal: { value: this.normalRT.texture },
        tFilter: { value: look.filterTex },
        filterU: { value: 0 },
        filterRate: { value: 0 },
        additiveRate: { value: 0 },
        depthRange: { value: new THREE.Vector2() },
        yRange: { value: new THREE.Vector2() },
        edgeTint: { value: new THREE.Color() },
        edgeDark: { value: 1 },
        edgeDepth: { value: 1 },
        edgeNormal: { value: 1 },
        texel: { value: new THREE.Vector2() },
        projInv: { value: new THREE.Matrix4() },
        camWorld: { value: new THREE.Matrix4() },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: /* glsl */ `
        uniform sampler2D tColor, tDepth, tNormal, tFilter;
        uniform float filterU, filterRate, additiveRate, edgeDark, edgeDepth, edgeNormal;
        uniform vec2 depthRange, yRange, texel;
        uniform vec3 edgeTint;
        uniform mat4 projInv, camWorld;
        varying vec2 vUv;
        vec3 viewPos(vec2 uv, float d) {
          vec4 v = projInv * vec4(uv * 2. - 1., d * 2. - 1., 1.);
          return v.xyz / v.w;
        }
        float viewDist(vec2 uv) { float d = texture2D(tDepth, uv).r; return d >= 1. ? 1e5 : -viewPos(uv, d).z; }
        void main() {
          float d = texture2D(tDepth, vUv).r;
          vec3 col = texture2D(tColor, vUv).rgb;
          bool sky = d >= 1.;
          // Edges: relative depth jump or normal change across the 4 diagonal neighbours (Roberts cross).
          float dc = viewDist(vUv);
          vec2 a = texel, b = vec2(texel.x, -texel.y);
          float de = (abs(viewDist(vUv + a) - viewDist(vUv - a)) + abs(viewDist(vUv + b) - viewDist(vUv - b))) / max(dc, 1e-3);
          vec3 n0 = texture2D(tNormal, vUv + a).rgb * 2. - 1., n1 = texture2D(tNormal, vUv - a).rgb * 2. - 1.;
          vec3 n2 = texture2D(tNormal, vUv + b).rgb * 2. - 1., n3 = texture2D(tNormal, vUv - b).rgb * 2. - 1.;
          float nd = min(dot(n0, n1), dot(n2, n3));
          float edge = max(step(0.04 / edgeDepth, de), step(nd, 1. - 0.2 * edgeNormal));
          if (sky) edge = 0.;
          // Find the nearer side of a silhouette so the line takes the foreground colour.
          vec3 edgeBase = col;
          if (edge > 0. && de > 0.) {
            vec3 c0 = texture2D(tColor, vUv + a).rgb, c1 = texture2D(tColor, vUv - a).rgb;
            edgeBase = viewDist(vUv + a) < viewDist(vUv - a) ? c0 : c1;
            if (dc < min(viewDist(vUv + a), viewDist(vUv - a))) edgeBase = col;
          }
          col = mix(col, edgeBase * edgeTint * edgeDark, edge);
          // Filter: stronger far away and low down.
          if (!sky) {
            vec3 world = (camWorld * vec4(viewPos(vUv, d), 1.)).xyz;
            float tDepthF = clamp((dc - depthRange.x) / max(depthRange.y - depthRange.x, 1e-3), 0., 1.);
            float tY = clamp((yRange.y - world.y) / max(yRange.y - yRange.x, 1e-3), 0., 1.);
            float t = max(tDepthF, tY);
            vec3 f = texture2D(tFilter, vec2(filterU, 1. - t)).rgb;
            col = mix(col, col * f, filterRate * t) + f * additiveRate * t;
          }
          gl_FragColor = vec4(col, 1.);
        }`,
      depthTest: false,
      depthWrite: false,
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post));
  }

  /** Flat colour material with hard lit/shade switch and screen-space hatching in the shade. */
  material(color: THREE.ColorRepresentation, doubleSide = false): THREE.MeshToonMaterial {
    const c = new THREE.Color(color);
    const key = c.getHex() * 2 + (doubleSide ? 1 : 0);
    let m = this.materials.get(key);
    if (m) return m;
    m = new THREE.MeshToonMaterial({ color: c, gradientMap: ramp, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide });
    const hatch = this.hatch;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.hatchRate = hatch.rate;
      shader.uniforms.hatchSpacing = hatch.spacing;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float hatchRate;\nuniform float hatchSpacing;')
        .replace(
          '#include <opaque_fragment>',
          `{
            float direct = max(max(reflectedLight.directDiffuse.r, reflectedLight.directDiffuse.g), reflectedLight.directDiffuse.b);
            float shade = 1. - step(0.01, direct);
            float stripe = step(hatchSpacing - 1.2, mod(gl_FragCoord.x + gl_FragCoord.y, hatchSpacing));
            outgoingLight *= 1. - hatchRate * shade * stripe * 0.18;
          }
          #include <opaque_fragment>`,
        );
    };
    this.materials.set(key, m);
    return m;
  }

  /** Set the ambient and sun colours so lit = colour × lightTint and shade = colour × shade × lightTint. */
  applyLights(ambient: THREE.AmbientLight, sun: THREE.DirectionalLight): void {
    const L = this.look;
    const shade = L.shade.clone().multiply(L.lightTint);
    ambient.color.copy(shade);
    ambient.intensity = Math.PI; // physically based lights divide diffuse by π
    sun.color.setRGB(
      Math.max(0, L.lightTint.r - shade.r),
      Math.max(0, L.lightTint.g - shade.g),
      Math.max(0, L.lightTint.b - shade.b),
    );
    sun.intensity = Math.PI;
  }

  setSize(w: number, h: number): void {
    this.colorRT.setSize(w, h);
    this.normalRT.setSize(w, h);
    this.post.uniforms.texel.value.set(1 / w, 1 / h);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    const L = this.look;
    const u = this.post.uniforms;
    u.tFilter.value = L.filterTex;
    u.filterU.value = L.filterU;
    u.filterRate.value = L.filterRate;
    u.additiveRate.value = L.additiveRate;
    u.depthRange.value.set(L.minDepth, L.maxDepth);
    u.yRange.value.set(L.minY, L.maxY);
    u.edgeTint.value.copy(L.edgeTint);
    u.edgeDark.value = L.edgeDark;
    u.edgeDepth.value = L.edgeDepth;
    u.edgeNormal.value = L.edgeNormal;
    u.projInv.value.copy(camera.projectionMatrixInverse);
    u.camWorld.value.copy(camera.matrixWorld);
    this.hatch.rate.value = L.hatchRate;
    this.hatch.spacing.value = L.hatchSpacing;

    const r = this.renderer;
    camera.layers.enable(NO_EDGE_LAYER);
    r.setRenderTarget(this.colorRT);
    r.render(scene, camera);
    // Normal pass without background or the no-edge layer.
    const bg = scene.background;
    const fog = scene.fog;
    scene.background = null;
    scene.fog = null;
    scene.overrideMaterial = this.normalMat;
    camera.layers.disable(NO_EDGE_LAYER);
    r.setRenderTarget(this.normalRT);
    const clear = r.getClearColor(new THREE.Color());
    const clearAlpha = r.getClearAlpha();
    r.setClearColor(0x8080ff, 1);
    r.clear();
    r.render(scene, camera);
    scene.overrideMaterial = null;
    scene.background = bg;
    scene.fog = fog;
    camera.layers.enable(NO_EDGE_LAYER);
    r.setClearColor(clear, clearAlpha);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCam);
  }

  dispose(): void {
    this.colorRT.dispose();
    this.normalRT.dispose();
    this.normalMat.dispose();
    this.post.dispose();
    for (const m of this.materials.values()) m.dispose();
  }
}
