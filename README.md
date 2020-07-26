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

### Dynamics Computations
#### Statement Of The Problem
https://en.wikipedia.org/wiki/N-body_simulation  
https://en.wikipedia.org/wiki/Newton%27s_law_of_universal_gravitation  
https://en.wikipedia.org/wiki/Coulomb%27s_law  
https://en.wikipedia.org/wiki/Gravitational_constant  
https://en.wikipedia.org/wiki/Coulomb_constant  
The equations of motion are simple:  
![\frac{\mathrm{d} \vec{x}_i}{\mathrm{d} t} = \vec{v}_i](https://render.githubusercontent.com/render/math?math=%5Cfrac%7B%5Cmathrm%7Bd%7D%20%5Cvec%7Bx%7D_i%7D%7B%5Cmathrm%7Bd%7D%20t%7D%20%3D%20%5Cvec%7Bv%7D_i)  
![\frac{\mathrm{d} \vec{v}_i}{\mathrm{d} t} = \sum_{j \neq i} \left (  \frac{k_e q_j q_i-G m_j m_i}{m_i \left \| \vec{x}_i - \vec{x}_j \right \| ^3} \right ) \left ( \vec{x}_i - \vec{x}_j \right )](https://render.githubusercontent.com/render/math?math=%5Cfrac%7B%5Cmathrm%7Bd%7D%20%5Cvec%7Bv%7D_i%7D%7B%5Cmathrm%7Bd%7D%20t%7D%20%3D%20%5Csum_%7Bj%20%5Cneq%20i%7D%20%5Cleft%20(%20%20%5Cfrac%7Bk_e%20q_j%20q_i-G%20m_j%20m_i%7D%7Bm_i%20%5Cleft%20%5C%7C%20%5Cvec%7Bx%7D_i%20-%20%5Cvec%7Bx%7D_j%20%5Cright%20%5C%7C%20%5E3%7D%20%5Cright%20)%20%5Cleft%20(%20%5Cvec%7Bx%7D_i%20-%20%5Cvec%7Bx%7D_j%20%5Cright%20))  
Where:  
- ![\vec{x}_i](https://render.githubusercontent.com/render/math?math=%5Cvec%7Bx%7D_i): is the positon vector of particle i
- ![\vec{v}_i](https://render.githubusercontent.com/render/math?math=%5Cvec%7Bv%7D_i): is the velocity vector of particle i
- ![m_i](https://render.githubusercontent.com/render/math?math=m_i): is the mass of particle i
- ![q_i](https://render.githubusercontent.com/render/math?math=q_i): is the electric charge of particle i
- ![G](https://render.githubusercontent.com/render/math?math=G): is the universal gravitational constant
- ![k_e](https://render.githubusercontent.com/render/math?math=k_e): is Coulomb's constant

### Numerical Solutions
https://en.wikipedia.org/wiki/Numerical_methods_for_ordinary_differential_equations  
https://en.wikipedia.org/wiki/Euler_method  
Since the equations of motion are a system of first order ordinary differential equations, they can be solved numerically in real time using numerical integration techniques  
The most basic method is the Euler method

### Position (Clip) Space Topology
https://en.wikipedia.org/wiki/Surface_(topology)  
There are several easy topologies of the position space on can encode  
- **Bounded (Box)**
   - bounds bounce particle back with a perfectly elastic collision (walls have infinite mass)
   - Implemented by setting the particle velocity to point inside the bound if out of bounds
   - ```if (position.x > 1.) velocity.x = -abs(velocity.x);```
- **Torus** 
   - bounds wrap around to the opposite side
   - Implemented using the modulo operation while position updating
   - ```updatedPosition = mod(updatedPosition, 1.0);```
- **Sphere** 
   - bounds wrap around to the opposide side of the line diagonally through the viewport

## GPGPU with WebGL 
https://en.wikipedia.org/wiki/General-purpose_computing_on_graphics_processing_units  
Given that WebGL is designed for 3d graphics rendering, one must jump through a few hoops to perform general purpose computations GPU computation with WebGL.  
### Approach
- The approach used is to use an intermediate "compute" program to write to a texture.
- To cover the output texture, the vertex shader should simply render a quad across the screen.
- Therefore the vertex shader essentially acts as a passthrough to the fragment shader.
- The fragment shader performs the computation.
- A fun way to think about the use of textures for encoding vectors of state is how the dynamics in clip space map to colorspace.
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

### Floating-Point Textures
https://developer.mozilla.org/en-US/docs/Web/API/OES_texture_float
In order to get the precision required for particle dynamics simulations floating point numbers are needed over unsigned integers.  
Rather than have the colorspace in [0,127] integers, it is preferable to have it in [0,1] rationals.  
The [0,1] colorspace is then converted to [-1,1] clipspace for computations.  
Thankfully WebGL has a standard floating point number extension that allows for this.  

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

## Todo
- Add background color that showing mapping between colorspace and clipspace
