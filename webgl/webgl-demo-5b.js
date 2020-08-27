var cubeRotation = 0.0;
const fieldOfView = 48 * Math.PI / 180;   // in radians
const zNear = 0.1;
const zFar = 32.0;

main();

//
// Start here
//
function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = WebGLDebugUtils.makeDebugContext(canvas.getContext('webgl',{antialias:true}));

  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  // Vertex shader program

  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
	uniform float lightFactor;
	uniform float lightShift;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor * lightFactor + lightShift;
    }
  `;

  // Fragment shader program

  const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `;

  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aVertexColor and also
  // look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor')
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
	  lightFactor: gl.getUniformLocation(shaderProgram, 'lightFactor'),
	  lightShift: gl.getUniformLocation(shaderProgram, 'lightShift')
    },
	
  };

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers(gl);

  // Set this here because it doesn't change
  // Tell WebGL to use our program when drawing

  gl.useProgram(programInfo.program);

  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      buffers.projectionMatrix);
  
  window.addEventListener('resize', () => {
	  const width = canvas.clientWidth;
	  const height = canvas.clientHeight;
	  
	  if (canvas.width != width || canvas.height != height) {
		canvas.width = width;
		canvas.height = height;
			  
	  const aspect = canvas.width / canvas.height;
	  const projectionMatrix = buffers.projectionMatrix;

	  // note: glmatrix.js always has the first argument
	  // as the destination to receive the result.
	  mat4.perspective(projectionMatrix,
					   fieldOfView,
					   aspect,
					   zNear,
					   zFar);
	  gl.uniformMatrix4fv(
		  programInfo.uniformLocations.projectionMatrix,
		  false,
		  projectionMatrix);
	  // we could call render() here but no need because we render continuously
	  gl.viewport(0, 0, canvas.width, canvas.height);
	  }
  });
  var then = 0;

  // Draw the scene repeatedly
  function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    drawScene(gl, programInfo, buffers, deltaTime);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple three-dimensional cube.
//
function initBuffers(gl) {

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 32 units away from the camera.

  gl.canvas.width = gl.canvas.clientWidth;
  gl.canvas.height = gl.canvas.clientHeight;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  const aspect = gl.canvas.width / gl.canvas.height;
  const projectionMatrix = mat4.create();

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
                   fieldOfView,
                   aspect,
                   zNear,
                   zFar);

  // Create a buffer for the cube's vertex positions.

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the cube.

  const positions = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Now set up the colors for the vertices.

  const colors = [
    255, 255, 255,
    255,   0,   0,
      0, 255,   0,
      0,   0, 255,
    255, 255,   0,
    255,   0, 255,
	  0, 255, 255,
	128, 128, 128
  ];

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex arrays for each face's vertices.

  const faceIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, faceIndexBuffer);

  
  const faces = [
    [0, 1, 2, 3], // z=1
	[4, 5, 6, 7], // z=-1
	[7, 6, 2, 1], // x=1
	[4, 5, 3, 0], // x=-1
	[5, 3, 2, 6], // y=1
	[4, 0, 1, 7]  // y=-1
  ];
  
  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  const faceIndices = [];
  for (let face of faces) {
	  faceIndices.push(face[0],face[1],face[2],face[2],face[3],face[0]);
  }
  
  // Now send the element array to GL

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint8Array(faceIndices), gl.STATIC_DRAW);
	  
  const edgeIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeIndexBuffer);
  
  const edgeIndices = [];
  for (let face of faces) {
	  // push all four edges of each face, but with the lower index first
	  for (let i = 0; i < 4; ++i) {
		  const a = face[i];
		  const b = face[(i+1) % 4];
		  edgeIndices.push(Math.min(a, b), Math.max(a, b));
	  }
  }
  console.info("edgeIndices: " + edgeIndices);
  // remove the duplicate edges
  const edgeSet = new Set();
  for (let i = 0; i < edgeIndices.length; i += 2) {
	  edgeSet.add(edgeIndices[i] * 0x100 + edgeIndices[i+1]);
  }
  const uniqueEdgeIndices = [];
  for (let edge of edgeSet) {
	  uniqueEdgeIndices.push(Math.trunc(edge / 0x100), edge % 0x100);
  }
  console.info("uniqueEdgeIndices: " + uniqueEdgeIndices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint8Array(uniqueEdgeIndices), gl.STATIC_DRAW); 

  return {
    position: positionBuffer,
    color: colorBuffer,
    faceIndices: faceIndexBuffer,
	edgeIndices: edgeIndexBuffer,
	edgeIndexLength: uniqueEdgeIndices.length,
	projectionMatrix: projectionMatrix
  };
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers, deltaTime) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.depthFunc(gl.LESS);              // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create();

  // Now move the drawing position a bit to where we want to
  // start drawing the cube.

  mat4.translate(modelViewMatrix,     // destination matrix
                 modelViewMatrix,     // matrix to translate
                 [0.0, -0.0, -5.0]);  // amount to translate
  mat4.rotate(modelViewMatrix,  // destination matrix
              modelViewMatrix,  // matrix to rotate
              cubeRotation * 1.1,     // amount to rotate in radians
              [0, 0, 1]);       // axis to rotate around (Z)
  mat4.rotate(modelViewMatrix,  // destination matrix
              modelViewMatrix,  // matrix to rotate
              cubeRotation * 0.4,// amount to rotate in radians
              [0, 1, 0]);       // axis to rotate around (Y)
  mat4.rotate(modelViewMatrix,  // destination matrix
              modelViewMatrix,  // matrix to rotate
              cubeRotation * 0.1,// amount to rotate in radians
              [1, 0, 0]);       // axis to rotate around (X)


  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute
  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);
  }

  // Tell WebGL how to pull out the colors from the color buffer
  // into the vertexColor attribute.
  {
    const numComponents = 3;
    const type = gl.UNSIGNED_BYTE;
    const normalize = true;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexColor);
  }

  // Tell WebGL which indices to use to index the vertices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.faceIndices);

  // Set the shader uniforms

  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);
	  
  gl.uniform1f(programInfo.uniformLocations.lightFactor, 1);
  gl.uniform1f(programInfo.uniformLocations.lightShift, 0);

  gl.enable(gl.DEPTH_TEST);

  {
    const vertexCount = 6*6;
    const type = gl.UNSIGNED_BYTE;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }
  
  gl.disable(gl.DEPTH_TEST);

  // now use the edge indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.edgeIndices);
  
  // draw edges darker
  gl.uniform1f(programInfo.uniformLocations.lightFactor, -0.3);
  gl.uniform1f(programInfo.uniformLocations.lightShift, 0.6);

  {
    const vertexCount = buffers.edgeIndexLength;
    const type = gl.UNSIGNED_BYTE;
    const offset = 0;
    gl.drawElements(gl.LINES, vertexCount, type, offset);
  }

  // Update the rotation for the next draw

  cubeRotation += deltaTime;
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}
