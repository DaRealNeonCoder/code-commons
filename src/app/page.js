/* 




ADVANCED PYTHON
Create an entirely new Advanced Python Programming course that builds on the existing Intro to Python course.

The introductory course covers Hello World, variables and types, operators, strings and input, conditionals, loops, lists, tuples and sets, dictionaries, and functions. Avoid repeating these topics except for brief refreshers when necessary.

Design a structured, hands-on learning path that progresses from intermediate Python to advanced programming techniques. Consider topics such as:

Python internals: mutability, references, object identity, memory management, and how Python executes code.

Advanced functions: closures, decorators, generators, iterators, and context managers.

Object-oriented programming: classes, inheritance, composition, polymorphism, and data classes.

Pythonic design: comprehensions, unpacking, type hints, protocols, and writing clean, maintainable code.

Error handling: custom exceptions, debugging, and robust program design.

Modules and packaging: imports, project structure, virtual environments, dependencies, and creating reusable packages.

Testing: unit tests, mocking, test-driven development, and property-based testing.

Concurrency and parallelism: threading, multiprocessing, asynchronous programming with asyncio, and when to use each.

Performance: profiling, algorithmic complexity, memory efficiency, and optimization.

Practical projects: APIs, file processing, databases, command-line tools, and larger multi-module applications.

First, assess the prerequisites and design a logical progression from core concepts to advanced techniques. Then create the lessons, coding puzzles, and interactive demos that best teach these concepts.

Keep the course practical and code-first. Use progressively challenging exercises and projects that help learners understand not just how features work, but when and why to use them. Avoid unnecessary duplication and prioritize skills useful for building real-world Python applications.
 




NEW COURSE

Create a new Data Structures & Algorithms course for codeloop.

First, inspect the existing Intro to Python course and Search Algorithms course. Avoid duplicating existing lessons, and build on the knowledge learners already have.

Design a structured, hands-on course that teaches learners how to organize data, analyze efficiency, and solve computational problems. Cover topics such as:

Complexity analysis: Big O notation, time complexity, space complexity, and tradeoffs.

Linear data structures: arrays, dynamic arrays, linked lists, stacks, and queues.

Hashing: hash tables, collisions, and practical applications.

Trees and heaps: binary trees, binary search trees, priority queues, and heaps.

Algorithmic techniques: recursion, divide and conquer, greedy algorithms, and dynamic programming.

Sorting: common sorting algorithms and their tradeoffs, avoiding repetition of existing material. the existing sorting course can be seen as the "advanced sorting coruse" this can be the intro to sorting portion

Graph fundamentals: graph representations and common graph problems, coordinating with the existing Search Algorithms course.

Create the lessons, coding puzzles, and interactive visualizations needed to teach these topics effectively. Let learners manipulate data structures, step through operations, compare algorithm performance, and solve progressively harder problems.

Prioritize conceptual understanding, practical implementation in Python, and the ability to recognize which data structure or algorithm fits a problem. Keep the progression accessible to learners who know basic Python, without turning the course into an exhaustive algorithms reference.

Follow the project's existing course, lesson, puzzle, and demo conventions.





GAMENGINE

Expand codeloop's existing shader system into a **lightweight, programmable 3D graphics engine built on WebGL**.

The goal is to give creators enough control to build interactive graphics, animations, and 3D scenes for educational lessons and demos. Think of it as a convenient rendering framework around WebGL, not a full game engine.

First, inspect the existing implementation, including shader compilation, the render loop, editor, project persistence, autosave, publishing, and any existing sandboxing. Understand what can be reused before making architectural changes.

### Core architecture

**1. CPU-side JavaScript**

Allow creators to write JavaScript that runs on the CPU and controls the scene. Provide a small, documented API for tasks such as:

- Creating and managing objects in a scene.
- Defining geometry, using built-in primitives such as triangles, planes, and cubes where useful.
- Setting object positions, rotations, and scales.
- Creating and controlling a camera.
- Updating objects and uniforms over time through a per-frame update function.
- Passing vertex data, transforms, and other parameters to GPU shaders.

Creators should be able to write code that animates objects, changes materials, generates geometry, and controls what gets rendered without having to manage raw WebGL calls themselves.

**2. GPU shader pipeline**

Support separate vertex and fragment shader files, compiled individually and linked into WebGL programs. Provide a clear way to associate shader programs with rendered objects or materials.

The vertex shader should process vertices and transformations, while the fragment shader determines pixel colors. Support the uniforms and vertex attributes needed to connect CPU-side code with GPU-side rendering.

Preserve the existing fragment-only workflow by supplying a default vertex shader where appropriate.

**3. Minimal rendering framework**

Provide the essential infrastructure that makes the system practical to use:

- A scene and render loop.
- Basic geometry and object transforms.
- Camera and projection support.
- Multiple objects and draw calls.
- Materials and shader programs.
- Uniform and vertex-buffer management.
- Basic texture support if it fits naturally into the architecture.

Keep the API simple enough that a creator can produce a basic 3D scene without writing boilerplate WebGL setup code.

### Editor and project structure

Adapt the existing shader editor to support a project containing CPU-side JavaScript and multiple shader files. Make switching between files straightforward, and keep compilation errors understandable and associated with the relevant file or shader stage.

Update project persistence, autosave, loading, and publishing as necessary. Existing projects must continue to work.

Treat creator-written JavaScript as untrusted code. Follow the project's existing execution and security model, and do not expose unrestricted server-side capabilities or grant arbitrary access to the host application.

### Scope and design constraints

Do **not** build a complete game engine. Physics, collision detection, rigid bodies, navigation, audio, networking, and a full asset-management system are out of scope.

Prefer a small, coherent API over exposing raw WebGL everywhere. Hide repetitive rendering boilerplate, but let creators customize the actual CPU logic and GPU shaders. Avoid building a generalized architecture for hypothetical future features.

Inspect the existing implementation and choose the smallest viable design that supports this functionality. Implement it using the project's existing conventions rather than just proposing an architecture.

Finally, test the complete pipeline: run CPU-side code, pass data to the GPU, render multiple objects using custom vertex and fragment shaders, animate a scene, save and reopen a project, and verify that existing fragment-only projects still work. Document the API with a small working example that creators can use as a starting point.
Preserve the simple fragment-shader workflow

The expanded engine must not replace or complicate the existing fragment-shader experience. Both simple shader art and programmable 3D graphics must remain first-class workflows.

When a creator opens a new, basic shader project, they should be able to write a fragment shader that draws something as simple as a circle and immediately see the result. They must not need to write CPU-side JavaScript, create a scene, configure a camera, define geometry, or manually set up a rendering pipeline just to render a 2D shader.

Keep the existing fragment-shader workflow available as a simple mode, with the necessary rendering infrastructure and default vertex shader handled internally. Make the expanded CPU-side JavaScript and scene-rendering capabilities available when creators need them, rather than requiring everyone to use them.

Preserve compatibility with existing fragment-shader projects. Do not regress their editor experience, rendering behavior, persistence, or publishing as part of the expansion.

The guiding principle is: simple shaders should remain simple, while advanced projects can opt into the additional power of the graphics engine.














GAMENGINE COURSE
Create a new Computer Graphics & Shaders course for codeloop, built around its lightweight, programmable WebGL graphics engine.

Design a practical, visually driven learning path that takes learners from simple shader art to building and rendering interactive 3D scenes. Build on basic programming and introductory linear algebra without unnecessarily repeating existing lessons.

Structure the course as a gradual progression:

2D shader fundamentals: pixels, UV coordinates, resolution, color, time, shapes, gradients, and signed distance functions. Start with simple effects such as drawing a circle using only a fragment shader.

Procedural shader art: animation, transformations, patterns, noise, and combining shapes to create increasingly complex visuals.

The graphics pipeline: explain the CPU versus GPU, what the vertex and fragment shader stages do, and how data travels between them.

Geometry and vertex shaders: vertices, triangles, attributes, interpolation, and passing data between shader stages.

3D mathematics: coordinate spaces, transformations, matrices, model/view/projection transforms, cameras, and perspective.

Building 3D scenes: geometry, multiple objects, draw calls, materials, and controlling scenes using CPU-side JavaScript.

Textures and materials: texture coordinates, sampling, filtering, surface properties, and procedural materials.

Lighting: surface normals, diffuse and specular lighting, basic shading models, and introductory shadow techniques.

Procedural 3D graphics: ray marching, signed distance fields, constructive solid geometry, and combining mathematical shapes into scenes.

Ray tracing fundamentals: rays, intersections, reflections, and the basic principles behind realistic rendering, where practical within the available runtime.

First, inspect the graphics engine and its actual API. Align the curriculum with the capabilities it supports rather than inventing APIs or assuming features exist. Identify any small engine improvements that are genuinely necessary, and distinguish them from optional future extensions.

Create focused lessons, coding puzzles, and interactive demos throughout the course. Use objectively verifiable goals where possible, such as matching a mathematical shape, implementing a transformation, producing a specified lighting result, or satisfying a rendering requirement.

Include progressively challenging projects that combine concepts into complete visual results. Let learners experiment directly with shaders, inspect intermediate results, and understand how changing the math or CPU-side code affects the rendered image.

Important: preserve two equally valid workflows throughout the course:

Shader art: write a fragment shader and immediately render images and animations without needing CPU-side scene code or a 3D pipeline setup.

Programmable 3D graphics: use CPU-side JavaScript, geometry, cameras, and custom vertex/fragment shaders when the lesson requires them.

Introduce additional complexity only when it becomes useful. Do not force beginners creating simple shader art to learn the entire rendering engine first.

Keep the course focused on computer graphics fundamentals and practical experimentation. Avoid turning it into a complete game-development course or diving unnecessarily into research-level rendering techniques. Follow codeloop's existing conventions for courses, lessons, puzzles, and interactive demos.











HARDWARE COURSE

Create a new **Introduction to Computer Engineering** course for codeloop.

The course should introduce learners to the fundamental concepts behind digital computers, starting with how information is represented and how simple logic gates work. Build a strong foundation without trying to cover the entire process of building a computer in one course. More advanced topics, such as CPU architecture and instruction execution, can be covered in a separate follow-up course.

### Topics to cover

- **Number systems:** binary, decimal, hexadecimal, binary conversion, and representing integers.
- **Boolean logic:** Boolean operators, truth tables, Boolean expressions, and basic Boolean algebra.
- **Logic gates:** AND, OR, NOT, NAND, NOR, XOR, and XNOR, including how to combine them.
- **Combinational circuits:** building circuits from gates, simplifying logic, multiplexers, decoders, and encoders.
- **Binary arithmetic:** binary addition and subtraction, half adders, full adders, and how circuits perform arithmetic.
- **Sequential logic:** the difference between combinational and sequential circuits, clock signals, latches, flip-flops, and basic registers.
- **Digital information storage:** how bits can be stored, how registers work, and an introductory look at memory.
- **Putting concepts together:** progressively larger circuits that demonstrate how simple components combine into useful digital systems.

### Lessons, puzzles, and interactive demos

First, inspect codeloop's existing logic simulator, math puzzle system, and course conventions. Use the existing capabilities wherever possible instead of duplicating functionality.

Use both **logic puzzles** and **math puzzles** where appropriate:

- Logic puzzles for constructing circuits, satisfying truth tables, connecting gates, and designing circuits with specified behavior.
- Math puzzles for binary conversions, Boolean algebra, simplifying expressions, and solving binary arithmetic problems.

Create interactive demos that let learners manipulate inputs, observe outputs, inspect truth tables, and understand how signals propagate through circuits. Gradually increase the complexity of the challenges as new components are introduced.

Ensure that learners understand not only how to connect components, but also why the resulting circuit behaves as it does.

### Scope and progression

Keep this course beginner-friendly and focused on digital logic and foundational computer engineering. Assume no prior knowledge of electronics or computer architecture, and introduce the necessary mathematics as it becomes relevant.

End with learners able to design and understand small digital circuits, including arithmetic circuits and simple stateful components. Do not attempt to cover a complete CPU, assembly language, operating systems, or the full process of building a computer. Leave those topics for a dedicated follow-up course.

Before creating content, assess the existing tools and plan a coherent learning progression. Then create the lessons, puzzles, and demos needed to deliver it, following codeloop's established conventions and avoiding unnecessary duplication.

*/ 
 
