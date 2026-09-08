/*
  Interactive water-ripple effect for the RIVR hero (#home).
  - Confined entirely to the .hero section — sizes and listens to that
    element only, not the whole window.
  - Uses your existing CSS custom properties (--sky, --sky-2, --wave-1,
    --wave-2, --wave-3, --wave-4) to paint the water surface, so it stays
    on-brand even if you tweak your palette later.
  - Real wave-equation simulation: cursor movement injects a splash into
    a height field, which is then used to refract the water texture.

  Include with:  <script src="water-ripple.js"></script>
  and make sure the hero markup has:
    <section class="hero" id="home">
      <canvas class="hero-ripple" id="heroRipple"></canvas>
      ...
*/
(function () {
  const section = document.getElementById('home');
  const canvas = document.getElementById('heroRipple');
  if (!section || !canvas) return;

  const gl = canvas.getContext('webgl2');
  if (!gl) { canvas.style.display = 'none'; return; }
  const floatExt = gl.getExtension('EXT_color_buffer_float');
  if (!floatExt) { canvas.style.display = 'none'; return; }

  // ---------------------------------------------------------------
  // Tunables — adjust these to change the feel of the water
  // ---------------------------------------------------------------
  const SIM_RES = 256;        // simulation grid resolution (perf vs detail)
  const DAMPING = 0.965;      // closer to 1 = ripples linger longer; lower = calms down faster
  const DISTORTION = 0.18;    // how strongly ripples bend the water image (was 0.55)
  const DROP_RADIUS = 0.025;  // splash size (in normalized UV units)
  const DROP_GAIN = 0.12;     // splash strength scales with cursor speed (was 0.35)

  // ---------------------------------------------------------------
  // Shader helpers
  // ---------------------------------------------------------------
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  }
  function makeProgram(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    return p;
  }

  const VERT = `#version 300 es
  in vec2 a_pos;
  out vec2 v_uv;
  void main(){
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }`;

  const SIM_FRAG = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  uniform sampler2D u_cur;
  uniform sampler2D u_prev;
  uniform vec2 u_texel;
  uniform float u_damping;
  out vec4 outColor;
  void main(){
    float l = texture(u_cur, v_uv - vec2(u_texel.x, 0.0)).r;
    float r = texture(u_cur, v_uv + vec2(u_texel.x, 0.0)).r;
    float d = texture(u_cur, v_uv - vec2(0.0, u_texel.y)).r;
    float u = texture(u_cur, v_uv + vec2(0.0, u_texel.y)).r;
    float p = texture(u_prev, v_uv).r;
    float h = (l + r + d + u) * 0.5 - p;
    h *= u_damping;
    outColor = vec4(h, 0.0, 0.0, 1.0);
  }`;

  const DROP_FRAG = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  uniform vec2 u_point;
  uniform float u_radius;
  uniform float u_strength;
  uniform float u_aspect;
  out vec4 outColor;
  void main(){
    vec2 d = v_uv - u_point;
    d.x *= u_aspect;
    float dist = length(d);
    float falloff = smoothstep(u_radius, 0.0, dist);
    outColor = vec4(u_strength * falloff, 0.0, 0.0, 1.0);
  }`;

  const RENDER_FRAG = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  uniform sampler2D u_height;
  uniform sampler2D u_bg;
  uniform vec2 u_texel;
  uniform float u_strength;
  out vec4 outColor;
  void main(){
    float l = texture(u_height, v_uv - vec2(u_texel.x, 0.0)).r;
    float r = texture(u_height, v_uv + vec2(u_texel.x, 0.0)).r;
    float d = texture(u_height, v_uv - vec2(0.0, u_texel.y)).r;
    float u = texture(u_height, v_uv + vec2(0.0, u_texel.y)).r;
    vec2 grad = vec2(r - l, u - d);
    vec2 uv2 = v_uv + grad * u_strength;
    vec3 base = texture(u_bg, uv2).rgb;
    float highlight = clamp((grad.x - grad.y) * 6.0, 0.0, 1.0);
    float shadow = clamp((grad.y - grad.x) * 6.0, 0.0, 1.0);
    vec3 color = base + vec3(highlight) * 0.15 - vec3(shadow) * 0.06;
    outColor = vec4(color, 1.0);
  }`;

  const simProgram = makeProgram(VERT, SIM_FRAG);
  const dropProgram = makeProgram(VERT, DROP_FRAG);
  const renderProgram = makeProgram(VERT, RENDER_FRAG);

  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  function bindQuad(prog) {
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }
  function drawQuad() { gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }

  // ---------------------------------------------------------------
  // Simulation buffers (triple-buffered height field)
  // ---------------------------------------------------------------
  function makeTarget() {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, SIM_RES, SIM_RES, 0, gl.RED, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo };
  }
  const heights = [makeTarget(), makeTarget(), makeTarget()];
  let curIdx = 0, prevIdx = 1;
  heights.forEach(t => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.viewport(0, 0, SIM_RES, SIM_RES);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  });

  // ---------------------------------------------------------------
  // Background water texture — your own image, cover-fit cropped to
  // match the hero's current aspect ratio. Change BG_IMAGE_SRC below.
  // ---------------------------------------------------------------
  const BG_IMAGE_SRC = 'images/hero-bg1.png'; // <-- point this at your background image

  const bgCanvas = document.createElement('canvas');
  const bctx = bgCanvas.getContext('2d');
  const bgTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, bgTex);
  // 1x1 placeholder pixel so the texture is valid before the image loads
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const bgImage = new Image();
  let bgImageLoaded = false;
  bgImage.onload = () => { bgImageLoaded = true; paintBackground(bgCanvas.width || 1024, bgCanvas.height || 640); };
  bgImage.src = BG_IMAGE_SRC;

  function paintBackground(w, h) {
    bgCanvas.width = w; bgCanvas.height = h;
    if (!bgImageLoaded) return; // keep the placeholder until the image is ready

    // cover-fit: scale the image to fill w×h, cropping the overflow
    const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
    const boxRatio = w / h;
    let dw, dh, dx, dy;
    if (imgRatio > boxRatio) {
      dh = h; dw = h * imgRatio; dx = (w - dw) / 2; dy = 0;
    } else {
      dw = w; dh = w / imgRatio; dx = 0; dy = (h - dh) / 2;
    }
    bctx.clearRect(0, 0, w, h);
    bctx.drawImage(bgImage, dx, dy, dw, dh);

    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // ---------------------------------------------------------------
  // Sizing — the canvas fills the hero section only, resizes with it
  // ---------------------------------------------------------------
  let aspect = 1;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(section.clientWidth * dpr));
    const h = Math.max(1, Math.floor(section.clientHeight * dpr));
    canvas.width = w;
    canvas.height = h;
    aspect = w / h;
    paintBackground(1024, Math.round(1024 / aspect));
  }
  new ResizeObserver(resize).observe(section);
  resize();

  // ---------------------------------------------------------------
  // Pointer tracking — scoped to the hero section, not the window
  // ---------------------------------------------------------------
  let pointer = { x: 0.5, y: 0.5, active: false };
  let lastPointer = { x: 0.5, y: 0.5 };
  function setPointerFromEvent(e) {
    const rect = section.getBoundingClientRect();
    pointer.x = (e.clientX - rect.left) / rect.width;
    pointer.y = 1.0 - (e.clientY - rect.top) / rect.height;
    pointer.active = true;
  }
  section.addEventListener('pointermove', setPointerFromEvent);
  section.addEventListener('pointerdown', setPointerFromEvent);
  section.addEventListener('pointerleave', () => { pointer.active = false; });

  function addDrop(x, y, strength, radius) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, heights[curIdx].fbo);
    gl.viewport(0, 0, SIM_RES, SIM_RES);
    gl.useProgram(dropProgram);
    bindQuad(dropProgram);
    gl.uniform2f(gl.getUniformLocation(dropProgram, 'u_point'), x, y);
    gl.uniform1f(gl.getUniformLocation(dropProgram, 'u_radius'), radius);
    gl.uniform1f(gl.getUniformLocation(dropProgram, 'u_strength'), strength);
    gl.uniform1f(gl.getUniformLocation(dropProgram, 'u_aspect'), aspect);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    drawQuad();
    gl.disable(gl.BLEND);
  }

  // ---------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------
  const texel = 1.0 / SIM_RES;
  function frame() {
    if (pointer.active) {
      const dx = pointer.x - lastPointer.x, dy = pointer.y - lastPointer.y;
      const speed = Math.min(Math.hypot(dx, dy) * 12.0, 1.0);
      if (speed > 0.002) {
        addDrop(pointer.x, pointer.y, 0.1 + speed * DROP_GAIN, DROP_RADIUS);
      }
      lastPointer.x = pointer.x; lastPointer.y = pointer.y;
    }

    const nextIdx = 3 - curIdx - prevIdx;
    gl.bindFramebuffer(gl.FRAMEBUFFER, heights[nextIdx].fbo);
    gl.viewport(0, 0, SIM_RES, SIM_RES);
    gl.useProgram(simProgram);
    bindQuad(simProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, heights[curIdx].tex);
    gl.uniform1i(gl.getUniformLocation(simProgram, 'u_cur'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, heights[prevIdx].tex);
    gl.uniform1i(gl.getUniformLocation(simProgram, 'u_prev'), 1);
    gl.uniform2f(gl.getUniformLocation(simProgram, 'u_texel'), texel, texel);
    gl.uniform1f(gl.getUniformLocation(simProgram, 'u_damping'), DAMPING);
    drawQuad();

    prevIdx = curIdx;
    curIdx = nextIdx;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(renderProgram);
    bindQuad(renderProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, heights[curIdx].tex);
    gl.uniform1i(gl.getUniformLocation(renderProgram, 'u_height'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.uniform1i(gl.getUniformLocation(renderProgram, 'u_bg'), 1);
    gl.uniform2f(gl.getUniformLocation(renderProgram, 'u_texel'), texel, texel);
    gl.uniform1f(gl.getUniformLocation(renderProgram, 'u_strength'), DISTORTION);
    drawQuad();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();


/*
  Reusable interactive water-ripple effect.

  Call WaterRipple.init({ ... }) once per section you want the effect on.
  Each call is fully independent — its own canvas, its own image, its own
  simulation, its own tunables. Nothing is shared between instances.

  USAGE
  -----
  <section class="hero" id="home" style="position:relative;">
    <canvas class="hero-ripple" id="heroRipple"></canvas>
    ...
  </section>

  <script src="water-ripple.js"></script>
  <script>
    WaterRipple.init({
      sectionId: 'home',
      canvasId: 'heroRipple',
      image: 'images/hero-bg.jpg'
    });

    // a second, independent instance on a different section:
    WaterRipple.init({
      sectionId: 'about',
      canvasId: 'aboutRipple',
      image: 'images/about-bg.jpg',
      distortion: 0.12,   // e.g. even calmer than the hero
      dropGain: 0.10
    });
  </script>

  Every <section> you use this on needs `position: relative` (or similar)
  in your CSS, and its canvas needs:
    position:absolute; inset:0; z-index:1; pointer-events:none;
  — same as the hero's .hero-ripple rule. Copy that rule and rename it,
  or just reuse .hero-ripple's styles for every canvas via a shared class.
*/
(function (global) {
  function init(options) {
    const opts = Object.assign({
      sectionId: null,      // required: id of the positioned container
      canvasId: null,       // required: id of the <canvas> inside it
      image: null,          // required: path to your background image
      simRes: 256,          // simulation grid resolution (perf vs detail)
      damping: 0.965,       // closer to 1 = ripples linger longer
      distortion: 0.18,     // how strongly ripples bend the image
      dropRadius: 0.025,    // splash size (normalized UV units)
      dropGain: 0.12,       // splash strength scales with cursor speed
      highlight: 0.15,      // brightness of ripple highlight edges
      shadow: 0.06          // darkness of ripple shadow edges
    }, options || {});

    const section = document.getElementById(opts.sectionId);
    const canvas = document.getElementById(opts.canvasId);
    if (!section || !canvas) {
      console.warn('WaterRipple.init: sectionId/canvasId not found', opts);
      return null;
    }
    if (!opts.image) {
      console.warn('WaterRipple.init: an `image` path is required', opts);
      return null;
    }

    const gl = canvas.getContext('webgl2');
    if (!gl) { canvas.style.display = 'none'; return null; }
    const floatExt = gl.getExtension('EXT_color_buffer_float');
    if (!floatExt) { canvas.style.display = 'none'; return null; }

    const SIM_RES = opts.simRes;

    // ---------------------------------------------------------------
    // Shader helpers
    // ---------------------------------------------------------------
    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    }
    function makeProgram(vs, fs) {
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
      return p;
    }

    const VERT = `#version 300 es
    in vec2 a_pos;
    out vec2 v_uv;
    void main(){
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }`;

    const SIM_FRAG = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_cur;
    uniform sampler2D u_prev;
    uniform vec2 u_texel;
    uniform float u_damping;
    out vec4 outColor;
    void main(){
      float l = texture(u_cur, v_uv - vec2(u_texel.x, 0.0)).r;
      float r = texture(u_cur, v_uv + vec2(u_texel.x, 0.0)).r;
      float d = texture(u_cur, v_uv - vec2(0.0, u_texel.y)).r;
      float u = texture(u_cur, v_uv + vec2(0.0, u_texel.y)).r;
      float p = texture(u_prev, v_uv).r;
      float h = (l + r + d + u) * 0.5 - p;
      h *= u_damping;
      outColor = vec4(h, 0.0, 0.0, 1.0);
    }`;

    const DROP_FRAG = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform vec2 u_point;
    uniform float u_radius;
    uniform float u_strength;
    uniform float u_aspect;
    out vec4 outColor;
    void main(){
      vec2 d = v_uv - u_point;
      d.x *= u_aspect;
      float dist = length(d);
      float falloff = smoothstep(u_radius, 0.0, dist);
      outColor = vec4(u_strength * falloff, 0.0, 0.0, 1.0);
    }`;

    const RENDER_FRAG = `#version 300 es
    precision highp float;
    in vec2 v_uv;
    uniform sampler2D u_height;
    uniform sampler2D u_bg;
    uniform vec2 u_texel;
    uniform float u_strength;
    uniform float u_highlight;
    uniform float u_shadow;
    out vec4 outColor;
    void main(){
      float l = texture(u_height, v_uv - vec2(u_texel.x, 0.0)).r;
      float r = texture(u_height, v_uv + vec2(u_texel.x, 0.0)).r;
      float d = texture(u_height, v_uv - vec2(0.0, u_texel.y)).r;
      float u = texture(u_height, v_uv + vec2(0.0, u_texel.y)).r;
      vec2 grad = vec2(r - l, u - d);
      vec2 uv2 = v_uv + grad * u_strength;
      vec3 base = texture(u_bg, uv2).rgb;
      float hi = clamp((grad.x - grad.y) * 6.0, 0.0, 1.0);
      float sh = clamp((grad.y - grad.x) * 6.0, 0.0, 1.0);
      vec3 color = base + vec3(hi) * u_highlight - vec3(sh) * u_shadow;
      outColor = vec4(color, 1.0);
    }`;

    const simProgram = makeProgram(VERT, SIM_FRAG);
    const dropProgram = makeProgram(VERT, DROP_FRAG);
    const renderProgram = makeProgram(VERT, RENDER_FRAG);

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    function bindQuad(prog) {
      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    function drawQuad() { gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }

    // ---------------------------------------------------------------
    // Simulation buffers (triple-buffered height field)
    // ---------------------------------------------------------------
    function makeTarget() {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, SIM_RES, SIM_RES, 0, gl.RED, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex, fbo };
    }
    const heights = [makeTarget(), makeTarget(), makeTarget()];
    let curIdx = 0, prevIdx = 1;
    heights.forEach(t => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.viewport(0, 0, SIM_RES, SIM_RES);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    });

    // ---------------------------------------------------------------
    // Background texture — this instance's own image, cover-fit cropped
    // ---------------------------------------------------------------
    const bgCanvas = document.createElement('canvas');
    const bctx = bgCanvas.getContext('2d');
    const bgTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const bgImage = new Image();
    let bgImageLoaded = false;
    bgImage.onload = () => { bgImageLoaded = true; paintBackground(bgCanvas.width || 1024, bgCanvas.height || 640); };
    bgImage.src = opts.image;

    function paintBackground(w, h) {
      bgCanvas.width = w; bgCanvas.height = h;
      if (!bgImageLoaded) return;
      const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
      const boxRatio = w / h;
      let dw, dh, dx, dy;
      if (imgRatio > boxRatio) {
        dh = h; dw = h * imgRatio; dx = (w - dw) / 2; dy = 0;
      } else {
        dw = w; dh = w / imgRatio; dx = 0; dy = (h - dh) / 2;
      }
      bctx.clearRect(0, 0, w, h);
      bctx.drawImage(bgImage, dx, dy, dw, dh);
      gl.bindTexture(gl.TEXTURE_2D, bgTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // ---------------------------------------------------------------
    // Sizing — fills this section only, resizes with it
    // ---------------------------------------------------------------
    let aspect = 1;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(section.clientWidth * dpr));
      const h = Math.max(1, Math.floor(section.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      aspect = w / h;
      paintBackground(1024, Math.round(1024 / aspect));
    }
    const ro = new ResizeObserver(resize);
    ro.observe(section);
    resize();

    // ---------------------------------------------------------------
    // Pointer tracking — scoped to this section only
    // ---------------------------------------------------------------
    let pointer = { x: 0.5, y: 0.5, active: false };
    let lastPointer = { x: 0.5, y: 0.5 };
    function setPointerFromEvent(e) {
      const rect = section.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / rect.width;
      pointer.y = 1.0 - (e.clientY - rect.top) / rect.height;
      pointer.active = true;
    }
    function onLeave() { pointer.active = false; }
    section.addEventListener('pointermove', setPointerFromEvent);
    section.addEventListener('pointerdown', setPointerFromEvent);
    section.addEventListener('pointerleave', onLeave);

    function addDrop(x, y, strength, radius) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, heights[curIdx].fbo);
      gl.viewport(0, 0, SIM_RES, SIM_RES);
      gl.useProgram(dropProgram);
      bindQuad(dropProgram);
      gl.uniform2f(gl.getUniformLocation(dropProgram, 'u_point'), x, y);
      gl.uniform1f(gl.getUniformLocation(dropProgram, 'u_radius'), radius);
      gl.uniform1f(gl.getUniformLocation(dropProgram, 'u_strength'), strength);
      gl.uniform1f(gl.getUniformLocation(dropProgram, 'u_aspect'), aspect);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      drawQuad();
      gl.disable(gl.BLEND);
    }

    // ---------------------------------------------------------------
    // Main loop
    // ---------------------------------------------------------------
    const texel = 1.0 / SIM_RES;
    let rafId = null;
    function frame() {
      if (pointer.active) {
        const dx = pointer.x - lastPointer.x, dy = pointer.y - lastPointer.y;
        const speed = Math.min(Math.hypot(dx, dy) * 12.0, 1.0);
        if (speed > 0.002) {
          addDrop(pointer.x, pointer.y, 0.1 + speed * opts.dropGain, opts.dropRadius);
        }
        lastPointer.x = pointer.x; lastPointer.y = pointer.y;
      }

      const nextIdx = 3 - curIdx - prevIdx;
      gl.bindFramebuffer(gl.FRAMEBUFFER, heights[nextIdx].fbo);
      gl.viewport(0, 0, SIM_RES, SIM_RES);
      gl.useProgram(simProgram);
      bindQuad(simProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, heights[curIdx].tex);
      gl.uniform1i(gl.getUniformLocation(simProgram, 'u_cur'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, heights[prevIdx].tex);
      gl.uniform1i(gl.getUniformLocation(simProgram, 'u_prev'), 1);
      gl.uniform2f(gl.getUniformLocation(simProgram, 'u_texel'), texel, texel);
      gl.uniform1f(gl.getUniformLocation(simProgram, 'u_damping'), opts.damping);
      drawQuad();

      prevIdx = curIdx;
      curIdx = nextIdx;

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(renderProgram);
      bindQuad(renderProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, heights[curIdx].tex);
      gl.uniform1i(gl.getUniformLocation(renderProgram, 'u_height'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bgTex);
      gl.uniform1i(gl.getUniformLocation(renderProgram, 'u_bg'), 1);
      gl.uniform2f(gl.getUniformLocation(renderProgram, 'u_texel'), texel, texel);
      gl.uniform1f(gl.getUniformLocation(renderProgram, 'u_strength'), opts.distortion);
      gl.uniform1f(gl.getUniformLocation(renderProgram, 'u_highlight'), opts.highlight);
      gl.uniform1f(gl.getUniformLocation(renderProgram, 'u_shadow'), opts.shadow);
      drawQuad();

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    // Return a handle so you can stop/clean up this instance if needed
    // (e.g. if the section gets removed dynamically):
    return {
      destroy() {
        cancelAnimationFrame(rafId);
        ro.disconnect();
        section.removeEventListener('pointermove', setPointerFromEvent);
        section.removeEventListener('pointerdown', setPointerFromEvent);
        section.removeEventListener('pointerleave', onLeave);
      }
    };
  }

  global.WaterRipple = { init };
})(window);