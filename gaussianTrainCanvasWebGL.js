// One sigma to rule them all — start and end splats are identical in size.
// At 600px canvas with scale 3.8: pointSize ≈ 0.0055 * 600 * 3.8 ≈ 12.5px CSS.
// Adjust here if you want bigger/smaller dots.
const SPLAT_SIGMA = 0.0055;

class GaussianSystem {
  constructor({ count, referenceImageUrl }) {
    this.count = count;
    this.referenceImageUrl = referenceImageUrl;

    // CPU-side "model parameters"
    this.currentPositions = new Float32Array(count * 3); // x,y,z (z ignored in shader)
    this.targetPositions = new Float32Array(count * 3);

    this.currentColors = new Float32Array(count * 3); // r,g,b
    this.targetColors = new Float32Array(count * 3);

    // Sigma affects point size + fragment gaussian falloff.
    this.currentSigmas = new Float32Array(count);
    this.targetSigmas = new Float32Array(count);

    this._dirty = true;

    // For UX/debug: tells whether we trained toward the image or a procedural target.
    this._usedReferenceImageUrl = null;

    // If sampling pixel data fails (often due to CORS/tainted canvas), store the message.
    this._insecureFailureMessage = null;
  }

  setRandomCurrentState() {
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const p3 = i * 3;
      // Random init in clip space.
      this.currentPositions[p3 + 0] = Math.random() * 2 - 1;
      this.currentPositions[p3 + 1] = Math.random() * 2 - 1;
      this.currentPositions[p3 + 2] = 0;

      // Random colors — full range, vivid noise.
      this.currentColors[p3 + 0] = Math.random();
      this.currentColors[p3 + 1] = Math.random();
      this.currentColors[p3 + 2] = Math.random();

      // Fixed sigma — same size as the trained target so start = end in appearance.
      this.currentSigmas[i] = SPLAT_SIGMA;
    }
    this._dirty = true;
  }

  async init() {
    // Target is derived from a reference image if available.
    try {
      const image = await this._loadReferenceImageWithDomFallback(this.referenceImageUrl);
      if (image) {
        this._usedReferenceImageUrl = image.__sourceUrl || this.referenceImageUrl;
        const ref = this._sampleImage(image, 256, 256);
        this._initTargetsFromRef(ref.imageData, ref.width, ref.height);
      } else {
        this._usedReferenceImageUrl = null;
        this._initProceduralTargets();
      }
    } catch (err) {
      // Typical case: "The operation is insecure" from getImageData on a tainted canvas.
      this._usedReferenceImageUrl = null;
      this._initProceduralTargets();
      if (err && typeof err.message === "string") {
        this._insecureFailureMessage = err.message;
      } else {
        this._insecureFailureMessage = "Unknown error while sampling reference image.";
      }
    }
    this.setRandomCurrentState();
  }

  applyBrushTraining({ brushX, brushY, radiusWorld, learningRate }) {
    const r2Inv = 1.0 / (radiusWorld * radiusWorld + 1e-8);
    const n = this.count;

    for (let i = 0; i < n; i++) {
      const p3 = i * 3;
      const dx = this.targetPositions[p3 + 0] - brushX;
      const dy = this.targetPositions[p3 + 1] - brushY;

      const influence = Math.exp(-(dx * dx + dy * dy) * r2Inv);
      if (influence < 0.001) continue; // Skip far splats for speed.

      const t = Math.min(0.32, influence * learningRate);
      if (t <= 0) continue;

      // Train toward ground truth parameters (target).
      this.currentPositions[p3 + 0] +=
        (this.targetPositions[p3 + 0] - this.currentPositions[p3 + 0]) * t;
      this.currentPositions[p3 + 1] +=
        (this.targetPositions[p3 + 1] - this.currentPositions[p3 + 1]) * t;

      this.currentColors[p3 + 0] +=
        (this.targetColors[p3 + 0] - this.currentColors[p3 + 0]) * t;
      this.currentColors[p3 + 1] +=
        (this.targetColors[p3 + 1] - this.currentColors[p3 + 1]) * t;
      this.currentColors[p3 + 2] +=
        (this.targetColors[p3 + 2] - this.currentColors[p3 + 2]) * t;

      this.currentSigmas[i] += (this.targetSigmas[i] - this.currentSigmas[i]) * t;
    }

    this._dirty = true;
  }

  _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  async _loadReferenceImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Avoid forcing crossOrigin: sampling local/same-origin assets doesn't need it,
      // and some environments treat it as blocked.
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load reference image: ${url}`));
      img.src = url;
    });
  }

  async _loadReferenceImageFromDom(imgEl) {
    if (!imgEl) return null;
    // If it already loaded successfully, use it.
    if (imgEl.complete && imgEl.naturalWidth > 0) return imgEl;

    // Otherwise, wait a short time for load; if it fails, return null.
    return new Promise((resolve) => {
      const onLoad = () => {
        cleanup();
        resolve(imgEl.naturalWidth > 0 ? imgEl : null);
      };
      const onError = () => {
        cleanup();
        resolve(null);
      };
      const cleanup = () => {
        imgEl.removeEventListener("load", onLoad);
        imgEl.removeEventListener("error", onError);
      };
      imgEl.addEventListener("load", onLoad, { once: true });
      imgEl.addEventListener("error", onError, { once: true });
      // If it never finishes, the load handler may not fire; resolve to null later.
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 2500);
    });
  }

  async _loadReferenceImageWithFallback(url) {
    const normalizedBase = url.replace(/^\.?\//, "");
    const candidates = [
      url,
      normalizedBase,
      `./${normalizedBase}`,
      `/${normalizedBase}`,
      `assets/${normalizedBase}`,
      `./assets/${normalizedBase}`,
      `/assets/${normalizedBase}`,
      `images/${normalizedBase}`,
      `./images/${normalizedBase}`,
      `/images/${normalizedBase}`,
    ];

    const deduped = Array.from(new Set(candidates));
    for (const candidate of deduped) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const img = await this._loadReferenceImage(candidate);
        // attach for debugging/UX (harmless in practice)
        img.__sourceUrl = candidate;
        return img;
      } catch {
        // Keep trying candidate paths.
      }
    }
    return null;
  }

  async _loadReferenceImageWithDomFallback(url) {
    // Prefer a pre-declared <img> in the DOM (more reliably allowed by browsers).
    const domImg = document.getElementById("gaussianReferenceImage");
    const domImage = await this._loadReferenceImageFromDom(domImg);
    if (domImage) {
      domImage.__sourceUrl = domImg.currentSrc || domImg.src || url;
      return domImage;
    }
    return await this._loadReferenceImageWithFallback(url);
  }

  _sampleImage(image, targetW, targetH) {
    const c = document.createElement("canvas");
    c.width = targetW;
    c.height = targetH;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("2D canvas context unavailable for sampling reference image.");

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(image, 0, 0, targetW, targetH);
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, targetW, targetH);
    } catch (err) {
      // Re-throw with a clearer explanation for the caller.
      const msg = err && typeof err.message === "string" ? err.message : "getImageData failed.";
      throw new Error(`Canvas pixel read blocked: ${msg}`);
    }
    return { imageData, width: targetW, height: targetH };
  }

  _initTargetsFromRef(imageData, width, height) {
    const data = imageData.data;
    const n = this.count;

    // Build a candidate set of pixels likely to represent the subject.
    // Prefer alpha-based sampling (works well for cutout PNGs).
    const candidates = [];

    // Pass 1: alpha + avoid near-white.
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i + 0] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const a = data[i + 3] / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      if (a > 0.06 && lum < 0.99) candidates.push(i / 4);
    }

    // Pass 2: relax alpha if needed.
    if (candidates.length < Math.max(200, n * 0.02)) {
      candidates.length = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i + 0] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const a = data[i + 3] / 255;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        if (a > 0.02 && lum < 0.995) candidates.push(i / 4);
      }
    }

    // Pass 3: fallback to any non-near-white pixel.
    if (candidates.length < 50) {
      candidates.length = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i + 0] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum < 0.98) candidates.push(i / 4);
      }
    }

    // Still nothing useful? Switch to procedural targets.
    if (candidates.length < 50) {
      this._initProceduralTargets();
      return;
    }

    for (let i = 0; i < n; i++) {
      const pick = candidates[(Math.random() * candidates.length) | 0];
      const x = pick % width;
      const y = (pick / width) | 0;

      const p = (y * width + x) * 4;
      const r = data[p + 0] / 255;
      const g = data[p + 1] / 255;
      const b = data[p + 2] / 255;
      const a = data[p + 3] / 255;

      // Normalized world coords for clip-space orthographic camera.
      // x: [-1,1], y: [-1,1] with +Y up.
      const xN = (x / (width - 1)) * 2 - 1;
      const yN = 1 - (y / (height - 1)) * 2;

      const p3 = i * 3;
      this.targetPositions[p3 + 0] = xN;
      this.targetPositions[p3 + 1] = yN;
      this.targetPositions[p3 + 2] = 0;

      // Use full image color — normal blending doesn't blow out.
      this.targetColors[p3 + 0] = r;
      this.targetColors[p3 + 1] = g;
      this.targetColors[p3 + 2] = b;

      // Fixed sigma — same as random init so splat size never changes.
      this.targetSigmas[i] = SPLAT_SIGMA;
    }
  }

  _initProceduralTargets() {
    // Fallback target shape (spiral-ish blob) so animation still works without an image.
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const a = 18.0 * Math.PI * t;
      const r = 0.15 + 0.7 * Math.pow(t, 0.7);
      const jitter = 0.08 * (Math.random() - 0.5);
      const x = (r + jitter) * Math.cos(a);
      const y = (r + jitter) * Math.sin(a);

      const p3 = i * 3;
      this.targetPositions[p3 + 0] = Math.max(-1, Math.min(1, x));
      this.targetPositions[p3 + 1] = Math.max(-1, Math.min(1, y));
      this.targetPositions[p3 + 2] = 0;

      // Warm-to-cool gradient.
      this.targetColors[p3 + 0] = this._lerp(0.95, 0.25, t);
      this.targetColors[p3 + 1] = this._lerp(0.75, 0.45, t);
      this.targetColors[p3 + 2] = this._lerp(0.25, 0.95, t);

      this.targetSigmas[i] = SPLAT_SIGMA;
    }
  }
}

class WebGLRenderer {
  constructor({ canvas, system }) {
    this.canvas = canvas;
    this.system = system;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      depth: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });

    if (!gl) throw new Error("WebGL2 context unavailable.");

    this.gl = gl;
    this.program = this._createProgram();
    this._createBuffersAndVAO();

    this.uMinDim = gl.getUniformLocation(this.program, "uMinDim");
    this.uIntensity = gl.getUniformLocation(this.program, "uIntensity");

    gl.useProgram(this.program);
    gl.uniform1f(this.uIntensity, 1.0);

    // Normal alpha compositing — avoids additive blowout to white with many overlapping splats.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    gl.clearColor(0, 0, 0, 0);
  }

  _createProgram() {
    const gl = this.gl;

    const vertexShader = `#version 300 es
      precision highp float;
      in vec3 aPosition;
      in vec3 aColor;
      in float aSigma;
      uniform float uMinDim;
      out vec3 vColor;
      void main() {
        vColor = aColor;
        gl_Position = vec4(aPosition.xy, 0.0, 1.0);
        // sigma drives size only — not brightness. Scale 3.8 gives ~1px per image-pixel
        // at 10k splats on a ~600px canvas.
        gl_PointSize = max(1.0, aSigma * uMinDim * 3.8);
      }
    `;

    const fragmentShader = `#version 300 es
      precision highp float;
      in vec3 vColor;
      uniform float uIntensity;
      out vec4 outColor;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(p, p);
        // Discard corners so sprites are circular, not square.
        if (r2 > 1.0) discard;
        // Soft edge falloff — gives a clean round dot.
        float alpha = exp(-r2 * 3.5);
        vec3 col = vColor * uIntensity;
        outColor = vec4(col, alpha);
      }
    `;

    const vs = this._compileShader(gl.VERTEX_SHADER, vertexShader);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fragmentShader);
    const program = gl.createProgram();
    if (!program) throw new Error("Failed to create WebGL program.");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader link failed: ${info}`);
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to create shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${info}`);
    }
    return shader;
  }

  _createBuffersAndVAO() {
    const gl = this.gl;
    const system = this.system;
    const count = system.count;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // aPosition (vec3)
    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, system.currentPositions, gl.DYNAMIC_DRAW);
    const aPosition = gl.getAttribLocation(this.program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    // aColor (vec3)
    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, system.currentColors, gl.DYNAMIC_DRAW);
    const aColor = gl.getAttribLocation(this.program, "aColor");
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);

    // aSigma (float)
    this.sigmaBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sigmaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, system.currentSigmas, gl.DYNAMIC_DRAW);
    const aSigma = gl.getAttribLocation(this.program, "aSigma");
    gl.enableVertexAttribArray(aSigma);
    gl.vertexAttribPointer(aSigma, 1, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.count = count;
  }

  resize(widthCss, heightCss) {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(2, Math.floor(widthCss * dpr));
    const height = Math.max(2, Math.floor(heightCss * dpr));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Point sizing uses pixel units.
    gl.useProgram(this.program);
    gl.uniform1f(this.uMinDim, Math.min(this.canvas.width, this.canvas.height));
  }

  _uploadIfDirty() {
    if (!this.system._dirty) return;
    const gl = this.gl;
    const system = this.system;

    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, system.currentPositions);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, system.currentColors);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.sigmaBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, system.currentSigmas);

    gl.bindVertexArray(null);
    system._dirty = false;
  }

  render() {
    const gl = this.gl;
    this._uploadIfDirty();

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, this.count);
    gl.bindVertexArray(null);
  }
}

class BrushInteraction {
  constructor({ cardEl, canvas, system }) {
    this.cardEl = cardEl;
    this.canvas = canvas;
    this.system = system;

    this.isPainting = false;

    this.brushRadiusPx = 60;
    this.learningRate = 0.14;

    this.cursorEl = cardEl.querySelector(".gaussianBrushCursor");

    this._bind();
  }

  _bind() {
    const getWorldFromClient = (clientX, clientY) => {
      const rect = this.cardEl.getBoundingClientRect();
      const xN = ((clientX - rect.left) / rect.width) * 2 - 1;
      const yN = 1 - ((clientY - rect.top) / rect.height) * 2;
      return { x: xN, y: yN, rect };
    };

    const updateCursor = (clientX, clientY) => {
      if (!this.cursorEl) return;
      const rect = this.cardEl.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.cursorEl.style.left = `${x}px`;
      this.cursorEl.style.top = `${y}px`;
    };

    const trainingStep = (clientX, clientY) => {
      const { x, y, rect } = getWorldFromClient(clientX, clientY);
      const minDim = Math.max(1, Math.min(rect.width, rect.height));
      const radiusWorld = (this.brushRadiusPx / minDim) * 2.5;

      this.system.applyBrushTraining({
        brushX: x,
        brushY: y,
        radiusWorld,
        learningRate: this.learningRate,
      });
    };

    const stop = () => {
      this.isPainting = false;
      this.cardEl.dataset.painting = "false";
    };

    this.canvas.addEventListener("pointerdown", (e) => {
      this.isPainting = true;
      this.cardEl.dataset.painting = "true";
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {}

      updateCursor(e.clientX, e.clientY);
      trainingStep(e.clientX, e.clientY);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.isPainting) {
        updateCursor(e.clientX, e.clientY);
        return;
      }
      updateCursor(e.clientX, e.clientY);
      trainingStep(e.clientX, e.clientY);
    });

    this.canvas.addEventListener("pointerup", stop);
    this.canvas.addEventListener("pointercancel", stop);
    this.canvas.addEventListener("pointerleave", stop);
  }

  setBrushRadiusPx(px) {
    this.brushRadiusPx = px;
    if (this.cursorEl) {
      this.cursorEl.style.width = `${px * 2}px`;
      this.cursorEl.style.height = `${px * 2}px`;
    }
  }
}

async function initGaussianTrainingCanvas() {
  const canvas = document.getElementById("gaussianTrainCanvas");
  const cardEl = document.querySelector(".gaussianTrainCard");
  const resetBtn = document.getElementById("gaussianResetBtn");
  const statusEl = document.getElementById("gaussianTrainStatus");

  if (!canvas || !cardEl) return;

  const preventNav = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const link = cardEl.closest("a");
  if (link) {
    link.addEventListener("click", preventNav, { passive: false });
    link.addEventListener("pointerdown", preventNav, { passive: false });
  }
  canvas.addEventListener("click", preventNav, { passive: false });
  canvas.addEventListener("pointerdown", preventNav, { passive: false });

  if (statusEl) statusEl.textContent = "Loading splats...";

  try {
    // Create system first.
    const system = new GaussianSystem({
      count: 10000,
      referenceImageUrl: "carFront.png",
    });

    await system.init();

    const renderer = new WebGLRenderer({ canvas, system });

    if (statusEl) {
      const mode = system._usedReferenceImageUrl
        ? `Target: image (${system._usedReferenceImageUrl})`
        : system._insecureFailureMessage
          ? `Target: procedural fallback (pixel access blocked: ${system._insecureFailureMessage})`
          : "Target: procedural fallback";
      statusEl.textContent = mode;
      if (system._usedReferenceImageUrl) {
        setTimeout(() => {
          statusEl.style.display = "none";
        }, 900);
      } else {
        // Keep visible so it's obvious why the model isn't reconstructing.
        statusEl.style.display = "flex";
      }
    }

    const resize = () => {
      const rect = cardEl.getBoundingClientRect();
      renderer.resize(Math.max(2, rect.width), Math.max(2, rect.height));
    };
    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(cardEl);

    const brush = new BrushInteraction({ cardEl, canvas, system });
    brush.setBrushRadiusPx(60);

    const animate = () => {
      renderer.render();
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    if (resetBtn) {
      resetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        system.setRandomCurrentState();
      });
    }
  } catch (err) {
    if (statusEl) {
      const msg =
        err && typeof err.message === "string"
          ? err.message
          : "WebGL unavailable (init failed).";
      statusEl.textContent = `WebGL unavailable: ${msg}`;
    }
    // eslint-disable-next-line no-console
    console.error("Gaussian training canvas failed:", err);
  }
}

window.addEventListener("load", initGaussianTrainingCanvas);

