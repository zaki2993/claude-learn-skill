// Library catalogue. Read by main.html (the library home) and the sidebar on every page, search, and rust dots.
// Claude keeps this file up to date. It is a .js file (not .json) so it loads from file:// without a server.
window.LIBRARY = {
  // Same as learn.json "libraryId". Saved answers are keyed by it, so never change it.
  id: "{{LIBRARY_ID}}",
  // Same as learn.json "reviewIntervalsDays": days between comeback reviews (feeds "Due for review").
  reviewIntervalsDays: [1, 3, 7, 21],
  subjects: [
    // {
    //   id: "math", title: "Math",
    //   topics: [
    //     {
    //       id: "linear-equations", title: "Linear equations",
    //       summary: "Find the unknown that makes both sides equal.",
    //       lastStudied: "2026-10-13",
    //       tags: ["algebra", "equations", "solve for x"],
    //       lessons: [
    //         { n: 1, title: "What x really means", file: "01-lesson-what-x-means.html", summary: "...", tags: ["variable"] }
    //       ],
    //       keypoints: ["Do the same thing to both sides, and the balance stays equal."]
    //     }
    //   ]
    // }
  ]
};