"use client"; 
 
import Link from "next/link"; 
import { useEffect, useRef, useState } from "react"; 
 
export default function Home() { 
  const howItWorksRef = useRef(null); 
  const [howItWorksVisible, setHowItWorksVisible] = useState(false); 
 
  useEffect(() => { 
    const node = howItWorksRef.current; 
    if (!node) return; 
 
    const observer = new IntersectionObserver( 
      ([entry]) => { 
        if (entry.isIntersecting) { 
          setHowItWorksVisible(true); 
          observer.disconnect(); 
        } 
      }, 
      { threshold: 0.2 } 
    ); 
 
    observer.observe(node); 
    return () => observer.disconnect(); 
  }, []); 
 
  return ( 
    <div className="w-full h-full overflow-y-auto"> 
 
      {/* Hero */} 
      <section className="bg-zinc-950 px-4 py-14 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:items-center"> 
          <div> 
            <p className="font-mono text-sm text-teal-400"> 
              # interactive coding, right in your browser 
            </p> 
 
            <h1 className="mt-4 font-mono text-3xl font-medium leading-tight text-white sm:text-5xl">
              build real things, 
              <br /> 
              one line at a time. 
            </h1> 
 
            <p className="mt-5 max-w-md text-zinc-400"> 
              Work through short lessons, build things, and put what you&apos;ve 
              learned to the test with hands-on puzzles and projects. No installs, 
              no setup. 
            </p> 
 
            <p className="mt-3 font-mono text-sm text-zinc-500"> 
              100% free and open source, Always. 
            </p> 
 
           <div className="mt-8">
                <Link
                    href="/courses/intro-to-python"
                    className="inline-block rounded-md bg-amber-500 px-5 py-2.5 font-mono text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400"
                >
                    $ start learning
                </Link>
            </div>
          </div> 
 
          {/* code snippet + stationary mascot */} 
          <div className="flex flex-wrap items-center justify-center gap-6 lg:justify-start"> 
            <div className="w-full max-w-[15rem] shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl"> 
              <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-2.5"> 
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" /> 
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" /> 
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" /> 
                <span className="ml-2 font-mono text-xs text-zinc-500"> 
                  main.py 
                </span> 
              </div> 
 
              <div className="px-5 py-7 font-mono text-sm leading-relaxed"> 
                <p> 
                  <span className="text-amber-400">print</span> 
                  <span className="text-zinc-500">(</span> 
                  <span className="text-teal-300"> 
                    &quot;hello, world&quot; 
                  </span> 
                  <span className="text-zinc-500">)</span> 
                </p> 
 
                <p className="mt-3 text-green-400"> 
                  hello, world 
                  <span className="ml-0.5 animate-pulse">▊</span> 
                </p> 
              </div> 
            </div> 
 
            {/* stationary mascot */} 
            <img 
              src="/character.webp" 
              alt="Mascot character" 
              style={{ imageRendering: "pixelated" }} 
              className="w-32 shrink-0 sm:w-40 lg:w-48" 
            /> 
          </div> 
        </div> 
      </section> 
 
      {/* Divider + What you can do */} 
      <section className="mx-auto max-w-5xl px-4 sm:px-6">
 
        {/* Space before the divider */} 
        <div className="mt-32 border-t border-zinc-800 sm:mt-48" />
 
        {/* What you can do — hidden until scrolled into view */} 
        <div 
          ref={howItWorksRef} 
          className={`pt-6 pb-16 grid gap-8 sm:grid-cols-3 transition-all duration-700 ease-out ${ 
            howItWorksVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8" 
          }`} 
        > 
          <div> 
            <span className="font-mono text-sm font-semibold text-teal-400"> 
              01 
            </span> 
            <h2 className="mt-2 font-semibold">Explore &amp; learn</h2> 
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400"> 
              Pick something to learn, or explore shaders, circuits, lessons, 
              coding projects, and whatever else you&apos;re curious about. 
            </p> 
          </div> 
 
          <div> 
            <span className="font-mono text-sm font-semibold text-amber-400"> 
              02 
            </span> 
            <h2 className="mt-2 font-semibold">Test your knowledge</h2> 
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400"> 
              Put what you&apos;ve learned into practice with puzzles and 
              challenges that make you think in new ways. 
            </p> 
          </div> 
 
          <div> 
            <span className="font-mono text-sm font-semibold text-pink-400"> 
              03 
            </span> 
            <h2 className="mt-2 font-semibold">Make your own</h2> 
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400"> 
              Create your own puzzles, circuits, shaders, projects, and other 
              things to learn and share. 
            </p> 
          </div> 
        </div> 
      </section> 
 
    </div> 
  ); 
}
