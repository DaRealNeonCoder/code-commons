/* 









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


license-renewal-tracker. tipwise

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
