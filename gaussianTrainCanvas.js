// This file intentionally uses the global THREE from a CDN script include.
// (Some static hosts are picky about ES-module imports.)
const THREE = window.THREE;

class GaussianSystem {
  constructor({ count, referenceImageUrl }) {
    this.count = count;
    this.referenceImageUrl = referenceImageUrl;

    // CPU-side "model parameters"
    this.currentPositions = new Float32Array(count * 3);
    this.targetPositions = new Float32Array(count * 3);

    this.currentColors = new Float32Array(count * 3);
    this.targetColors = new Float32Array(count * 3);

    // Sigma is used for point size + the gaussian falloff in the shader.
    this.currentSigmas = new Float32Array(count);
    this.targetSigmas = new Float32Array(count);

    this._needsGeometryUpdate = false;

    this._positionAttr = null;
    this._colorAttr = null;
    this._sigmaAttr = null;
  }

  bindGeometry({ positionAttr, colorAttr, sigmaAttr }) {
    this._positionAttr = positionAttr;
    this._colorAttr = colorAttr;
    this._sigmaAttr = sigmaAttr;
  }

  setRandomCurrentState() {
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const p3 = i * 3;

      // Random init: looks like noise.
      this.currentPositions[p3 + 0] = Math.random() * 2 - 1;
      this.currentPositions[p3 + 1] = Math.random() * 2 - 1;
      // Keep Z in front of the camera to avoid clipping/frustum edge cases.
      this.currentPositions[p3 + 2] = 0.01 + Math.random() * 0.03;

      // Random colors: biased away from pure black so additive blending stays visible.
      this.currentColors[p3 + 0] = 0.25 + Math.random() * 0.75;
      this.currentColors[p3 + 1] = 0.25 + Math.random() * 0.75;
      this.currentColors[p3 + 2] = 0.25 + Math.random() * 0.75;

      // Moderate sigma.
      this.currentSigmas[i] = 0.012 + Math.random() * 0.03;
    }
    this._needsGeometryUpdate = true;
    this._setNeedsUpdate();
  }

  async init() {
    // Target is derived from a reference image (carFront.png).
    const image = await this._loadReferenceImage(this.referenceImageUrl);
    const ref = this._sampleImage(image, 256, 256);
    this._initTargetsFromRef(ref.imageData, ref.width, ref.height);
    this.setRandomCurrentState();
  }

  _setNeedsUpdate() {
    if (!this._positionAttr || !this._colorAttr || !this._sigmaAttr) return;
    this._positionAttr.needsUpdate = true;
    this._colorAttr.needsUpdate = true;
    this._sigmaAttr.needsUpdate = true;
    this._needsGeometryUpdate = false;
  }

  _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  applyBrushTraining({ brushX, brushY, radiusWorld, learningRate }) {
    const r2Inv = 1.0 / (radiusWorld * radiusWorld + 1e-8);
    const n = this.count;

    for (let i = 0; i < n; i++) {
      const p3 = i * 3;
      const dx = this.targetPositions[p3 + 0] - brushX;
      const dy = this.targetPositions[p3 + 1] - brushY;

      const influence = Math.exp(-(dx * dx + dy * dy) * r2Inv);
      if (influence < 0.008) continue; // skip far splats for speed

      const t = Math.min(0.22, influence * learningRate);
      if (t <= 0) continue;

      // "Train" toward ground truth parameters (target).
      this.currentPositions[p3 + 0] = this._lerp(
        this.currentPositions[p3 + 0],
        this.targetPositions[p3 + 0],
        t
      );
      this.currentPositions[p3 + 1] = this._lerp(
        this.currentPositions[p3 + 1],
        this.targetPositions[p3 + 1],
        t
      );
      this.currentPositions[p3 + 2] = this._lerp(
        this.currentPositions[p3 + 2],
        this.targetPositions[p3 + 2],
        t * 0.75
      );

      this.currentColors[p3 + 0] = this._lerp(
        this.currentColors[p3 + 0],
        this.targetColors[p3 + 0],
        t
      );
      this.currentColors[p3 + 1] = this._lerp(
        this.currentColors[p3 + 1],
        this.targetColors[p3 + 1],
        t
      );
      this.currentColors[p3 + 2] = this._lerp(
        this.currentColors[p3 + 2],
        this.targetColors[p3 + 2],
        t
      );

      this.currentSigmas[i] = this._lerp(this.currentSigmas[i], this.targetSigmas[i], t);
    }

    this._needsGeometryUpdate = true;
    this._setNeedsUpdate();
  }

  async _loadReferenceImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // For local assets (same origin) this isn't strictly necessary, but it's harmless.
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load reference image: ${url}`));
      img.src = url;
    });
  }

  _sampleImage(image, targetW, targetH) {
    const c = document.createElement("canvas");
    c.width = targetW;
    c.height = targetH;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(image, 0, 0, targetW, targetH);
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    return { imageData, width: targetW, height: targetH };
  }

  _initTargetsFromRef(imageData, width, height) {
    const data = imageData.data;
    const n = this.count;

    // Build a candidate set of pixels likely to represent the subject.
    const candidates = [];
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i + 0] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const a = data[i + 3] / 255;

      // Luminance for "near-white" rejection.
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (a > 0.08 && lum < 0.985) {
        const pixelIndex = i / 4; // convert to pixel index
        candidates.push(pixelIndex);
      }
    }

    // Fallback if the image doesn't have transparency.
    if (candidates.length < Math.max(200, n * 0.01)) {
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3] / 255;
        if (a > 0.08) candidates.push(i / 4);
      }
    }

    // Final fallback: use all pixels.
    if (candidates.length < 50) {
      for (let i = 0; i < data.length; i += 4) candidates.push(i / 4);
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

      // Normalized world coords for the orthographic camera.
      // x: [-1, 1], y: [-1, 1] with +Y up.
      const xN = (x / (width - 1)) * 2 - 1;
      const yN = 1 - (y / (height - 1)) * 2;

      const p3 = i * 3;
      this.targetPositions[p3 + 0] = xN;
      this.targetPositions[p3 + 1] = yN;
      // Keep targets slightly in front of the camera.
      this.targetPositions[p3 + 2] = 0.01 + Math.random() * 0.02;

      // Slightly "ink" the color based on alpha to prevent washed-out backgrounds.
      const ink = 0.3 + 0.7 * a;
      this.targetColors[p3 + 0] = r * ink;
      this.targetColors[p3 + 1] = g * ink;
      this.targetColors[p3 + 2] = b * ink;

      // Sigma: more opaque pixels get tighter splats.
      // (You can tune this; it's intentionally "art-directed".)
      const sigmaBase = 0.006;
      const sigmaRange = 0.03;
      const sigma = sigmaBase + (1 - a) * sigmaRange;
      this.targetSigmas[i] = Math.min(0.045, Math.max(0.005, sigma));
    }
  }
}

class GaussianRenderer {
  constructor({ canvas, system }) {
    this.canvas = canvas;
    this.system = system;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
    this.camera.position.set(0, 0, 1);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    this._createPoints();
  }

  _createPoints() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.system.currentPositions, 3)
    );
    geometry.setAttribute(
      "aColor",
      new THREE.BufferAttribute(this.system.currentColors, 3)
    );
    geometry.setAttribute(
      "aSigma",
      new THREE.BufferAttribute(this.system.currentSigmas, 1)
    );
    geometry.computeBoundingSphere();

    // Let Three know we expect frequent updates for position/color/sigma.
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    geometry.attributes.aColor.setUsage(THREE.DynamicDrawUsage);
    geometry.attributes.aSigma.setUsage(THREE.DynamicDrawUsage);

    this.system.bindGeometry({
      positionAttr: geometry.attributes.position,
      colorAttr: geometry.attributes.aColor,
      sigmaAttr: geometry.attributes.aSigma,
    });

    const vertexShader = `
      attribute vec3 aColor;
      attribute float aSigma;
      varying vec3 vColor;
      varying float vSigma;
      uniform float uMinDim;

      void main() {
        vColor = aColor;
        vSigma = aSigma;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

        // Convert world-space sigma into a sprite size in pixels.
        // (The gaussian falloff in the fragment shader is intentionally smooth.)
        float pointSize = max(1.0, aSigma * uMinDim * 2.4);
        gl_PointSize = pointSize;
      }
    `;

    const fragmentShader = `
      precision highp float;
      varying vec3 vColor;
      varying float vSigma;

      uniform float uIntensity;

      void main() {
        // gl_PointCoord is in [0,1] over the point sprite.
        vec2 p = gl_PointCoord * 2.0 - 1.0; // [-1,1]
        float r2 = dot(p, p);

        // Gaussian splat falloff. Using vSigma in a normalized way to avoid extreme values.
        float sigmaN = clamp(vSigma * 30.0, 0.2, 3.0);
        float I = exp(-r2 / (2.0 * sigmaN * sigmaN));

        // Additive blending uses alpha, so keep alpha proportional to intensity.
        float a = I;
        vec3 col = vColor * (0.6 + 0.9 * sigmaN) * uIntensity;
        gl_FragColor = vec4(col * a, a);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMinDim: { value: 512 },
        uIntensity: { value: 1.2 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, material);
    // We mutate point positions frequently; avoid culling based on stale bounds.
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  resize(width, height) {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);

    const minDim = Math.max(1, Math.min(width, height));
    this.points.material.uniforms.uMinDim.value = minDim;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

class BrushInteraction {
  constructor({ cardEl, canvas, system, debugLabel = "GaussianTraining" }) {
    this.cardEl = cardEl;
    this.canvas = canvas;
    this.system = system;
    this.debugLabel = debugLabel;

    this.isPainting = false;

    // Feel free to tweak these.
    this.brushRadiusPx = 52;
    this.learningRate = 0.085;

    this.cursorEl = cardEl.querySelector(".gaussianBrushCursor");

    this._lastWorldX = 0;
    this._lastWorldY = 0;

    this._bind();
  }

  _bind() {
    // Prevent the card anchor from navigating while painting.
    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    this.canvas.addEventListener("click", prevent, { passive: false });
    this.cardEl.addEventListener("click", prevent, { passive: false });

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
      const radiusWorld = (this.brushRadiusPx / minDim) * 2;
      this.system.applyBrushTraining({
        brushX: x,
        brushY: y,
        radiusWorld,
        learningRate: this.learningRate,
      });

      this._lastWorldX = x;
      this._lastWorldY = y;
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

    const stop = () => {
      this.isPainting = false;
      delete this.cardEl.dataset.painting;
    };

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

  if (!window.THREE) {
    if (statusEl) statusEl.textContent = "WebGL unavailable (Three.js missing).";
    // eslint-disable-next-line no-console
    console.error("Three.js failed to load (window.THREE is missing).");
    return;
  }

  // Prevent the wrapping anchor from navigating, even before the training model is ready.
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

  try {
    // Create the system first.
    const system = new GaussianSystem({
      count: 10000,
      referenceImageUrl: "carFront.png",
    });

    await system.init();

    const renderer = new GaussianRenderer({ canvas, system });

    if (statusEl) statusEl.style.display = "none";

    const resize = () => {
      const rect = cardEl.getBoundingClientRect();
      renderer.resize(Math.max(2, rect.width), Math.max(2, rect.height));
    };

  // Initial sizing and then keep responsive.
    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(cardEl);

    const brush = new BrushInteraction({ cardEl, canvas, system });
    brush.setBrushRadiusPx(52);

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
    if (statusEl) statusEl.textContent = "WebGL unavailable (init failed).";
    // eslint-disable-next-line no-console
    console.error("Gaussian training canvas failed:", err);
  }
}

window.addEventListener("load", () => {
  initGaussianTrainingCanvas();
});

