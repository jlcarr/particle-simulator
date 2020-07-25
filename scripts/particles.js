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

RG[0,1]^2 -> clipspace[-1,1]^2
*/

/**** Shader Programs ****/
// Position State Compute
let positionComputeVShader = `
	attribute vec4 screenquad;

	attribute vec2 texcoord;
	varying vec2 texcoord_passthru;

	void main() {
		gl_Position = screenquad;
		texcoord_passthru = texcoord;
	}
`;
let positionComputeFShader = `
	precision mediump float;

	uniform float dt;

	// State texture
	uniform vec2 texture_size;
	varying vec2 texcoord_passthru;
	// Positions
	uniform sampler2D position_tex;
	// Velocities
	uniform sampler2D velocity_tex;

	void main() {
		vec4 position = texture2D(position_tex, texcoord_passthru);
		vec4 velocity = 2.*texture2D(velocity_tex, texcoord_passthru)-1.;
		vec2 updatedPosition = position.xy + dt*velocity.xy;
		//updatedPosition = mod(updatedPosition, 1.0); // toroidal bounds
		gl_FragColor = vec4(updatedPosition, position.zw);
	}
`;

// Collision Velocity Compute
let collisionComputeVShader = `
	attribute vec4 screenquad;

	attribute vec2 texcoord;
	varying vec2 texcoord_passthru;

	void main() {
		gl_Position = screenquad;
		texcoord_passthru = texcoord;
	}
`;
let collisionComputeFShader = `
	precision mediump float;

	uniform float dt;

	// State texture
	uniform vec2 texture_size;
	varying vec2 texcoord_passthru;
	// Positions
	uniform sampler2D position_tex;
	// Velocities
	uniform sampler2D velocity_tex;

	void main() {
		vec4 position = texture2D(position_tex, texcoord_passthru);
		vec4 velocity = 2.*texture2D(velocity_tex, texcoord_passthru)-1.;
		if (position.x > 1.) velocity.x = -abs(velocity.x);
		if (position.x < 0.) velocity.x = abs(velocity.x);
		if (position.y > 1.) velocity.y = -abs(velocity.y);
		if (position.y < 0.) velocity.y = abs(velocity.y);
		gl_FragColor = 0.5+0.5*velocity;
	}
`;

// Draw
let drawVShader = `
	// State selection
	uniform int n_particles;
	attribute float particle_index;
	uniform sampler2D state_ptr;

	vec4 stateSelect(sampler2D stateTexture, int stateSize, float selection){
		float stateSizef = float(stateSize);
		return 2.0*texture2D(stateTexture, vec2(selection/stateSizef,0)) - 1.0;
	}

	void main(void) {
		vec4 state = stateSelect(state_ptr, n_particles, particle_index);
		gl_Position = vec4(state.xy, 0.0, 1.0);
		gl_PointSize = 10.0 + 20.0*particle_index/float(n_particles-1); //- 2.0*particle_index;//
	}
`;
let drawFShader = `
	precision mediump float;

	void main(void) {
		vec2 fragmentPosition = 2.0*gl_PointCoord - 1.0;
		float distanceSq = dot(fragmentPosition, fragmentPosition);
		float alpha = 1.0;
		vec3 color = vec3(0, 0, 0);
		if (distanceSq > 1.0) alpha = 0.0; // || distanceSq < 0.64
		if (distanceSq < 0.64) color = vec3(1, 1, 1);
		gl_FragColor = vec4(color, alpha);
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
		vec4 temp = texture2D(texture_ptr, texcoord_passthru); // the red-blue space is slightly nicer
		gl_FragColor = vec4(temp.x,temp.z,temp.y,temp.w);
	}
`;


