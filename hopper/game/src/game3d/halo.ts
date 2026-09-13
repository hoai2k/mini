/** The shadow halo: the shadows drawn as dark spots on the picture. Their
 * silhouettes are rendered to a mask against the frame's own depth, blurred
 * at a quarter of the resolution, and laid back over the picture as a
 * feathered darkness that hugs each silhouette and bleeds a little violet
 * into what stands around it. Optional; a setting turns it off. */
import { DepthTexture, Mesh, MeshBasicMaterial, NearestFilter, OrthographicCamera, PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, UnsignedByteType, Vector2, WebGLRenderTarget, type Camera, type WebGLRenderer } from 'three';

/** Meshes on this layer are the shadows: the mask pass draws only them. */
export const HALO_LAYER = 1;

const QUAD = new PlaneGeometry(2, 2);
const VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BLUR = `
  uniform sampler2D tex; uniform vec2 step; varying vec2 vUv;
  void main() {
    // A wide tent: nine taps two texels apart, so each pass feathers far.
    float w[5]; w[0] = 0.227; w[1] = 0.194; w[2] = 0.121; w[3] = 0.054; w[4] = 0.016;
    vec4 c = texture2D(tex, vUv) * w[0];
    for (int i = 1; i < 5; i++) {
      c += texture2D(tex, vUv + step * float(i)) * w[i];
      c += texture2D(tex, vUv - step * float(i)) * w[i];
    }
    gl_FragColor = c;
  }`;
const COMPOSITE = `
  uniform sampler2D scene; uniform sampler2D mask; uniform sampler2D halo;
  uniform float strength; uniform vec3 tint; varying vec2 vUv;
  void main() {
    vec4 s = texture2D(scene, vUv);
    float m = texture2D(mask, vUv).r;
    float h = texture2D(halo, vUv).r;
    // The feather lives outside the silhouette; inside it the body keeps
    // its own drawing, only a touch darker so the spot reads as one.
    float outside = clamp(h * 1.6, 0.0, 1.0) * (1.0 - m);
    float amount = clamp(outside * strength + m * strength * 0.18, 0.0, 1.0);
    gl_FragColor = vec4(mix(s.rgb, tint, amount), 1.0);
    // The picture was drawn linear into a target; this pass is the one that
    // reaches the screen, so it does the output conversion.
    #include <colorspace_fragment>
  }`;

export class ShadowHalo {
  private main: WebGLRenderTarget;
  private mask: WebGLRenderTarget;
  private blurA: WebGLRenderTarget;
  private blurB: WebGLRenderTarget;
  private readonly maskMaterial = new MeshBasicMaterial({ color: '#ffffff', depthWrite: false, fog: false });
  private readonly blurMaterial = new ShaderMaterial({ vertexShader: VERT, fragmentShader: BLUR, uniforms: { tex: { value: null }, step: { value: new Vector2() } }, depthTest: false, depthWrite: false });
  private readonly compositeMaterial = new ShaderMaterial({ vertexShader: VERT, fragmentShader: COMPOSITE, uniforms: { scene: { value: null }, mask: { value: null }, halo: { value: null }, strength: { value: 1.0 }, tint: { value: [0.05, 0.02, 0.09] } }, depthTest: false, depthWrite: false });
  private readonly quad = new Mesh(QUAD, this.blurMaterial);
  private readonly quadScene = new Scene();
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private width = 0;
  private height = 0;
  constructor(private readonly renderer: WebGLRenderer) {
    this.quadScene.add(this.quad);
    this.main = this.mask = this.blurA = this.blurB = new WebGLRenderTarget(1, 1);
    this.resize(2, 2);
  }
  /** Targets at the drawing buffer's size; the blur at a quarter of it. */
  resize(width: number, height: number) {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.dispose();
    const depth = new DepthTexture(width, height);
    // Multisampled where the platform allows it, so the halo costs no edge quality.
    this.main = new WebGLRenderTarget(width, height, { depthTexture: depth, format: RGBAFormat, type: UnsignedByteType, samples: this.renderer.capabilities.isWebGL2 ? 4 : 0 });
    // The mask shares the frame's depth, so a shadow behind a wall leaves no spot.
    this.mask = new WebGLRenderTarget(width, height, { depthTexture: depth, depthBuffer: true, format: RGBAFormat, type: UnsignedByteType, minFilter: NearestFilter, magFilter: NearestFilter });
    const qw = Math.max(1, Math.round(width / 4)),
      qh = Math.max(1, Math.round(height / 4));
    this.blurA = new WebGLRenderTarget(qw, qh, { format: RGBAFormat, type: UnsignedByteType, depthBuffer: false });
    this.blurB = new WebGLRenderTarget(qw, qh, { format: RGBAFormat, type: UnsignedByteType, depthBuffer: false });
  }
  /** Draw the frame with the halo. `scene` is drawn once through `main`;
   * the shadows (HALO_LAYER) once more as a silhouette mask. */
  render(scene: Scene, camera: Camera) {
    const r = this.renderer;
    const size = r.getDrawingBufferSize(new Vector2());
    this.resize(size.x, size.y);
    const autoClear = r.autoClear;
    // 1. The picture, with its depth kept.
    r.setRenderTarget(this.main);
    r.autoClear = true;
    r.render(scene, camera);
    // 2. The silhouettes, against that depth: colour cleared, depth kept.
    const layers = camera.layers.mask;
    camera.layers.set(HALO_LAYER);
    const override = scene.overrideMaterial,
      background = scene.background;
    scene.overrideMaterial = this.maskMaterial;
    // No sky in the mask: only the silhouettes are white.
    scene.background = null;
    r.setRenderTarget(this.mask);
    r.autoClear = false;
    r.setClearColor(0x000000, 1);
    r.clear(true, false, false);
    r.render(scene, camera);
    scene.overrideMaterial = override;
    scene.background = background;
    camera.layers.mask = layers;
    // 3. Blur passes at a quarter of the size, three times over for a wide feather.
    this.quad.material = this.blurMaterial;
    const u = this.blurMaterial.uniforms;
    let source: WebGLRenderTarget = this.mask;
    for (let pass = 0; pass < 3; pass++) {
      u.tex.value = source.texture;
      u.step.value.set(2 / this.blurA.width, 0);
      r.setRenderTarget(this.blurA);
      r.render(this.quadScene, this.quadCamera);
      u.tex.value = this.blurA.texture;
      u.step.value.set(0, 2 / this.blurA.height);
      r.setRenderTarget(this.blurB);
      r.render(this.quadScene, this.quadCamera);
      source = this.blurB;
    }
    // 4. Lay the feather over the picture, on the screen.
    this.quad.material = this.compositeMaterial;
    const c = this.compositeMaterial.uniforms;
    c.scene.value = this.main.texture;
    c.mask.value = this.mask.texture;
    c.halo.value = this.blurB.texture;
    r.setRenderTarget(null);
    r.autoClear = true;
    r.render(this.quadScene, this.quadCamera);
    r.autoClear = autoClear;
  }
  dispose() {
    for (const t of [this.main, this.mask, this.blurA, this.blurB]) t.dispose();
    this.main.depthTexture?.dispose();
  }
}

/** Put an object and everything under it on the halo layer, keeping it on the default one. */
export function markShadow(root: { traverse(cb: (o: { layers: { enable(l: number): void } }) => void): void }) {
  root.traverse((o) => o.layers.enable(HALO_LAYER));
}
