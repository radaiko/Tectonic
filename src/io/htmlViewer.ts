/**
 * The CSS and JavaScript that {@link exportHtml} inlines into the page it
 * writes. Both are plain strings rather than modules because they run in the
 * exported file, not in this app — nothing here is imported by the viewport.
 *
 * The script is deliberately written in ES5-flavoured JavaScript with no
 * template literals and no backticks: it is embedded in a TypeScript template
 * literal on the way out, and it has to survive being read by whatever browser
 * the recipient happens to open the file in.
 */

export const VIEWER_STYLE = `:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; overflow: hidden; }
body {
  font: 13px/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #14171b;
  color: #dfe3e8;
}
#app { display: flex; height: 100%; }
#tree {
  width: 250px;
  flex: none;
  padding: 18px 16px;
  overflow-y: auto;
  background: #1f242b;
  border-right: 1px solid #2c333c;
}
#tree h1 { margin: 0; font-size: 15px; font-weight: 600; }
.subtitle { margin: 2px 0 14px; color: #8a95a3; font-size: 12px; }
.controls { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.controls button {
  padding: 6px 10px;
  font: inherit;
  color: inherit;
  background: #2a323b;
  border: 1px solid #39424e;
  border-radius: 5px;
  cursor: pointer;
}
.controls button:hover { background: #333d48; }
.controls label { display: flex; align-items: center; gap: 7px; cursor: pointer; }
#parts { list-style: none; margin: 0; padding: 0; }
#parts li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
}
#parts li:hover { background: #2a323b; }
#parts li.selected { background: #2f4a6b; }
#parts .swatch { width: 11px; height: 11px; flex: none; border-radius: 2px; border: 1px solid #0006; }
#parts .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#parts .count { color: #7d8894; font-size: 11px; }
.hint { margin-top: 18px; color: #6c7885; font-size: 11px; }
#view { flex: 1; display: block; width: 100%; height: 100%; touch-action: none; }
.error { padding: 24px; color: #ff8b7a; }
`