function main() {
	/**** Initial WebGL Setup ****/
	glCanvas = document.getElementById("glcanvas");
	gl = glCanvas.getContext("webgl");
	// Set the view port
	gl.viewport(0,0, glCanvas.width, glCanvas.height);
	// Other settings
	gl.getExtension("OES_texture_float");
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.enable(gl.CULL_FACE);
    //gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	
	
	/**** Initial JS Setup ****/
	// Setup data
	var n_dim = 2;
	var n_particles = 10;
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
	
	// Position Compute Program: compilation
	positionComputeProgram = buildShaderProgram(positionComputeVShader, positionComputeFShader);
	gl.useProgram(positionComputeProgram);
	// Position Compute Program: uniform indicies
	var computeTLocation = gl.getUniformLocation(positionComputeProgram, "dt");
	var computeTextureLocation = gl.getUniformLocation(positionComputeProgram, "position_tex");
	var computeVelocityLocation = gl.getUniformLocation(positionComputeProgram, "velocity_tex");
	var computeResolutionLocation = gl.getUniformLocation(positionComputeProgram, "texture_size");
	// Position Compute Program: attributes indicies
	var computeScreenLocation = gl.getAttribLocation(positionComputeProgram, "screenquad");
	var computeTexcoordLocation = gl.getAttribLocation(positionComputeProgram, "texcoord");
	
	// Collision Compute Program: compilation
	collisionComputeProgram = buildShaderProgram(collisionComputeVShader, collisionComputeFShader);
	gl.useProgram(positionComputeProgram);
	//  Collision Compute Program: uniform indicies
	var collisionTLocation = gl.getUniformLocation(collisionComputeProgram, "dt");
	var collisionTextureLocation = gl.getUniformLocation(collisionComputeProgram, "position_tex");
	var collisionVelocityLocation = gl.getUniformLocation(collisionComputeProgram, "velocity_tex");
	var collisionResolutionLocation = gl.getUniformLocation(collisionComputeProgram, "texture_size");
	//  Collision Compute Program: attributes indicies
	var collisionScreenLocation = gl.getAttribLocation(collisionComputeProgram, "screenquad");
	var collisionTexcoordLocation = gl.getAttribLocation(collisionComputeProgram, "texcoord");
	
	// Draw Program: compilation
	drawProgram = buildShaderProgram(drawVShader, drawFShader);
	gl.useProgram(drawProgram);
	// Draw Program: uniform indicies
	var drawNLocation = gl.getUniformLocation(drawProgram, "n_particles");
	var drawTextureLocation = gl.getUniformLocation(drawProgram, "state_ptr");
	// Draw Program: attributes indicies
	var drawIndexLocation = gl.getAttribLocation(drawProgram, "particle_index");

	
	/**** Initial Shared Setup ****/
	// Shared: buffer allocations and indicies
	var statePositionBuffer = gl.createBuffer();
	var reportPositionBuffer = gl.createBuffer();
	var texcoordBuffer = gl.createBuffer();
	var drawIndexBuffer = gl.createBuffer();
	// Shared: texture allocations and indicies
	var prevPositionTexture = gl.createTexture();
	var nextPositionTexture = gl.createTexture();
	var prevVelocityTexture = gl.createTexture();
	var nextVelocityTexture = gl.createTexture();
	// Shared: framebuffer allocations and indicies
	var nextPositionFB = gl.createFramebuffer();
	var prevPositionFB = gl.createFramebuffer();
	var nextVelocityFB = gl.createFramebuffer();
	var prevVelocityFB = gl.createFramebuffer();


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
	
	// Provide matching texture coordinates for the rectangle.
	var drawIndicies = new Float32Array([...Array(n_particles).keys()]);
	gl.bindBuffer(gl.ARRAY_BUFFER, drawIndexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, drawIndicies, gl.STATIC_DRAW);
	
	// fill texture with pixels
	//var positionTexData = [...Array(n_particles).keys()].map(pos => [pos/(n_particles-1.), pos/(n_particles-1.), 0]).flat();
	var positionTexData = [...Array(n_particles).keys()].map(pos => [0.25+0.5*Math.random(), 0.25+0.5*Math.random(), 0]).flat();
	positionTexData = new Float32Array(positionTexData);
	// Fill data into a texture
	gl.bindTexture(gl.TEXTURE_2D, prevPositionTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, n_particles, 1, 0, gl.RGB, gl.FLOAT, positionTexData);
	// set the filtering so we don't need mips and it's not filtered
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	// Create a texture to render to
	gl.bindTexture(gl.TEXTURE_2D, nextPositionTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, n_particles, 1, 0, gl.RGBA, gl.FLOAT, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	// Create a texture for velocity
	//var velocityTexData = [...Array(n_particles).keys()].map(vel => [0.5*vel/(n_particles-1.)+0.25, 0.75-0.5*vel/(n_particles-1.), 0]).flat();
	velocityTexData = [...Array(n_particles).keys()].map(vel => [0.25+0.5*Math.random(), 0.25+0.5*Math.random(), 0]).flat();
	velocityTexData = new Float32Array(velocityTexData);
	gl.bindTexture(gl.TEXTURE_2D, prevVelocityTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, n_particles, 1, 0, gl.RGB, gl.FLOAT, velocityTexData);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	// Create a texture for updated velocity
	gl.bindTexture(gl.TEXTURE_2D, nextVelocityTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, n_particles, 1, 0, gl.RGB, gl.FLOAT, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	// Create and bind the framebuffer for the next positions
	gl.bindFramebuffer(gl.FRAMEBUFFER, nextPositionFB);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nextPositionTexture, 0);
	
	// Create and bind the framebuffer for the prev positions (for swapping)
	gl.bindFramebuffer(gl.FRAMEBUFFER, prevPositionFB);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, prevPositionTexture, 0);
	
	// Create and bind the framebuffer for the next velocities
	gl.bindFramebuffer(gl.FRAMEBUFFER, nextVelocityFB);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nextVelocityTexture, 0);
	
	// Create and bind the framebuffer for the prev velocities (for swapping)
	gl.bindFramebuffer(gl.FRAMEBUFFER, prevVelocityFB);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, prevVelocityTexture, 0);


	/**** Define Rendering ****/
	function positionCompute(dt){
		// Use the positionCompute program
		gl.useProgram(positionComputeProgram);
		
		// render to our targetTexture by binding the framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, nextPositionFB);
		gl.viewport(0, 0, n_particles, 1);  // Tell WebGL how to convert from clip space to pixels
		
		// Turn on the position attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, statePositionBuffer);
		gl.enableVertexAttribArray(computeScreenLocation);
		gl.vertexAttribPointer(computeScreenLocation, n_dim, gl.FLOAT, gl.FLOAT, false, 0, 0);
		
		// Turn on the texcoord attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
		gl.enableVertexAttribArray(computeTexcoordLocation);
		gl.vertexAttribPointer(computeTexcoordLocation, 2, gl.FLOAT, false, 0, 0);
		
		// Tell the shader to use texture unit 0 for u_texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, prevPositionTexture);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, prevVelocityTexture);
		gl.activeTexture(gl.TEXTURE0);
		gl.uniform1i(computeTextureLocation, 0);
		gl.uniform1i(computeVelocityLocation, 1);
		gl.uniform2f(computeResolutionLocation, n_particles, 0);
		
		// Set Uniforms
		gl.uniform1f(computeTLocation, dt);
		
		// Clear the view
		gl.clearColor(1, 1, 1, 1);  // Clear the attachment(s).
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		// Draw the geometry.
		gl.drawArrays(gl.TRIANGLES, 0, 3*n_tris);
	}
	
	function collisionCompute(dt){
		// Use the positionCompute program
		gl.useProgram(collisionComputeProgram);
		
		// render to our targetTexture by binding the framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, nextVelocityFB);
		gl.viewport(0, 0, n_particles, 1);  // Tell WebGL how to convert from clip space to pixels
		
		// Turn on the position attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, statePositionBuffer);
		gl.enableVertexAttribArray(collisionScreenLocation);
		gl.vertexAttribPointer(collisionScreenLocation, n_dim, gl.FLOAT, gl.FLOAT, false, 0, 0);
		
		// Turn on the texcoord attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
		gl.enableVertexAttribArray(collisionTexcoordLocation);
		gl.vertexAttribPointer(collisionTexcoordLocation, 2, gl.FLOAT, false, 0, 0);
		
		// Tell the shader to use texture unit 0 for u_texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, prevPositionTexture);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, prevVelocityTexture);
		gl.activeTexture(gl.TEXTURE0);
		gl.uniform1i(collisionTextureLocation, 0);
		gl.uniform1i(collisionVelocityLocation, 1);
		gl.uniform2f(collisionResolutionLocation, n_particles, 0);
		
		// Set Uniforms
		gl.uniform1f(collisionTLocation, dt);
		
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
		gl.bindTexture(gl.TEXTURE_2D, nextPositionTexture);
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
		
		// Turn on the particle index attribute
		gl.bindBuffer(gl.ARRAY_BUFFER, drawIndexBuffer);
		gl.enableVertexAttribArray(drawIndexLocation);
		gl.vertexAttribPointer(drawIndexLocation, 1, gl.FLOAT, false, 0, 0);
		
		// Tell the shader to use texture unit 0 for u_texture
		gl.bindTexture(gl.TEXTURE_2D, nextPositionTexture);
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
		
		collisionCompute(dt);
		positionCompute(dt);
		stateReport(true);
		stateDraw(false);
		
		// Swap buffers
		// Position
		var tempFB = prevPositionFB;
		prevPositionFB = nextPositionFB;
		nextPositionFB = tempFB;
		var tempStateTexture = prevPositionTexture;
		prevPositionTexture = nextPositionTexture;
		nextPositionTexture = tempStateTexture;
		
		// Velocity
		var tempFB = prevVelocityFB;
		prevVelocityFB = nextVelocityFB;
		nextVelocityFB = tempFB;
		var tempStateTexture = prevVelocityTexture;
		prevVelocityTexture = nextVelocityTexture;
		nextVelocityTexture = tempStateTexture;
		
		requestAnimationFrame(drawFrame);
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

