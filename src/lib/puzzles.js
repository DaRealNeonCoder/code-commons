// lib/puzzles.js
//
// Puzzle categories and the puzzles inside each one. Only
// algorithms/fibonacci is fully built out. The rest are placeholders —
// flip `available: true` and add `starterCode` / `prompt` when ready.

export const puzzleCategories = [
  {
    id: "algorithms",
    title: "Algorithms",
    tagline: "Classic problem solving, one function at a time.",
    available: true,
  },
  {
    id: "data-management",
    title: "Data Management",
    tagline: "Wrangle lists, dictionaries, and files.",
    available: false,
  },
  {
    id: "hacking",
    title: "Hacking",
    tagline: "Break ciphers, exploit bugs, capture the flag.",
    available: false,
  },
];

export const puzzlesByCategory = {
  algorithms: [
    {
      id: "fibonacci",
      title: "Fibonacci Sequence",
      difficulty: "Easy",
      available: true,
      prompt: [
        "Write a function fibonacci(n) that returns the nth number in the Fibonacci sequence (0-indexed, with fibonacci(0) == 0 and fibonacci(1) == 1).",
        "The starter code calls fibonacci(10) and prints the result — a correct solution prints 55.",
      ],
      starterCode: `def fibonacci(n):
    # TODO: return the nth Fibonacci number
    pass

print(fibonacci(10))
`,
    },
    {
      id: "two-sum",
      title: "Two Sum",
      difficulty: "Easy",
      available: false,
    },
    {
      id: "binary-search",
      title: "Binary Search",
      difficulty: "Medium",
      available: false,
    },
  ],
};

export function getCategoryById(id) {
  return puzzleCategories.find((category) => category.id === id) || null;
}

export function getPuzzle(categoryId, puzzleId) {
  const list = puzzlesByCategory[categoryId] || [];
  return list.find((puzzle) => puzzle.id === puzzleId) || null;
}