/* eslint-disable */
export interface MockQuestion {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  link: string
}

export const DSA_QUESTIONS: Record<string, MockQuestion[]> = {
  "Arrays": [
    {
      "id": "contains-duplicate",
      "title": "Contains Duplicate",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/contains-duplicate/"
    },
    {
      "id": "two-sum",
      "title": "Two Sum",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/two-sum/"
    },
    {
      "id": "top-k-frequent-elements",
      "title": "Top K Frequent Elements",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/top-k-frequent-elements/"
    },
    {
      "id": "product-of-array-except-self",
      "title": "Product of Array Except Self",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/product-of-array-except-self/"
    },
    {
      "id": "valid-sudoku",
      "title": "Valid Sudoku",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/valid-sudoku/"
    },
    {
      "id": "longest-consecutive-sequence",
      "title": "Longest Consecutive Sequence",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/longest-consecutive-sequence/"
    },
    {
      "id": "two-sum-ii-input-array-is-sorted",
      "title": "Two Sum II Input Array Is Sorted",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/"
    },
    {
      "id": "3sum",
      "title": "3Sum",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/3sum/"
    },
    {
      "id": "container-with-most-water",
      "title": "Container With Most Water",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/container-with-most-water/"
    },
    {
      "id": "trapping-rain-water",
      "title": "Trapping Rain Water",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/trapping-rain-water/"
    },
    {
      "id": "binary-search",
      "title": "Binary Search",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/binary-search/"
    },
    {
      "id": "search-a-2d-matrix",
      "title": "Search a 2D Matrix",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/search-a-2d-matrix/"
    },
    {
      "id": "koko-eating-bananas",
      "title": "Koko Eating Bananas",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/koko-eating-bananas/"
    },
    {
      "id": "find-minimum-in-rotated-sorted-array",
      "title": "Find Minimum In Rotated Sorted Array",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/"
    },
    {
      "id": "search-in-rotated-sorted-array",
      "title": "Search In Rotated Sorted Array",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/search-in-rotated-sorted-array/"
    },
    {
      "id": "time-based-key-value-store",
      "title": "Time Based Key Value Store",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/time-based-key-value-store/"
    },
    {
      "id": "median-of-two-sorted-arrays",
      "title": "Median of Two Sorted Arrays",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/median-of-two-sorted-arrays/"
    },
    {
      "id": "insert-interval",
      "title": "Insert Interval",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/insert-interval/"
    },
    {
      "id": "merge-intervals",
      "title": "Merge Intervals",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/merge-intervals/"
    },
    {
      "id": "non-overlapping-intervals",
      "title": "Non Overlapping Intervals",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/non-overlapping-intervals/"
    },
    {
      "id": "meeting-rooms",
      "title": "Meeting Rooms",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/meeting-rooms/"
    },
    {
      "id": "meeting-rooms-ii",
      "title": "Meeting Rooms II",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/meeting-rooms-ii/"
    },
    {
      "id": "minimum-interval-to-include-each-query",
      "title": "Minimum Interval to Include Each Query",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/minimum-interval-to-include-each-query/"
    }
  ],
  "Strings": [
    {
      "id": "valid-anagram",
      "title": "Valid Anagram",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/valid-anagram/"
    },
    {
      "id": "group-anagrams",
      "title": "Group Anagrams",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/group-anagrams/"
    },
    {
      "id": "encode-and-decode-strings",
      "title": "Encode and Decode Strings",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/encode-and-decode-strings/"
    },
    {
      "id": "valid-palindrome",
      "title": "Valid Palindrome",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/valid-palindrome/"
    },
    {
      "id": "longest-substring-without-repeating-characters",
      "title": "Longest Substring Without Repeating Characters",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/longest-substring-without-repeating-characters/"
    },
    {
      "id": "permutation-in-string",
      "title": "Permutation In String",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/permutation-in-string/"
    },
    {
      "id": "minimum-window-substring",
      "title": "Minimum Window Substring",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/minimum-window-substring/"
    },
    {
      "id": "valid-parentheses",
      "title": "Valid Parentheses",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/valid-parentheses/"
    }
  ],
  "Linked Lists": [
    {
      "id": "reverse-linked-list",
      "title": "Reverse Linked List",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/reverse-linked-list/"
    },
    {
      "id": "merge-two-sorted-lists",
      "title": "Merge Two Sorted Lists",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/merge-two-sorted-lists/"
    },
    {
      "id": "linked-list-cycle",
      "title": "Linked List Cycle",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/linked-list-cycle/"
    },
    {
      "id": "reorder-list",
      "title": "Reorder List",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/reorder-list/"
    },
    {
      "id": "remove-nth-node-from-end-of-list",
      "title": "Remove Nth Node From End of List",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/remove-nth-node-from-end-of-list/"
    },
    {
      "id": "copy-list-with-random-pointer",
      "title": "Copy List With Random Pointer",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/copy-list-with-random-pointer/"
    },
    {
      "id": "add-two-numbers",
      "title": "Add Two Numbers",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/add-two-numbers/"
    },
    {
      "id": "find-the-duplicate-number",
      "title": "Find The Duplicate Number",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/find-the-duplicate-number/"
    },
    {
      "id": "lru-cache",
      "title": "LRU Cache",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/lru-cache/"
    },
    {
      "id": "merge-k-sorted-lists",
      "title": "Merge K Sorted Lists",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/merge-k-sorted-lists/"
    },
    {
      "id": "reverse-nodes-in-k-group",
      "title": "Reverse Nodes In K Group",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/reverse-nodes-in-k-group/"
    }
  ],
  "Stack": [
    {
      "id": "min-stack",
      "title": "Min Stack",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/min-stack/"
    },
    {
      "id": "evaluate-reverse-polish-notation",
      "title": "Evaluate Reverse Polish Notation",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/evaluate-reverse-polish-notation/"
    },
    {
      "id": "daily-temperatures",
      "title": "Daily Temperatures",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/daily-temperatures/"
    },
    {
      "id": "car-fleet",
      "title": "Car Fleet",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/car-fleet/"
    },
    {
      "id": "largest-rectangle-in-histogram",
      "title": "Largest Rectangle In Histogram",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/largest-rectangle-in-histogram/"
    }
  ],
  "Queue": [
    {
      "id": "best-time-to-buy-and-sell-stock",
      "title": "Best Time to Buy And Sell Stock",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/"
    },
    {
      "id": "longest-repeating-character-replacement",
      "title": "Longest Repeating Character Replacement",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/longest-repeating-character-replacement/"
    },
    {
      "id": "sliding-window-maximum",
      "title": "Sliding Window Maximum",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/sliding-window-maximum/"
    }
  ],
  "Trees": [
    {
      "id": "invert-binary-tree",
      "title": "Invert Binary Tree",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/invert-binary-tree/"
    },
    {
      "id": "maximum-depth-of-binary-tree",
      "title": "Maximum Depth of Binary Tree",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/maximum-depth-of-binary-tree/"
    },
    {
      "id": "diameter-of-binary-tree",
      "title": "Diameter of Binary Tree",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/diameter-of-binary-tree/"
    },
    {
      "id": "balanced-binary-tree",
      "title": "Balanced Binary Tree",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/balanced-binary-tree/"
    },
    {
      "id": "same-tree",
      "title": "Same Tree",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/same-tree/"
    },
    {
      "id": "subtree-of-another-tree",
      "title": "Subtree of Another Tree",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/subtree-of-another-tree/"
    },
    {
      "id": "lowest-common-ancestor-of-a-binary-search-tree",
      "title": "Lowest Common Ancestor of a Binary Search Tree",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/"
    },
    {
      "id": "binary-tree-level-order-traversal",
      "title": "Binary Tree Level Order Traversal",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/binary-tree-level-order-traversal/"
    },
    {
      "id": "binary-tree-right-side-view",
      "title": "Binary Tree Right Side View",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/binary-tree-right-side-view/"
    },
    {
      "id": "count-good-nodes-in-binary-tree",
      "title": "Count Good Nodes In Binary Tree",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/count-good-nodes-in-binary-tree/"
    },
    {
      "id": "validate-binary-search-tree",
      "title": "Validate Binary Search Tree",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/validate-binary-search-tree/"
    },
    {
      "id": "kth-smallest-element-in-a-bst",
      "title": "Kth Smallest Element In a Bst",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/kth-smallest-element-in-a-bst/"
    },
    {
      "id": "construct-binary-tree-from-preorder-and-inorder-traversal",
      "title": "Construct Binary Tree From Preorder And Inorder Traversal",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/"
    },
    {
      "id": "binary-tree-maximum-path-sum",
      "title": "Binary Tree Maximum Path Sum",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/binary-tree-maximum-path-sum/"
    },
    {
      "id": "serialize-and-deserialize-binary-tree",
      "title": "Serialize And Deserialize Binary Tree",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/"
    },
    {
      "id": "implement-trie-prefix-tree",
      "title": "Implement Trie Prefix Tree",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/implement-trie-prefix-tree/"
    },
    {
      "id": "design-add-and-search-words-data-structure",
      "title": "Design Add And Search Words Data Structure",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/design-add-and-search-words-data-structure/"
    },
    {
      "id": "word-search-ii",
      "title": "Word Search II",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/word-search-ii/"
    }
  ],
  "Graphs": [
    {
      "id": "number-of-islands",
      "title": "Number of Islands",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/number-of-islands/"
    },
    {
      "id": "max-area-of-island",
      "title": "Max Area of Island",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/max-area-of-island/"
    },
    {
      "id": "clone-graph",
      "title": "Clone Graph",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/clone-graph/"
    },
    {
      "id": "walls-and-gates",
      "title": "Walls And Gates",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/walls-and-gates/"
    },
    {
      "id": "rotting-oranges",
      "title": "Rotting Oranges",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/rotting-oranges/"
    },
    {
      "id": "pacific-atlantic-water-flow",
      "title": "Pacific Atlantic Water Flow",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/pacific-atlantic-water-flow/"
    },
    {
      "id": "surrounded-regions",
      "title": "Surrounded Regions",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/surrounded-regions/"
    },
    {
      "id": "course-schedule",
      "title": "Course Schedule",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/course-schedule/"
    },
    {
      "id": "course-schedule-ii",
      "title": "Course Schedule II",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/course-schedule-ii/"
    },
    {
      "id": "graph-valid-tree",
      "title": "Graph Valid Tree",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/graph-valid-tree/"
    },
    {
      "id": "number-of-connected-components-in-an-undirected-graph",
      "title": "Number of Connected Components In An Undirected Graph",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/"
    },
    {
      "id": "redundant-connection",
      "title": "Redundant Connection",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/redundant-connection/"
    },
    {
      "id": "word-ladder",
      "title": "Word Ladder",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/word-ladder/"
    },
    {
      "id": "network-delay-time",
      "title": "Network Delay Time",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/network-delay-time/"
    },
    {
      "id": "reconstruct-itinerary",
      "title": "Reconstruct Itinerary",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/reconstruct-itinerary/"
    },
    {
      "id": "min-cost-to-connect-all-points",
      "title": "Min Cost to Connect All Points",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/min-cost-to-connect-all-points/"
    },
    {
      "id": "swim-in-rising-water",
      "title": "Swim In Rising Water",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/swim-in-rising-water/"
    },
    {
      "id": "alien-dictionary",
      "title": "Alien Dictionary",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/alien-dictionary/"
    },
    {
      "id": "cheapest-flights-within-k-stops",
      "title": "Cheapest Flights Within K Stops",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/cheapest-flights-within-k-stops/"
    }
  ],
  "Heap": [
    {
      "id": "kth-largest-element-in-a-stream",
      "title": "Kth Largest Element In a Stream",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/kth-largest-element-in-a-stream/"
    },
    {
      "id": "last-stone-weight",
      "title": "Last Stone Weight",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/last-stone-weight/"
    },
    {
      "id": "k-closest-points-to-origin",
      "title": "K Closest Points to Origin",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/k-closest-points-to-origin/"
    },
    {
      "id": "kth-largest-element-in-an-array",
      "title": "Kth Largest Element In An Array",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/kth-largest-element-in-an-array/"
    },
    {
      "id": "task-scheduler",
      "title": "Task Scheduler",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/task-scheduler/"
    },
    {
      "id": "design-twitter",
      "title": "Design Twitter",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/design-twitter/"
    },
    {
      "id": "find-median-from-data-stream",
      "title": "Find Median From Data Stream",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/find-median-from-data-stream/"
    }
  ],
  "Recursion": [
    {
      "id": "rotate-image",
      "title": "Rotate Image",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/rotate-image/"
    },
    {
      "id": "spiral-matrix",
      "title": "Spiral Matrix",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/spiral-matrix/"
    },
    {
      "id": "set-matrix-zeroes",
      "title": "Set Matrix Zeroes",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/set-matrix-zeroes/"
    },
    {
      "id": "happy-number",
      "title": "Happy Number",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/happy-number/"
    },
    {
      "id": "plus-one",
      "title": "Plus One",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/plus-one/"
    },
    {
      "id": "powx-n",
      "title": "Pow(x, n)",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/powx-n/"
    },
    {
      "id": "multiply-strings",
      "title": "Multiply Strings",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/multiply-strings/"
    },
    {
      "id": "detect-squares",
      "title": "Detect Squares",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/detect-squares/"
    },
    {
      "id": "single-number",
      "title": "Single Number",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/single-number/"
    },
    {
      "id": "number-of-1-bits",
      "title": "Number of 1 Bits",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/number-of-1-bits/"
    },
    {
      "id": "counting-bits",
      "title": "Counting Bits",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/counting-bits/"
    },
    {
      "id": "reverse-bits",
      "title": "Reverse Bits",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/reverse-bits/"
    },
    {
      "id": "missing-number",
      "title": "Missing Number",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/missing-number/"
    },
    {
      "id": "sum-of-two-integers",
      "title": "Sum of Two Integers",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/sum-of-two-integers/"
    },
    {
      "id": "reverse-integer",
      "title": "Reverse Integer",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/reverse-integer/"
    }
  ],
  "Backtracking": [
    {
      "id": "subsets",
      "title": "Subsets",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/subsets/"
    },
    {
      "id": "combination-sum",
      "title": "Combination Sum",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/combination-sum/"
    },
    {
      "id": "combination-sum-ii",
      "title": "Combination Sum II",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/combination-sum-ii/"
    },
    {
      "id": "permutations",
      "title": "Permutations",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/permutations/"
    },
    {
      "id": "subsets-ii",
      "title": "Subsets II",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/subsets-ii/"
    },
    {
      "id": "generate-parentheses",
      "title": "Generate Parentheses",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/generate-parentheses/"
    },
    {
      "id": "word-search",
      "title": "Word Search",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/word-search/"
    },
    {
      "id": "palindrome-partitioning",
      "title": "Palindrome Partitioning",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/palindrome-partitioning/"
    },
    {
      "id": "letter-combinations-of-a-phone-number",
      "title": "Letter Combinations of a Phone Number",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/letter-combinations-of-a-phone-number/"
    },
    {
      "id": "n-queens",
      "title": "N Queens",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/n-queens/"
    }
  ],
  "Greedy": [
    {
      "id": "maximum-subarray",
      "title": "Maximum Subarray",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/maximum-subarray/"
    },
    {
      "id": "jump-game",
      "title": "Jump Game",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/jump-game/"
    },
    {
      "id": "jump-game-ii",
      "title": "Jump Game II",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/jump-game-ii/"
    },
    {
      "id": "gas-station",
      "title": "Gas Station",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/gas-station/"
    },
    {
      "id": "hand-of-straights",
      "title": "Hand of Straights",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/hand-of-straights/"
    },
    {
      "id": "merge-triplets-to-form-target-triplet",
      "title": "Merge Triplets to Form Target Triplet",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/merge-triplets-to-form-target-triplet/"
    },
    {
      "id": "partition-labels",
      "title": "Partition Labels",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/partition-labels/"
    },
    {
      "id": "valid-parenthesis-string",
      "title": "Valid Parenthesis String",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/valid-parenthesis-string/"
    }
  ],
  "Dynamic Programming": [
    {
      "id": "climbing-stairs",
      "title": "Climbing Stairs",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/climbing-stairs/"
    },
    {
      "id": "min-cost-climbing-stairs",
      "title": "Min Cost Climbing Stairs",
      "difficulty": "Easy",
      "link": "https://leetcode.com/problems/min-cost-climbing-stairs/"
    },
    {
      "id": "house-robber",
      "title": "House Robber",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/house-robber/"
    },
    {
      "id": "house-robber-ii",
      "title": "House Robber II",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/house-robber-ii/"
    },
    {
      "id": "longest-palindromic-substring",
      "title": "Longest Palindromic Substring",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/longest-palindromic-substring/"
    },
    {
      "id": "palindromic-substrings",
      "title": "Palindromic Substrings",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/palindromic-substrings/"
    },
    {
      "id": "decode-ways",
      "title": "Decode Ways",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/decode-ways/"
    },
    {
      "id": "coin-change",
      "title": "Coin Change",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/coin-change/"
    },
    {
      "id": "maximum-product-subarray",
      "title": "Maximum Product Subarray",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/maximum-product-subarray/"
    },
    {
      "id": "word-break",
      "title": "Word Break",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/word-break/"
    },
    {
      "id": "longest-increasing-subsequence",
      "title": "Longest Increasing Subsequence",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/longest-increasing-subsequence/"
    },
    {
      "id": "partition-equal-subset-sum",
      "title": "Partition Equal Subset Sum",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/partition-equal-subset-sum/"
    },
    {
      "id": "unique-paths",
      "title": "Unique Paths",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/unique-paths/"
    },
    {
      "id": "longest-common-subsequence",
      "title": "Longest Common Subsequence",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/longest-common-subsequence/"
    },
    {
      "id": "best-time-to-buy-and-sell-stock-with-cooldown",
      "title": "Best Time to Buy And Sell Stock With Cooldown",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/"
    },
    {
      "id": "coin-change-ii",
      "title": "Coin Change II",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/coin-change-ii/"
    },
    {
      "id": "target-sum",
      "title": "Target Sum",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/target-sum/"
    },
    {
      "id": "interleaving-string",
      "title": "Interleaving String",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/interleaving-string/"
    },
    {
      "id": "longest-increasing-path-in-a-matrix",
      "title": "Longest Increasing Path In a Matrix",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/longest-increasing-path-in-a-matrix/"
    },
    {
      "id": "distinct-subsequences",
      "title": "Distinct Subsequences",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/distinct-subsequences/"
    },
    {
      "id": "edit-distance",
      "title": "Edit Distance",
      "difficulty": "Medium",
      "link": "https://leetcode.com/problems/edit-distance/"
    },
    {
      "id": "burst-balloons",
      "title": "Burst Balloons",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/burst-balloons/"
    },
    {
      "id": "regular-expression-matching",
      "title": "Regular Expression Matching",
      "difficulty": "Hard",
      "link": "https://leetcode.com/problems/regular-expression-matching/"
    }
  ]
};
