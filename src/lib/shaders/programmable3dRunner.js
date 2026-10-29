// The runner is intentionally a plain document. It is loaded in a
// sandbox="allow-scripts" iframe, so creator JavaScript never shares the main
// application's DOM, cookies, storage, or JavaScript globals.
import { PROGRAMMABLE_ENTRY } from "./programmable3d.js";

export function createProgrammableRunnerDocument() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline'; img-src 'none'; connect-src 'none'; worker-src 'none'; child-src 'none'; object-src 'none'; form-action 'none';"><style>
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style></head><body><canvas id="canvas"></canvas><script>
(function () {
  "use strict";
  var ENTRY = ${JSON.stringify(PROGRAMMABLE_ENTRY)};
  var canvas = document.getElementById("canvas");
  var gl = null;
  var project = null;
  var camera = null;
  var scene = [];
  var programs = [];
  var app = null;
  var start = performance.now();
  var last = start;
  var frame = 0;
  var input = { x: 0, y: 0, down: false, clickX: 0, clickY: 0 };
  // Script modules: each project .js file is registered by name, then runs the
  // first time something requires it. The entry script's exports hold setup().
  var definitions = {};
  var moduleCache = {};
  var loadingFile = null;
  var brokenLoad = false;
  var loadToken = 0;

  function report(type, data) { window.parent.postMessage(Object.assign({ type: type, nonce: project && project.nonce }, data || {}), "*"); }
  function errorMessage(e) { return String((e && e.message) || e || "Unknown graphics error.").slice(0, 700); }
  function fileError(file, message) { var error = new Error(message); error.file = file; return error; }
  function fail(file, message) { report("programmable-3d:error", { file: file, message: errorMessage(message) }); }
  function endsWith(name, extension) { return String(name).slice(-extension.length) === extension; }
  function compile(type, source, file) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(shader) || "Shader failed to compile.";
      gl.deleteShader(shader);
      throw fileError(file, log);
    }
    return shader;
  }
  function link(vertexName, vertex, fragmentName, fragment) {
    var vs = compile(gl.VERTEX_SHADER, vertex, vertexName);
    var fs;
    try { fs = compile(gl.FRAGMENT_SHADER, fragment, fragmentName); } catch (e) { gl.deleteShader(vs); throw e; }
    var program = gl.createProgram();
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(program) || "Shader program failed to link.";
      gl.deleteProgram(program); throw fileError("program", log);
    }
    return program;
  }
  function v3(value, fallback) {
    var a = Array.isArray(value) ? value : fallback;
    return { x: Number(a[0]) || 0, y: Number(a[1]) || 0, z: Number(a[2]) || 0,
      set: function (x, y, z) { this.x = Number(x) || 0; this.y = Number(y) || 0; this.z = Number(z) || 0; } };
  }
  function vec(a) { return [a.x, a.y, a.z]; }
  function sub(a, b) { return { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z }; }
  function cross(a, b) { return { x: a.y*b.z-a.z*b.y, y: a.z*b.x-a.x*b.z, z: a.x*b.y-a.y*b.x }; }
  function dot(a, b) { return a.x*b.x+a.y*b.y+a.z*b.z; }
  function norm(a) { var l = Math.sqrt(dot(a,a)) || 1; return { x:a.x/l, y:a.y/l, z:a.z/l }; }
  function identity() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
  function multiply(a, b) {
    var out = new Array(16);
    for (var c=0;c<4;c++) for (var r=0;r<4;r++) out[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
    return out;
  }
  function perspective(fov, aspect, near, far) {
    var f = 1 / Math.tan(fov * Math.PI / 360), nf = 1 / (near - far);
    return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,(2*far*near)*nf,0];
  }
  function lookAt(eye, target) {
    var z = norm(sub(eye, target)), x = norm(cross({x:0,y:1,z:0}, z)), y = cross(z, x);
    return [x.x,y.x,z.x,0, x.y,y.y,z.y,0, x.z,y.z,z.z,0, -dot(x,eye),-dot(y,eye),-dot(z,eye),1];
  }
  function modelMatrix(object) {
    var p=object.position, r=object.rotation, s=object.scale;
    var cx=Math.cos(r.x), sx=Math.sin(r.x), cy=Math.cos(r.y), sy=Math.sin(r.y), cz=Math.cos(r.z), sz=Math.sin(r.z);
    var rx=[1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1];
    var ry=[cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1];
    var rz=[cz,sz,0,0, -sz,cz,0,0, 0,0,1,0, 0,0,0,1];
    var m=multiply(multiply(rz, multiply(ry,rx)), [s.x,0,0,0, 0,s.y,0,0, 0,0,s.z,0, p.x,p.y,p.z,1]);
    return m;
  }
  function geometry(name) {
    if (name === "triangle") return { positions:[0,1,0,-1,-1,0,1,-1,0], normals:[0,0,1,0,0,1,0,0,1], uvs:[.5,1,0,0,1,0], indices:[0,1,2] };
    if (name === "plane") return { positions:[-1,0,-1,1,0,-1,1,0,1,-1,0,1], normals:[0,1,0,0,1,0,0,1,0,0,1,0], uvs:[0,0,1,0,1,1,0,1], indices:[0,1,2,0,2,3] };
    var positions=[], normals=[], uvs=[], indices=[], faces=[
      [[0,0,1],[-1,-1,1,1,-1,1,1,1,1,-1,1,1]], [[0,0,-1],[1,-1,-1,-1,-1,-1,-1,1,-1,1,1,-1]],
      [[0,1,0],[-1,1,1,1,1,1,1,1,-1,-1,1,-1]], [[0,-1,0],[-1,-1,-1,1,-1,-1,1,-1,1,-1,-1,1]],
      [[1,0,0],[1,-1,1,1,-1,-1,1,1,-1,1,1,1]], [[-1,0,0],[-1,-1,-1,-1,-1,1,-1,1,1,-1,1,-1]]
    ];
    faces.forEach(function(face){ var base=positions.length/3; for(var i=0;i<4;i++){ positions.push(face[1][i*3]/1.0,face[1][i*3+1]/1.0,face[1][i*3+2]/1.0); normals.push(face[0][0],face[0][1],face[0][2]); uvs.push(i===0||i===3?0:1,i<2?0:1); } indices.push(base,base+1,base+2,base,base+2,base+3); });
    return { positions:positions, normals:normals, uvs:uvs, indices:indices };
  }
  function customGeometry(data) {
    if (!data || !Array.isArray(data.positions) || !Array.isArray(data.indices)) throw new Error("Custom geometry needs positions and indices arrays.");
    if (data.positions.length > 300000 || data.indices.length > 300000 || data.positions.length/3 > 65535) throw new Error("Custom geometry is too large for the WebGL index buffer.");
    var vertexCount=data.positions.length/3;
    if (vertexCount % 1 !== 0 || data.indices.some(function(index){return !Number.isInteger(index)||index<0||index>=vertexCount;})) throw new Error("Custom geometry has invalid indices.");
    return { positions:data.positions, normals:Array.isArray(data.normals)?data.normals:new Array(vertexCount*3).fill(0), uvs:Array.isArray(data.uvs)?data.uvs:new Array(vertexCount*2).fill(0), indices:data.indices };
  }
  function upload(g) {
    var result={};
    ["positions","normals","uvs","indices"].forEach(function(key){ var b=gl.createBuffer(); result[key]=b; gl.bindBuffer(key === "indices" ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER,b); gl.bufferData(key === "indices" ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER, key === "indices" ? new Uint16Array(g[key]) : new Float32Array(g[key]), gl.STATIC_DRAW); });
    result.count=g.indices.length; return result;
  }
  function location(program, name) { return gl.getUniformLocation(program, name); }
  function setUniform(program, name, value) {
    var u=location(program,name); if (u === null) return;
    if (typeof value === "number") gl.uniform1f(u,value);
    else if (Array.isArray(value)) { if(value.length===16) gl.uniformMatrix4fv(u,false,new Float32Array(value)); else if(value.length===4) gl.uniform4fv(u,new Float32Array(value)); else if(value.length===3) gl.uniform3fv(u,new Float32Array(value)); else if(value.length===2) gl.uniform2fv(u,new Float32Array(value)); else if(value.length===1) gl.uniform1f(u,value[0]); }
  }
  // Materials name their shaders as project files. Without a name, the first
  // .vert or .frag file in project order is used.
  function defaultShader(extension) {
    var names = Object.keys(project.files).filter(function (name) { return endsWith(name, extension); });
    return names[0] || null;
  }
  function shaderSource(name, extension, label) {
    var source = typeof name === "string" && endsWith(name, extension) ? project.files[name] : undefined;
    if (typeof source !== "string") throw new Error("Unknown " + label + " shader \\"" + name + "\\". Add a " + extension + " file to the project.");
    return source;
  }
  function material(options) {
    options=options||{};
    var vertex = options.vertex || defaultShader(".vert");
    var fragment = options.fragment || defaultShader(".frag");
    if (!vertex) throw new Error("This project has no vertex shader (.vert file).");
    if (!fragment) throw new Error("This project has no fragment shader (.frag file).");
    shaderSource(vertex, ".vert", "vertex");
    shaderSource(fragment, ".frag", "fragment");
    return { vertex: vertex, fragment: fragment, uniforms: Object.assign({}, options.uniforms || {}) };
  }
  function makeObject(options) {
    options=options||{}; var object={ geometry: options.geometry || geometry("cube"), material: options.material || material(), position:v3(options.position,[0,0,0]), rotation:v3(options.rotation,[0,0,0]), scale:v3(options.scale,[1,1,1]), visible:true, _gpu:null };
    object.position.set=object.position.set.bind(object.position); object.rotation.set=object.rotation.set.bind(object.rotation); object.scale.set=object.scale.set.bind(object.scale); return object;
  }
  function makeEngine() {
    camera={ position:v3([0,0,5],[0,0,5]), target:v3([0,0,0],[0,0,0]), fov:45, near:.1, far:100, lookAt:function(x,y,z){this.target.set(x,y,z);} };
    return { camera:camera,
      geometry:{cube:function(){return geometry("cube");}, plane:function(){return geometry("plane");}, triangle:function(){return geometry("triangle");}, from:customGeometry},
      material:material, scene:{ objects:scene, add:function(o){var object=makeObject(o); scene.push(object); return object;}, remove:function(o){var i=scene.indexOf(o); if(i>=0) scene.splice(i,1);}, clear:function(){scene.length=0;} },
      input:input
    };
  }
  function resize() { var dpr=Math.min(window.devicePixelRatio||1,2), w=Math.max(1,Math.round(canvas.clientWidth*dpr)), h=Math.max(1,Math.round(canvas.clientHeight*dpr)); if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;} if(gl) gl.viewport(0,0,canvas.width,canvas.height); }
  function bindAttributes(program, gpu) {
    [["a_position",gpu.positions,3],["a_normal",gpu.normals,3],["a_uv",gpu.uvs,2]].forEach(function(item){var loc=gl.getAttribLocation(program,item[0]); if(loc<0)return; gl.bindBuffer(gl.ARRAY_BUFFER,item[1]); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,item[2],gl.FLOAT,false,0,0);}); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gpu.indices);
  }
  // Linking a program is the slow GPU step (driver shader compile), so it is
  // done here, once per distinct shader pair, instead of on the first drawn frame.
  function programFor(vertexName, fragmentName) {
    var vertex=shaderSource(vertexName,".vert","vertex"), fragment=shaderSource(fragmentName,".frag","fragment");
    var key=vertex+"\\n"+fragment; var entry=programs.find(function(p){return p.key===key;});
    if(!entry){ if(programs.length>=16){ programs.forEach(function(p){gl.deleteProgram(p.program);}); programs=[]; } entry={key:key,program:link(vertexName,vertex,fragmentName,fragment)}; programs.push(entry); }
    return entry.program;
  }
  // Scripts are registered with a blob per file so a syntax error points at
  // the file that caused it. Each file runs only when it is required.
  function scriptBlob(name, source) {
    var wrapped = "__programmableDefine(" + JSON.stringify(name) + ", function (module, exports, require) {\\n" + source +
      "\\n;if (typeof setup === 'function') module.exports.setup = setup;\\n});";
    return URL.createObjectURL(new Blob([wrapped], { type: "text/javascript" }));
  }
  function moduleName(request) {
    var name = String(request).replace(/^\\.\\//, "");
    return /\\.js$/.test(name) ? name : name + ".js";
  }
  function requireModule(request) {
    var name = moduleName(request);
    if (!Object.prototype.hasOwnProperty.call(definitions, name)) {
      throw new Error("Cannot find \\"" + request + "\\". Add it to the project as a .js file.");
    }
    if (moduleCache[name]) return moduleCache[name].exports;
    var module = { exports: {} };
    moduleCache[name] = module;
    try { definitions[name](module, module.exports, requireModule); }
    catch (e) { delete moduleCache[name]; if (e && typeof e === "object" && !e.file) e.file = name; throw e; }
    return module.exports;
  }
  // Prepare everything the first frame needs, so "ready" means "can draw now".
  function warm() {
    try { scene.forEach(function(object){ var mat=object.material; programFor(mat.vertex,mat.fragment); if(!object._gpu)object._gpu=upload(object.geometry); }); return true; }
    catch(e) { fail(e.file || "program", e); app=null; return false; }
  }
  function renderFrame(time) {
    resize(); if(!gl||!app)return; var now=time/1000, delta=Math.min(.1,(time-last)/1000); last=time; frame++;
    try { if(app.update) app.update({time:now-(start/1000),delta:delta,frame:frame,input:input});
      gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      var view=lookAt(camera.position,camera.target), projection=perspective(camera.fov,canvas.width/Math.max(canvas.height,1),camera.near,camera.far);
      scene.forEach(function(object){if(!object.visible)return; var mat=object.material, program=programFor(mat.vertex,mat.fragment); if(!object._gpu)object._gpu=upload(object.geometry); gl.useProgram(program); bindAttributes(program,object._gpu); setUniform(program,"u_model",modelMatrix(object)); setUniform(program,"u_view",view); setUniform(program,"u_projection",projection); setUniform(program,"u_cameraPosition",vec(camera.position)); setUniform(program,"u_time",now-(start/1000)); setUniform(program,"u_resolution",[canvas.width,canvas.height,1]); Object.keys(mat.uniforms).forEach(function(name){setUniform(program,name,mat.uniforms[name]);}); gl.drawElements(gl.TRIANGLES,object._gpu.count,gl.UNSIGNED_SHORT,0); });
    } catch(e) { fail(e.file || "program", e); app=null; }
    if (app) report("programmable-3d:frame");
  }
  function render(time) { renderFrame(time); requestAnimationFrame(render); }
  function finishLoad(token) {
    if (token !== loadToken) return;
    try {
      var entry = requireModule(ENTRY);
      if (typeof entry.setup !== "function") throw fileError(ENTRY, "Define setup(engine) in " + ENTRY + ".");
      report("programmable-3d:progress",{stage:"scene"});
      var engine=makeEngine(); var result=entry.setup(engine); app=typeof result==="function"?{update:result}:result||{};
      report("programmable-3d:progress",{stage:"shaders"});
      if(warm()){ report("programmable-3d:ready"); renderFrame(performance.now()); }
    } catch(e) { fail(e.file || ENTRY, e); app=null; }
  }
  // Scripts load one at a time so each error can be attributed to its file.
  // A load from an older project snapshot stops as soon as a newer load starts.
  function loadScripts(token, names, index) {
    if (token !== loadToken || brokenLoad) return;
    if (index >= names.length) { finishLoad(token); return; }
    var name = names[index];
    var url = scriptBlob(name, project.files[name]);
    var script = document.createElement("script");
    loadingFile = name;
    script.onload = function () {
      URL.revokeObjectURL(url); script.remove();
      loadingFile = null;
      loadScripts(token, names, index + 1);
    };
    script.onerror = function () {
      URL.revokeObjectURL(url); loadingFile = null; brokenLoad = true;
      fail(name, "Script could not be loaded.");
    };
    script.src = url; document.head.appendChild(script);
  }
  // Syntax errors in a classic script reach window, not the script element.
  window.addEventListener("error", function (event) {
    if (loadingFile === null) return;
    var file = loadingFile; loadingFile = null; brokenLoad = true;
    fail(file, event.message || "Script failed to load.");
  });
  window.__programmableDefine = function (name, factory) { definitions[name] = factory; };
  function load(data) {
    var token=++loadToken;
    project=data; scene=[]; app=null; definitions={}; moduleCache={}; brokenLoad=false; loadingFile=null;
    start=performance.now(); last=start; frame=0;
    var files = data.files || {};
    if (!Object.prototype.hasOwnProperty.call(files, ENTRY)) { fail(ENTRY, ENTRY + " is required."); return; }
    var names = Object.keys(files).filter(function (name) { return endsWith(name, ".js"); });
    loadScripts(token, names, 0);
  }
  canvas.addEventListener("pointermove",function(e){var r=canvas.getBoundingClientRect();input.x=(e.clientX-r.left)/r.width;input.y=1-(e.clientY-r.top)/r.height;});
  canvas.addEventListener("pointerdown",function(e){input.down=true;input.clickX=input.x;input.clickY=input.y;}); canvas.addEventListener("pointerup",function(){input.down=false;});
  // Install the message listener before announcing that the runner is alive.
  // The parent can miss an iframe load event on cached navigations, so this
  // boot message gives it a reliable opportunity to send the project again.
  window.addEventListener("message",function(e){if(e.source!==window.parent||!e.data||e.data.type!=="programmable-3d:init")return; var next=Object.assign({},e.data.project,{nonce:e.data.nonce}); project=next; try{if(!gl)gl=canvas.getContext("webgl2",{alpha:false})||canvas.getContext("webgl",{alpha:false}); if(!gl)throw new Error("WebGL is not supported in this browser."); load(next); }catch(err){fail("runtime",err);}});
  window.addEventListener("resize",resize); if(typeof ResizeObserver === "function") new ResizeObserver(resize).observe(canvas);
  window.parent.postMessage({type:"programmable-3d:boot"},"*"); requestAnimationFrame(render);
}());
</script></body></html>`;
}
