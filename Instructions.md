OPTIONAL OPTIONAL OPTIONAL OPTIONAL OPTIONAL Assignment 4 - Brushing and Linking
===

The primary aim of this assignment is to showcase your **individual** skills at supporting interactive experiences with visualizations.

### Your Task

Your task is to craft a visualization with a dataset of your choosing, and to specifically support brushing and linking of some kind to support exploration through two or more views of the data.

By linked views, we mean:

- Have at least two separate visualizations (likely separate SVGs), that visualize data, possibly with different techniques.
- Linked views means that interacting in one updates the other, and vice versa. Think about the interaction flow that leads to good user experience and aligns with tasks you've identified.

Examples of linked views include:
- A large central map or scatterplot, with ancillary histograms that can be used to filter-- perhaps time or other dimensions


Incorporating a brief writeup with your visualization is a good idea.
Communicate what the original vision was, what the major issues were, and what new things can be seen with your multiple linked views.

### More on Linking Views
One of the most powerful techniques for mitigating the shortcomings of a given visualization is to link it with other views.

Linking a map to a bar or scatterplot, for instance, may allow you to overcome the shortcomings of a map.

In general, linking visualizations allows you to explore different parts of the data between views, and mitigates the shortcomings of a given view by pairing it with other views.

For this assignment, we want to see at least two linked views, in that interactions in one view updates the other, and vice versa. Many multiple views visualizations use more than two views, so consider such directions as possibilities for tech/design achievements. Be sure to think about what views work best for given tasks, and try to iterate/prototype if possible.

Requirements
---

0. Your code should be forked from the GitHub repo and linked using GitHub pages.
1. Your project should load a dataset you found on the web from the vis you're remixing. You may extract the data by sight if necessary. Put this file in your repo.
2. Your project should use d3 to build a visualization of the dataset. 
3. Your writeup (readme.md in the repo) should contain the following:

- Working link to the visualization hosted on gh-pages or other external sources.
- Concise description and screenshot of your visualization.
- Description of the technical achievements you attempted with this visualization.
- Description of the design achievements you attempted with this visualization.

4. Submit a pull request and name it as follow
```
a4-your Gh username-your first name-your lastname

```

Extra Links
---

- https://observablehq.com/@philippkoytek/d3-part-3-brushing-and-linking
- https://github.com/d3/d3-brush
- https://observablehq.com/collection/@d3/d3-brush
- https://observablehq.com/@d3/focus-context?collection=@d3/d3-brush
