// Library catalogue for the golden example. Same format as templates/library/library.js.
window.LIBRARY = {
  // Same as learn.json "libraryId". Saved answers are keyed by it, so never change it.
  id: "0d6c5b7e-golden-example",
  // Same as learn.json "reviewIntervalsDays": days between comeback reviews (feeds "Due for review").
  reviewIntervalsDays: [1, 3, 7, 21],
  subjects: [
    {
      id: "math", title: "Math",
      topics: [
        {
          id: "linear-equations", title: "Linear equations",
          summary: "Find the missing number by undoing what happened to it, in reverse.",
          lastStudied: "2026-10-16",
          tags: ["algebra", "equations", "solve for x", "unknown", "balance", "équation"],
          lessons: [
            { n: 1, title: "How do you find a missing number?", file: "01-lesson-find-the-missing-number.html",
              summary: "A taxi receipt, worked backwards: take the fee off, then divide.", tags: ["variable", "equation", "solving"] }
          ],
          keypoints: [
            "An equation is a balance: do the same thing to both sides and it stays true.",
            "Undo in reverse order: the last thing done comes off first.",
            "x on both sides? Take the smaller x part off both sides, then solve as usual.",
            "Always check: put the answer back in."
          ]
        }
      ]
    }
  ]
};
