# particle-simulator
A WebGL project to simulate classical physics particles.

## Approach:
Parameters:
- **N**: The number of particles
- **dim**: (=2) The dimensionality of the problem
- **pos**: (N * vec_dim) The positions of each particle
- **vel**: (N * vec_dim) The velocities of each particle

1. Define the initial values for the parameters of the simulation
2. Shader compute the relative values for pairs are particles
   1. Relative positions
   2. Gravitational forces
   3. Electromagentic forces
   3. Collisions
3. Compute the updates for each particle
   1. Velocity updates
   2. Position updates
   3. Wall collisions
4. Draw the particles from their data in texture

## GPGPU with WebGL 
https://en.wikipedia.org/wiki/General-purpose_computing_on_graphics_processing_units  
Given that WebGL is designed for 3d graphics rendering, one must jump through a few hoops to perform general purpose computations GPU computation with WebGL.  
### Approach
- The approach used is to use an intermediate "compute" program to write to a texture.
- To cover the output texture, the vertex shader should simply render a quad across the screen.
- Therefore the vertex shader essentially acts as a passthrough to the fragment shader.
- The fragment shader performs the computation.
### Parallelism vs. Output size
For a given WebGL program using he above approach the parallelism can be described as follows  
Parameters:
- **h**: The height of the output texture in the framebuffer.
- **w**: Thewidth of the output texture in the framebuffer.
- **c**: The number of color channels of the output texture
- **u**: The number of uniforms used (vectors, matrices and textures count for as many elements as they possess)
- **v**: The number of varyings used (vectors and matrices count for as many elements as they possess)

The number of inputs is given by: ![vhw+u](https://render.githubusercontent.com/render/math?math=vhw%2Bu)  
The number of outputs is given by:  ![hwc](https://render.githubusercontent.com/render/math?math=hwc)  
The number of parallel threads is given by: ![hw](https://render.githubusercontent.com/render/math?math=hw)  

## WebGL resources
### Complete Guides
https://webglfundamentals.org  
http://learnwebgl.brown37.net  
https://xem.github.io/articles/webgl-guide.html  
### Introductory Examples
https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Basic_2D_animation_example  
https://www.tutorialspoint.com/webgl/webgl_drawing_points.htm  
### Physics Examples
https://gpfault.net/posts/webgl2-particles.txt.html  
https://github.com/PavelDoGreat/WebGL-Fluid-Simulation/blob/master/script.js  
https://stackoverflow.com/questions/56780278/how-to-keep-coordination-between-particles-and-which-texture-pixel-contains-each  
https://stackoverflow.com/questions/15090657/texture-driven-particles-in-webgl-opengl-using-a-shader  
