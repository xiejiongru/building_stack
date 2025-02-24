# 🎮 Block Stacker Game

Block Stacker Game is a 3D stacking game inspired by classic stacking challenges. In this game, players must time their moves as the currently oscillating block moves from side to side. When the spacebar is pressed, the block is released (its mass is switched from 0 to 1) and falls under gravity to stack on the previous block. The game uses Three.js for 3D rendering and Cannon-es for physics simulation, ensuring realistic falling, collision, and bouncing behavior. Additionally, random collision sounds are played when blocks impact each other, enhancing the overall experience.

## 📚 Table of Contents

- [🎮 Block Stacker Game](#-block-stacker-game)
  - [📚 Table of Contents](#-table-of-contents)
  - [✨ Features](#-features)
  - [🛠️ Installation](#️-installation)
  - [🕹️ Usage](#️-usage)
  - [🎛️ Controls](#️-controls)
  - [📖 Context \& Bibliography](#-context--bibliography)
  - [📜 License](#-license)

## ✨ Features

- **🌌 3D Rendering with a Gradient Sky Background**  
  The game features a beautiful gradient sky.

- **⚙️ Physics Simulation**  
  Cannon-es is used to simulate realistic gravity, friction, and collisions. Blocks behave naturally when they are dropped and stack upon each other.

- **🎯 Precision Gameplay**  
  Blocks move laterally (when their mass is 0), and when the spacebar is pressed, the block’s mass is set to 1, making it dynamic and affected by gravity. Timing your drop is key!

- **🔊 Audio Feedback**  
  When blocks collide, a random impact sound is played, giving auditory feedback to the player.

- **🎥 Dynamic Camera and Controls**  
  The game features OrbitControls, allowing players to rotate and zoom the camera. As the stack grows, the camera’s position is updated automatically.

## 🛠️ Installation

You can run the game locally by following these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/xiejiongru/building_stack.git
   ```

2. **Navigate to the project directory:**
   ```bash
   cd block-stacker
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Run the development server:**
   ```bash
   npm run serve
   ```
5. **Open your browser and go to http://localhost:8080 (or the URL provided in the terminal) to play the game.**



## 🕹️ Usage

When the page loads, click **"Start"** (or simply begin interacting) to enter the game. The block will begin oscillating horizontally at the top of the stack. When you press the **Space key**:

- The current block is released. Its mass is switched from `0` to `1`, making it dynamic so that it falls under the effect of gravity.
- If the block is misaligned beyond a certain threshold (e.g., an offset greater than 2 units), it will trigger the **game over sequence** after a short delay.
- Your **score** and **elapsed time** are displayed on-screen.


## 🎛️ Controls

- **Spacebar**: Drop the current moving block (switch from static to dynamic, so it falls).
- **R**: Reset the game.
- **C**: Reset the camera view.
- **Arrow Keys / Mouse Drag & Wheel**: Use OrbitControls to rotate and zoom the camera.



## 📖 Context & Bibliography

This project was developed as part of a 3D web development course and uses the following technologies and resources:

- **[Three.js](https://threejs.org/)**  
  A JavaScript library for creating 3D graphics on the web.

- **[Cannon-es](https://github.com/pmndrs/cannon-es)**  
  A lightweight physics engine for simulating rigid body dynamics.

Audio and visual assets are sourced from open-source resources and are used in compliance with their respective licenses.

The game draws inspiration from classic stacking games and has been adapted to provide an engaging 3D web experience.


## 📜 License

The source code for this project is released under the **GNU GPLv3** license. Some dependencies may have different licenses. See the [LICENSE](LICENSE) file for details.