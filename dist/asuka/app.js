const $ = (selector) => document.querySelector(selector);
const app = $("#app");
const stage = $("#cardStage");
const rotator = $("#cardRotator");
const reliefCanvas = $("#reliefCanvas");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  targetX: 0,
  targetY: 0,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  activePointer: null,
  downX: 0,
  downY: 0,
  downAt: 0,
  moved: false,
  flipped: false,
  config: null,
  relief: null,
};

function clamp(value, min = -1, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function colorToRgb(value) {
  const hex = value.replace("#", "").trim();
  const full = hex.length === 3 ? [...hex].map((char) => char + char).join("") : hex;
  const parsed = Number.parseInt(full, 16);
  if (!Number.isFinite(parsed)) return "255, 92, 53";
  return `${(parsed >> 16) & 255}, ${(parsed >> 8) & 255}, ${parsed & 255}`;
}

function setImage(selector, source, alt = "") {
  const image = $(selector);
  if (!source) {
    image.hidden = true;
    image.removeAttribute("src");
    return;
  }
  image.hidden = false;
  image.src = source;
  image.alt = alt;
}

function setText(selector, value) {
  const element = $(selector);
  element.textContent = value || "";
  element.hidden = !value;
}

function applyConfig(config) {
  state.config = config;
  const { front, back, effects } = config;
  document.documentElement.lang = config.meta?.lang || "en";
  document.title = config.meta?.title || front.title || "Holographic Card";
  const galleryLink = $("#galleryLink");
  if (config.meta?.collectionUrl) {
    galleryLink.href = config.meta.collectionUrl;
    galleryLink.hidden = false;
  }

  const accent = back.accent || "#ff5c35";
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-rgb", colorToRgb(accent));
  document.documentElement.style.setProperty("--bg-z", `${effects.backgroundDepth ?? -12}px`);
  document.documentElement.style.setProperty("--subject-z", `${effects.subjectDepth ?? 42}px`);
  document.documentElement.style.setProperty("--line-z", `${effects.lineDepth ?? 50}px`);
  document.documentElement.style.setProperty("--overlay-z", `${effects.overlayDepth ?? 58}px`);
  document.documentElement.style.setProperty("--foil-opacity", (effects.foil ?? 0.66) * 0.78);
  document.documentElement.style.setProperty("--glare-opacity", effects.glare ?? 0.5);

  setImage("#frontBackground", front.background);
  setImage("#subjectContact", front.subject);
  setImage("#subjectFallback", front.subject, front.alt || "");
  setImage("#frontLineart", front.lineart);
  setImage("#frontOverlay", front.overlay);
  setText("#frontEyebrow", front.eyebrow);
  setText("#frontTitle", front.title);
  setText("#frontSubtitle", front.subtitle);
  $("#frontCopy").hidden = front.showLabels === false;

  setImage("#backBackground", back.background);
  setImage("#backImage", back.image, back.imageAlt || "");
  if (back.image) $("#backImage").style.display = "block";
  setText("#backEyebrow", back.eyebrow);
  setText("#backNumber", back.number);
  setText("#backTitle", back.title);
  setText("#backBody", back.body);
  setText("#backSignature", back.signature);

  const facts = $("#backFacts");
  facts.replaceChildren();
  for (const fact of back.facts || []) {
    const wrapper = document.createElement("div");
    wrapper.className = "fact";
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = fact.label || "";
    detail.textContent = fact.value || "";
    wrapper.append(term, detail);
    facts.append(wrapper);
  }
  facts.hidden = !(back.facts || []).length;

  const links = $("#backLinks");
  links.replaceChildren();
  for (const link of back.links || []) {
    if (!/^https:\/\//i.test(link.url || "")) continue;
    const anchor = document.createElement("a");
    anchor.href = link.url;
    anchor.textContent = link.label || "OPEN";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.addEventListener("pointerdown", (event) => event.stopPropagation());
    links.append(anchor);
  }
  links.hidden = !links.childElementCount;
}

function pointerPosition(event) {
  const rect = stage.getBoundingClientRect();
  return {
    x: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1),
    y: clamp(((event.clientY - rect.top) / rect.height) * 2 - 1),
  };
}

function setTargetFromEvent(event) {
  const point = pointerPosition(event);
  state.targetX = point.x;
  state.targetY = point.y;
}

function flipCard(force) {
  state.flipped = typeof force === "boolean" ? force : !state.flipped;
  stage.classList.toggle("is-flipped", state.flipped);
  stage.setAttribute("aria-pressed", String(state.flipped));
  $("#flipButton").textContent = state.flipped ? "翻到正面" : "翻到背面";
}

stage.addEventListener("pointerdown", (event) => {
  if (state.activePointer !== null) return;
  state.activePointer = event.pointerId;
  state.downX = event.clientX;
  state.downY = event.clientY;
  state.downAt = performance.now();
  state.moved = false;
  stage.setPointerCapture(event.pointerId);
  setTargetFromEvent(event);
});

stage.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" && event.pointerId !== state.activePointer) return;
  if (state.activePointer !== null) {
    state.moved ||= Math.hypot(event.clientX - state.downX, event.clientY - state.downY) > 8;
  }
  setTargetFromEvent(event);
});