export const VIEWER_SCRIPT = `(function () {
  'use strict';

  var model = JSON.parse(document.getElementById('model').textContent);
  var canvas = document.getElementById('view');
  var gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) {
    document.getElementById('app').innerHTML =
      '<p class="error">This browser has no WebGL, so the model cannot be shown.</p>';
    return;
  }

  /* ---------------------------------------------------------------- decode */

  function bytes(text) {
    var binary = atob(text);
    var out = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  /* --------------------------------------------------------------- shaders */

  var VERTEX = [
    'attribute vec3 aPosition;',
    'attribute vec3 aNormal;',
    'uniform mat4 uProjection;',
    'uniform mat4 uView;',
    'varying vec3 vNormal;',
    'varying vec3 vEye;',
    'void main() {',
    '  vec4 p = uView * vec4(aPosition, 1.0);',
    '  vNormal = mat3(uView) * aNormal;',
    '  vEye = -p.xyz;',
    '  gl_Position = uProjection * p;',
    '}'
  ].join('\\n');

  var FRAGMENT = [
    'precision mediump float;',
    'uniform vec3 uColor;',
    'uniform float uOpacity;',
    'uniform float uLine;',
    'varying vec3 vNormal;',
    'varying vec3 vEye;',
    'void main() {',
    '  if (uLine > 0.5) { gl_FragColor = vec4(uColor, uOpacity); return; }',
    '  vec3 n = normalize(vNormal);',
    '  if (!gl_FrontFacing) n = -n;',
    '  vec3 l = normalize(vec3(0.35, 0.45, 1.0));',
    '  float diffuse = max(dot(n, l), 0.0);',
    '  float rim = pow(1.0 - max(dot(n, normalize(vEye)), 0.0), 3.0);',
    '  vec3 lit = uColor * (0.30 + 0.70 * diffuse) + vec3(0.16) * rim;',
    '  gl_FragColor = vec4(lit, uOpacity);',
    '}'
  ].join('\\n');

  function compile(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || 'shader failed to compile');
    }
    return shader;
  }

  var program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  gl.useProgram(program);

  var attributes = {
    position: gl.getAttribLocation(program, 'aPosition'),
    normal: gl.getAttribLocation(program, 'aNormal')
  };
  var uniforms = {
    projection: gl.getUniformLocation(program, 'uProjection'),
    view: gl.getUniformLocation(program, 'uView'),
    color: gl.getUniformLocation(program, 'uColor'),
    opacity: gl.getUniformLocation(program, 'uOpacity'),
    line: gl.getUniformLocation(program, 'uLine')
  };

  /* ---------------------------------------------------------------- upload */

  function buffer(target, data) {
    var handle = gl.createBuffer();
    gl.bindBuffer(target, handle);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return handle;
  }

  /* Unique triangle edges, so the wireframe does not draw shared edges twice. */
  function edgesOf(indices) {
    var seen = {};
    var edges = [];
    for (var t = 0; t + 2 < indices.length; t += 3) {
      for (var c = 0; c < 3; c++) {
        var a = indices[t + c];
        var b = indices[t + ((c + 1) % 3)];
        var key = a < b ? a + ':' + b : b + ':' + a;
        if (seen[key]) continue;
        seen[key] = 1;
        edges.push(a, b);
      }
    }
    return new Uint32Array(edges);
  }

  var uintIndices = gl.getExtension('OES_element_index_uint');
  var parts = model.parts.map(function (part, index) {
    var positions = new Float32Array(bytes(part.positions).buffer);
    var normals = new Float32Array(bytes(part.normals).buffer);
    var indices = new Uint32Array(bytes(part.indices).buffer);
    /* Without the 32-bit index extension a large part has to be narrowed; the
       vertex count is what decides whether that is lossless. */
    var wide = !!uintIndices && positions.length / 3 > 65536;
    var faceData = wide ? indices : new Uint16Array(indices);
    var edgeSource = edgesOf(indices);
    var edgeData = wide ? edgeSource : new Uint16Array(edgeSource);

    return {
      name: part.name,
      color: part.color,
      opacity: part.opacity,
      triangles: part.triangles,
      visible: true,
      selected: false,
      type: wide ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      position: buffer(gl.ARRAY_BUFFER, positions),
      normal: buffer(gl.ARRAY_BUFFER, normals),
      faces: buffer(gl.ELEMENT_ARRAY_BUFFER, faceData),
      faceCount: faceData.length,
      edges: buffer(gl.ELEMENT_ARRAY_BUFFER, edgeData),
      edgeCount: edgeData.length,
      index: index
    };
  });

  /* ---------------------------------------------------------------- matrix */

  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2);
    var d = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * d, -1, 0, 0, 2 * far * near * d, 0];
  }

  function normalize(v) {
    var m = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / m, v[1] / m, v[2] / m];
  }

  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  function lookAt(eye, center, up) {
    var f = normalize([center[0] - eye[0], center[1] - eye[1], center[2] - eye[2]]);
    var s = normalize(cross(f, up));
    var u = cross(s, f);
    return [
      s[0], u[0], -f[0], 0,
      s[1], u[1], -f[1], 0,
      s[2], u[2], -f[2], 0,
      -(s[0] * eye[0] + s[1] * eye[1] + s[2] * eye[2]),
      -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]),
      f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2],
      1
    ];
  }

  /* ---------------------------------------------------------------- camera */

  var min = model.bounds.min;
  var max = model.bounds.max;
  var centre = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  var radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2 || 1;

  var camera = {};
  function resetCamera() {
    camera.target = centre.slice();
    camera.theta = -Math.PI / 4;
    camera.phi = Math.PI / 6;
    camera.distance = radius * 3.2;
    draw();
  }

  function eyePosition() {
    var cp = Math.cos(camera.phi);
    return [
      camera.target[0] + camera.distance * cp * Math.cos(camera.theta),
      camera.target[1] + camera.distance * cp * Math.sin(camera.theta),
      camera.target[2] + camera.distance * Math.sin(camera.phi)
    ];
  }

  /* ------------------------------------------------------------------ draw */

  var wireframe = model.wireframe;
  var pending = false;

  function draw() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(render);
  }

  function bindPart(part) {
    gl.bindBuffer(gl.ARRAY_BUFFER, part.position);
    gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, part.normal);
    gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 0, 0);
  }

  function render() {
    pending = false;
    var ratio = window.devicePixelRatio || 1;
    var width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    var height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(background[0], background[1], background[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var near = Math.max(camera.distance / 1000, radius / 1000);
    gl.uniformMatrix4fv(
      uniforms.projection,
      false,
      perspective(Math.PI / 6, width / height, near, camera.distance + radius * 8)
    );
    gl.uniformMatrix4fv(uniforms.view, false, lookAt(eyePosition(), camera.target, [0, 0, 1]));
    gl.enableVertexAttribArray(attributes.position);
    gl.enableVertexAttribArray(attributes.normal);

    /* Opaque first, then the see-through parts back to front enough to look
       right for the handful of transparent bodies a CAD model tends to have. */
    var order = parts.filter(opaque).concat(parts.filter(notOpaque));
    for (var i = 0; i < order.length; i++) {
      var part = order[i];
      if (!part.visible) continue;
      var blend = part.opacity < 1;
      if (blend) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
      }
      bindPart(part);
      gl.uniform3fv(uniforms.color, part.selected ? highlight(part.color) : part.color);
      gl.uniform1f(uniforms.opacity, part.opacity);
      gl.uniform1f(uniforms.line, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, part.faces);
      gl.drawElements(gl.TRIANGLES, part.faceCount, part.type, 0);
      if (blend) {
        gl.disable(gl.BLEND);
        gl.depthMask(true);
      }
    }

    if (wireframe) {
      gl.disable(gl.CULL_FACE);
      for (var j = 0; j < parts.length; j++) {
        if (!parts[j].visible) continue;
        bindPart(parts[j]);
        gl.uniform3fv(uniforms.color, [0.06, 0.07, 0.09]);
        gl.uniform1f(uniforms.opacity, 1);
        gl.uniform1f(uniforms.line, 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, parts[j].edges);
        gl.drawElements(gl.LINES, parts[j].edgeCount, parts[j].type, 0);
      }
    }
  }

  function opaque(part) { return part.opacity >= 1; }
  function notOpaque(part) { return part.opacity < 1; }
  function highlight(color) {
    return [color[0] * 0.4 + 0.36, color[1] * 0.4 + 0.52, color[2] * 0.4 + 0.72];
  }

  function parseColor(css) {
    var hex = css.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    if (isNaN(n)) return [0.1, 0.11, 0.14];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  var background = parseColor(model.background);

  /* ------------------------------------------------------------------ input */

  var drag = null;
  canvas.addEventListener('pointerdown', function (event) {
    canvas.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, y: event.clientY, pan: event.shiftKey || event.button === 2 };
  });
  canvas.addEventListener('pointerup', function (event) {
    if (drag) canvas.releasePointerCapture(event.pointerId);
    drag = null;
  });
  canvas.addEventListener('pointermove', function (event) {
    if (!drag) return;
    var dx = event.clientX - drag.x;
    var dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;

    if (drag.pan) {
      /* Pan in the camera's own plane, scaled so a pixel moves the model by
         the same amount whatever the zoom level. */
      var eye = eyePosition();
      var forward = normalize([
        camera.target[0] - eye[0],
        camera.target[1] - eye[1],
        camera.target[2] - eye[2]
      ]);
      var right = normalize(cross(forward, [0, 0, 1]));
      var up = cross(right, forward);
      var speed = (camera.distance * 0.002);
      for (var axis = 0; axis < 3; axis++) {
        camera.target[axis] -= right[axis] * dx * speed;
        camera.target[axis] += up[axis] * dy * speed;
      }
    } else {
      camera.theta -= dx * 0.008;
      camera.phi = Math.max(-1.5, Math.min(1.5, camera.phi + dy * 0.008));
    }
    draw();
  });
  canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });
  canvas.addEventListener('wheel', function (event) {
    event.preventDefault();
    camera.distance = Math.max(radius * 0.05, camera.distance * Math.exp(event.deltaY * 0.001));
    draw();
  }, { passive: false });
  window.addEventListener('resize', draw);

  /* ------------------------------------------------------------- model tree */

  var list = document.getElementById('parts');
  parts.forEach(function (part) {
    var item = document.createElement('li');

    var toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = true;
    toggle.title = 'Show or hide';
    toggle.addEventListener('change', function () {
      part.visible = toggle.checked;
      draw();
    });
    toggle.addEventListener('click', function (event) { event.stopPropagation(); });

    var swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = 'rgb(' + part.color.map(function (channel) {
      return Math.round(channel * 255);
    }).join(',') + ')';

    var name = document.createElement('span');
    name.className = 'name';
    name.textContent = part.name;
    name.title = part.name;

    var count = document.createElement('span');
    count.className = 'count';
    count.textContent = part.triangles;

    item.appendChild(toggle);
    item.appendChild(swatch);
    item.appendChild(name);
    item.appendChild(count);
    item.addEventListener('click', function () {
      var wasSelected = part.selected;
      parts.forEach(function (other) { other.selected = false; });
      Array.prototype.forEach.call(list.children, function (row) {
        row.classList.remove('selected');
      });
      part.selected = !wasSelected;
      if (part.selected) item.classList.add('selected');
      draw();
    });
    list.appendChild(item);
  });

  document.querySelector('[data-action="reset"]').addEventListener('click', resetCamera);
  document.querySelector('[data-action="wireframe"]').addEventListener('change', function (event) {
    wireframe = event.target.checked;
    draw();
  });

  resetCamera();
})();
`
