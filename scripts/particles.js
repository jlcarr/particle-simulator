// A script for simulating particles with WebGL

// Define globals
let gl = null;
let glCanvas = null;
let shaderProgram;

window.addEventListener("load", main, false);

/*
texture: current_state
program: draw current state to bottom rect

program: draw particles from state
*/

/**** Shader Programs ****/
// State Compute
let stateComputeVShader = `
	attribute vec4 position;

	attribute vec2 texcoord;
	varying vec2 texcoord_passthru;

	void main() {
		gl_Position = position;
		texcoord_passthru = texcoord;
	}
`;
let stateComputeFShader = `
	precision mediump float;

	uniform vec2 texture_size;

	varying vec2 texcoord_passthru;
	uniform sampler2D texture_ptr;

	void main() {
		//gl_FragColor = texture2D(texture_ptr, texcoord_passthru);
		if (gl_FragCoord.x > 1.0 && gl_FragCoord.x < 1.0+3.0) gl_FragColor = texture2D(texture_ptr, texcoord_passthru);
		else gl_FragColor = vec4(1,0,0,1);
	}
`;

// Draw
let drawVShader = `
	attribute vec2 position;

	// State selection
	uniform int n_particles;
	attribute float particle_index;
	uniform sampler2D state_ptr;

	void main(void) {
		gl_Position = vec4(position, 0.0, 1.0);
		gl_PointSize = 20.0- particle_index;
	}
`;
let drawFShader = `
	precision mediump float;

	void main(void) {
		vec2 fragmentPosition = 2.0*gl_PointCoord - 1.0;
		float distanceSq = dot(fragmentPosition, fragmentPosition);
		float alpha = 1.0;
		if (distanceSq > 1.0) alpha = 0.0; // || distanceSq < 0.64
		gl_FragColor = vec4(0, 0, 0, alpha);
	}
`;

// State Report
let stateReportVShader = `
	attribute vec4 position;

	attribute vec2 texcoord;
	varying vec2 texcoord_passthru;

	void main() {
		gl_Position = position;
		texcoord_passthru = texcoord;
	}
`;
let stateReportFShader = `
	precision mediump float;

	// Passed in from the vertex shader.
	varying vec2 texcoord_passthru;
	uniform sampler2D texture_ptr;

	void main() {
		gl_FragColor = texture2D(texture_ptr, texcoord_passthru);
	}
`;