stage.addEventListener("pointerup", (event) => {
  if (event.pointerId !== state.activePointer) return;
  const wasTap = !state.moved && performance.now() - state.downAt < 420;
  state.activePointer = null;
  if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  if (wasTap) flipCard();
  state.targetX = 0;
  state.targetY = 0;
});

stage.addEventListener("pointercancel", () => {
  state.activePointer = null;
  state.targetX = 0;
  state.targetY = 0;
});

stage.addEventListener("pointerleave", (event) => {
  if (event.pointerType === "mouse" && state.activePointer === null) {
    state.targetX = 0;
    state.targetY = 0;
  }
});

stage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    flipCard();
  }
});

$("#flipButton").addEventListener("click", () => flipCard());
$("#resetButton").addEventListener("click", () => {
  state.targetX = 0;
  state.targetY = 0;
  state.x = 0;
  state.y = 0;
  state.vx = 0;
  state.vy = 0;
  flipCard(false);
});

function setMotionVariables(x, y) {
  const maxTilt = reduceMotion ? 3 : state.config.effects.maxTilt ?? 11;
  const style = rotator.style;
  style.setProperty("--tilt-x", `${(-y * maxTilt).toFixed(3)}deg`);
  style.setProperty("--tilt-y", `${(x * maxTilt).toFixed(3)}deg`);
  style.setProperty("--shadow-x", `${(-x * 32).toFixed(2)}px`);
  style.setProperty("--shadow-y", `${(28 - y * 24).toFixed(2)}px`);
  style.setProperty("--bg-x", `${(-x * 14).toFixed(2)}px`);
  style.setProperty("--bg-y", `${(-y * 14).toFixed(2)}px`);
  style.setProperty("--subject-x", `${(x * 18).toFixed(2)}px`);
  style.setProperty("--subject-y", `${(y * 18).toFixed(2)}px`);
  style.setProperty("--contact-x", `${(-x * 16).toFixed(2)}px`);
  style.setProperty("--contact-y", `${(11 - y * 16).toFixed(2)}px`);
  style.setProperty("--line-x", `${(x * 21).toFixed(2)}px`);
  style.setProperty("--line-y", `${(y * 21).toFixed(2)}px`);
  style.setProperty("--overlay-x", `${(x * 24).toFixed(2)}px`);
  style.setProperty("--overlay-y", `${(y * 24).toFixed(2)}px`);
  style.setProperty("--overlay-shadow-x", `${(-x * 3.5).toFixed(2)}px`);
  style.setProperty("--overlay-shadow-y", `${(-y * 3.5).toFixed(2)}px`);
  style.setProperty("--pointer-x", `${((x + 1) * 50).toFixed(2)}%`);
  style.setProperty("--pointer-y", `${((y + 1) * 50).toFixed(2)}%`);
  style.setProperty("--foil-x", `${(50 + x * 36).toFixed(2)}%`);
  style.setProperty("--foil-y", `${(50 + y * 26).toFixed(2)}%`);
  style.setProperty("--foil-angle", `${(x * 35).toFixed(2)}deg`);
  style.setProperty("--glare-angle", `${(110 + x * 9).toFixed(2)}deg`);
  style.setProperty("--back-x", `${(35 + x * 15).toFixed(2)}%`);
  style.setProperty("--back-y", `${(28 + y * 12).toFixed(2)}%`);
}

