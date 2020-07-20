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