function main() {
	/**** Initial WebGL Setup ****/
	glCanvas = document.getElementById("glcanvas");
	gl = glCanvas.getContext("webgl");
	// Set the view port
	gl.viewport(0,0, glCanvas.width, glCanvas.height);
	// Other settings
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
	
	
	/**** Initial JS Setup ****/
	// Setup data
	var n_dim = 2;
	var n_particles = 5;
	var n_tris = 2;


	/**** Initial Program Setup ****/
	// Report Program: compilation
	stateReportProgram = buildShaderProgram(stateReportVShader, stateReportFShader);
	gl.useProgram(stateReportProgram);
	// Report Program: uniform indicies
	var reportTextureLocation = gl.getUniformLocation(stateReportProgram, "texture_ptr");
	// Report Program: attributes indicies
	var reportPositionLocation = gl.getAttribLocation(stateReportProgram, "position");
	var reportTexcoordLocation = gl.getAttribLocation(stateReportProgram, "texcoord");
	
	// Compute Program: compilation
	stateComputeProgram = buildShaderProgram(stateComputeVShader, stateComputeFShader);
	gl.useProgram(stateComputeProgram);
	// State Program: uniform indicies
	var computeTextureLocation = gl.getUniformLocation(stateComputeProgram, "texture_ptr");
	var computeResolutionLocation = gl.getUniformLocation(stateComputeProgram, "texture_size");
	// State Program: attributes indicies
	var computePositionLocation = gl.getAttribLocation(stateComputeProgram, "position");
	var computeTexcoordLocation = gl.getAttribLocation(stateComputeProgram, "texcoord");
	
	// Draw Program: compilation
	drawProgram = buildShaderProgram(drawVShader, drawFShader);
	gl.useProgram(drawProgram);
	// Draw Program: uniform indicies
	var drawNLocation = gl.getUniformLocation(drawProgram, "n_particles");
	var drawTextureLocation = gl.getUniformLocation(drawProgram, "state_ptr");
	// Draw Program: attributes indicies
	var drawPositionLocation = gl.getAttribLocation(drawProgram, "position");
	var drawIndexLocation = gl.getAttribLocation(drawProgram, "particle_index");

	
	/**** Initial Shared Setup ****/
	// Shared: buffer allocations and indicies
	var statePositionBuffer = gl.createBuffer();
	var reportPositionBuffer = gl.createBuffer();
	var texcoordBuffer = gl.createBuffer();
	var drawPositionBuffer = gl.createBuffer();
	var drawIndexBuffer = gl.createBuffer();
	// Shared: texture allocations and indicies
	var prevStateTexture = gl.createTexture();
	const nextStateTexture = gl.createTexture();
	// Shared: framebuffer allocations and indicies
	const fb = gl.createFramebuffer();
	

	/**** Initialize Buffers ****/
	// Create a buffer for compute rect positions
	var stateCoords = new Float32Array([
		-1, -1,
		1, -1,
		-1, 1,
		-1, 1,
		1, -1,
		1, 1,
	]);
	gl.bindBuffer(gl.ARRAY_BUFFER, statePositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, stateCoords, gl.STATIC_DRAW);
	
	// Create a buffer for positions for the report rect
	var reportCoords = new Float32Array([
		-1, -1,
		1, -1,
		-1, -0.8,
		-1, -0.8,
		1, -1,
		1, -0.8,
	]);
	gl.bindBuffer(gl.ARRAY_BUFFER, reportPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, reportCoords, gl.STATIC_DRAW);

	// Provide matching texture coordinates for the rectangle.
	var texCoords = new Float32Array([
		0, 0,
		1, 0,
		0, 1,
		0, 1,
		1, 0,
		1, 1,
	]);
	gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

	// Provide default coordinates for the particle (TO REMOVE)
	var drawPositions = new Float32Array([
		0.0, 0.0,
		-0.5, -0.5,
		-0.5, 0.5,
		0.5, 0.5,
		0.5, -0.5,
		-0.525, -0.525
	]);
	gl.bindBuffer(gl.ARRAY_BUFFER, drawPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, drawPositions, gl.STATIC_DRAW);
	
	// Provide matching texture coordinates for the rectangle.
	var drawIndicies = new Float32Array([...Array(n_particles).keys()]);
	gl.bindBuffer(gl.ARRAY_BUFFER, drawIndexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, drawIndicies, gl.STATIC_DRAW);
	
	// fill texture with pixels
	var texData = new Uint8Array([
		0, 0, 0,
		64, 64, 64,
		128, 128, 128,
		192, 192, 192,
		255, 255, 255,
	]);
	// Fill data into a texture
	gl.bindTexture(gl.TEXTURE_2D, prevStateTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, n_particles, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, texData);
	// set the filtering so we don't need mips and it's not filtered
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	// Create a texture to render to
	gl.bindTexture(gl.TEXTURE_2D, nextStateTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, n_particles, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	// Create and bind the framebuffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nextStateTexture, 0);


	/**** Define Rendering ****/
	function stateCompute(){
		// Use the stateCompute program
		gl.useProgram(stateComputeProgram);
		
		// render to our targetTexture by binding the framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.viewport(0, 0, n_particles, 1);  // Tell WebGL how to convert from clip space to pixels
		
		// Turn on the position attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, statePositionBuffer);
		gl.enableVertexAttribArray(computePositionLocation);
		gl.vertexAttribPointer(computePositionLocation, n_dim, gl.FLOAT, gl.FLOAT, false, 0, 0);
		
		// Turn on the texcoord attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
		gl.enableVertexAttribArray(computeTexcoordLocation);
		gl.vertexAttribPointer(computeTexcoordLocation, 2, gl.FLOAT, false, 0, 0);
		
		// Tell the shader to use texture unit 0 for u_texture
		gl.bindTexture(gl.TEXTURE_2D, prevStateTexture);
		gl.uniform1i(computeTextureLocation, 0);
		gl.uniform2f(computeResolutionLocation, n_particles, 0);
		
		// Clear the view
		gl.clearColor(1, 1, 1, 1);  // Clear the attachment(s).
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		// Draw the geometry.
		gl.drawArrays(gl.TRIANGLES, 0, 3*n_tris);
	}

	function stateReport(clear){
		// Use the stateReport program
		gl.useProgram(stateReportProgram);
		
		// render to the canvas
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		
		// Turn on the position attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, reportPositionBuffer);
		gl.enableVertexAttribArray(reportPositionLocation);
		gl.vertexAttribPointer(reportPositionLocation, n_dim, gl.FLOAT, gl.FLOAT, false, 0, 0);
		
		// Turn on the texcoord attribute
		gl.enableVertexAttribArray(reportTexcoordLocation);
		gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
		gl.vertexAttribPointer(reportTexcoordLocation, 2, gl.FLOAT, false, 0, 0);
		
		// Tell the shader to use texture unit 0 for u_texture
		gl.bindTexture(gl.TEXTURE_2D, nextStateTexture);
		gl.uniform1i(reportTextureLocation, 0);
		
		if (clear){ // Clear the view
			gl.clearColor(1, 1, 1, 1);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		}
		// Draw the geometry.
		gl.drawArrays(gl.TRIANGLES, 0, 3*n_tris);
	}
	
	function stateDraw(clear){
		// Use the stateReport program
		gl.useProgram(drawProgram);
		
		// render to the canvas
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		
		// Turn on the position attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, drawPositionBuffer);
		gl.enableVertexAttribArray(drawPositionLocation);
		gl.vertexAttribPointer(drawPositionLocation, n_dim, gl.FLOAT, gl.FLOAT, false, 0, 0);
		
		// Turn on the particle index attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, drawIndexBuffer);
		gl.enableVertexAttribArray(drawIndexLocation);
		gl.vertexAttribPointer(drawIndexLocation, 1, gl.FLOAT, false, 0, 0);
		
		
		// Tell the shader to use texture unit 0 for u_texture
		gl.bindTexture(gl.TEXTURE_2D, nextStateTexture);
		gl.uniform1i(drawTextureLocation, 0);
		gl.uniform1i(drawNLocation, n_particles);
		
		if (clear){ // Clear the view
			gl.clearColor(1, 1, 1, 1);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		}
		// Draw the geometry.
		gl.drawArrays(gl.POINTS, 0, n_particles);
	}
	

	/**** Define the Animation ****/
	var then = 0;
	var loopLength = 10;
	function drawFrame(time) {
		// Setup time delta
		time *= 0.001;
		var dt = time - then;
		then = time;
		var loopFraction = (time % loopLength)/parseFloat(loopLength);
		
		
		stateCompute();
		stateDraw(true);
		stateReport(false);
		
		//requestAnimationFrame(drawFrame);
	}
	requestAnimationFrame(drawFrame);
}





// Shader building tools from Mozilla
function buildShaderProgram(vertexSource, fragmentSource) {
	let program = gl.createProgram();
	
	// Compile the vertex shader
	let vShader = compileShader(vertexSource, gl.VERTEX_SHADER);
	if (vShader) gl.attachShader(program, vShader);
	// Compile the fragment shader
	let fShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);
	if (fShader) gl.attachShader(program, fShader);

	gl.linkProgram(program)

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.log("Error linking shader program:");
		console.log(gl.getProgramInfoLog(program));
	}

	return program;
}

function compileShader(source, type) {
	let shader = gl.createShader(type);

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.log(`Error compiling ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader:`);
		console.log(gl.getShaderInfoLog(shader));
	}
	return shader;
}