function animate(time) {
  const effects = state.config?.effects || {};
  const spring = reduceMotion ? 0.28 : effects.spring ?? 0.12;
  const damping = reduceMotion ? 0.68 : effects.damping ?? 0.82;
  state.vx = (state.vx + (state.targetX - state.x) * spring) * damping;
  state.vy = (state.vy + (state.targetY - state.y) * spring) * damping;
  state.x += state.vx;
  state.y += state.vy;
  setMotionVariables(state.x, state.y);
  if (!document.hidden) state.relief?.render(state.x, state.y, time * 0.001);
  requestAnimationFrame(animate);
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

async function imageFrom(url) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  return image;
}

async function createRelief(config) {
  const gl = reliefCanvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL2 unavailable");

  const vertex = `#version 300 es
    in vec2 aPosition;
    out vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;
  const fragment = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform sampler2D uSubject;
    uniform sampler2D uHeight;
    uniform sampler2D uNormal;
    uniform vec2 uPointer;
    uniform float uRelief;
    uniform float uTime;

    void main() {
      vec2 direction = vec2(uPointer.x, -uPointer.y) * uRelief;
      vec2 uv = vUv;
      float best = 0.0;
      for (int i = 0; i < 16; i++) {
        float layer = float(i) / 15.0;
        vec2 candidate = vUv - direction * layer;
        float height = texture(uHeight, candidate).r;
        if (height >= layer) {
          uv = candidate;
          best = height;
        }
      }
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
      vec4 albedo = texture(uSubject, uv);
      if (albedo.a < 0.012) discard;

      vec3 normal = normalize(texture(uNormal, uv).rgb * 2.0 - 1.0);
      normal.xy += vec2(uPointer.x, -uPointer.y) * 0.17;
      normal = normalize(normal);
      vec3 lightDirection = normalize(vec3(uPointer.x * 0.9, -uPointer.y * 0.9, 1.15));
      float diffuse = max(dot(normal, lightDirection), 0.0);
      vec3 halfVector = normalize(lightDirection + vec3(0.0, 0.0, 1.0));
      float specular = pow(max(dot(normal, halfVector), 0.0), 30.0);
      float edgeLift = smoothstep(0.18, 0.9, best) * 0.12;
      float pulse = 0.5 + 0.5 * sin(uTime * 0.7 + uv.y * 8.0);
      vec3 lit = albedo.rgb * (0.66 + diffuse * 0.46 + edgeLift) + specular * (0.18 + pulse * 0.07);
      outColor = vec4(lit, albedo.a);
    }
  `;

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const location = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const images = await Promise.all([
    imageFrom(config.front.subject),
    imageFrom(config.front.heightMap),
    imageFrom(config.front.normalMap),
  ]);
  const uniforms = ["uSubject", "uHeight", "uNormal"].map((name) => gl.getUniformLocation(program, name));
  images.forEach((image, index) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(uniforms[index], index);
  });

  const pointerUniform = gl.getUniformLocation(program, "uPointer");
  const reliefUniform = gl.getUniformLocation(program, "uRelief");
  const timeUniform = gl.getUniformLocation(program, "uTime");
  gl.uniform1f(reliefUniform, config.effects.reliefStrength ?? 0.055);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  function resize() {
    const rect = reliefCanvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const scale = Math.min(1, Math.sqrt(1_300_000 / Math.max(1, rect.width * rect.height * dpr * dpr)));
    const width = Math.max(1, Math.round(rect.width * dpr * scale));
    const height = Math.max(1, Math.round(rect.height * dpr * scale));
    if (reliefCanvas.width !== width || reliefCanvas.height !== height) {
      reliefCanvas.width = width;
      reliefCanvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }
  new ResizeObserver(resize).observe(reliefCanvas);
  resize();

  return {
    render(x, y, time) {
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(pointerUniform, x, y);
      gl.uniform1f(timeUniform, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
  };
}

async function boot() {
  try {
    const response = await fetch("./card.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`card.json ${response.status}`);
    const config = await response.json();
    applyConfig(config);
    try {
      state.relief = await createRelief(config);
      stage.classList.add("relief-ready");
    } catch (error) {
      console.warn("Relief renderer disabled; using image fallback.", error);
    }
    app.setAttribute("aria-busy", "false");
    $("#status").textContent = "卡牌已就绪";
    requestAnimationFrame(animate);
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Service worker registration failed", error));
    }
  } catch (error) {
    $("#status").textContent = `卡牌加载失败：${error.message}`;
    console.error(error);
  }
}

boot();
