(() => {
  // Native background size
  const NATIVE_W = 2048, NATIVE_H = 1536;

  const wraps = document.querySelectorAll('main');
  const ro = new ResizeObserver(entries => {
    for (const { target: wrap } of entries) {
      const container = wrap.querySelector('#container');
      if (!container) continue;

      // Scale uniformly to fit wrap while preserving aspect
      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight || (cw * NATIVE_H / NATIVE_W);
      const s = Math.min(cw / NATIVE_W, ch / NATIVE_H);

      container.style.width = NATIVE_W + 'px';
      container.style.height = NATIVE_H + 'px';
      container.style.transform = `scale(${s})`;
    }
  });
  wraps.forEach(w => ro.observe(w));

  // Auto-resize inputs based on content
  const inputs = document.querySelectorAll('input[type="text"]');
  const formWidth = 843.538; // Form width from CSS
  const formCenter = formWidth / 2; // Center point

  // Create a hidden span for measuring text width
  const measureSpan = document.createElement('span');
  measureSpan.style.position = 'absolute';
  measureSpan.style.visibility = 'hidden';
  measureSpan.style.whiteSpace = 'pre';
  measureSpan.style.fontSize = '50px'; // Default input font size
  measureSpan.style.fontFamily = '"RedditSans", sans-serif'; // Match input font
  measureSpan.style.fontWeight = '700'; // Match input font weight
  measureSpan.style.padding = '0 20px'; // Match input padding
  document.body.appendChild(measureSpan);

  // Create a separate span for measuring subreddit input
  const measureSpanSubreddit = document.createElement('span');
  measureSpanSubreddit.style.position = 'absolute';
  measureSpanSubreddit.style.visibility = 'hidden';
  measureSpanSubreddit.style.whiteSpace = 'pre';
  measureSpanSubreddit.style.fontSize = '28px'; // Subreddit input font size (matching updated CSS)
  measureSpanSubreddit.style.fontFamily = '"RedditSans", sans-serif';
  measureSpanSubreddit.style.fontWeight = '700';
  measureSpanSubreddit.style.padding = '0 20px 0 0';
  document.body.appendChild(measureSpanSubreddit);

  function resizeInput(input) {
    // Use different measure span for subreddit input
    const isSubreddit = input.classList.contains('subreddit-input');
    const currentMeasureSpan = isSubreddit ? measureSpanSubreddit : measureSpan;

    // Measure actual text width
    const text = input.value || input.placeholder || '';
    currentMeasureSpan.textContent = text;

    // Get the actual width and add some padding for cursor
    const rightMargin = isSubreddit ? 0 : 40; // Extra space for non-subreddit inputs
    const measuredWidth = currentMeasureSpan.offsetWidth + rightMargin;

    // Apply min/max constraints (smaller for subreddit input)
    const minWidth = isSubreddit ? 80 : 150; // Minimum width in pixels
    const maxWidth = isSubreddit ? 400 : 600; // Maximum width in pixels
    const finalWidth = Math.max(minWidth, Math.min(maxWidth, measuredWidth));

    input.style.width = `${finalWidth}px`;
    return finalWidth; // Return width for positioning calculations
  }

  function updatePositions() {
    const line1 = document.querySelector('input[name="line1"]');
    const line2 = document.querySelector('input[name="line2"]');
    const line3 = document.querySelector('input[name="line3"]');
    const line4 = document.querySelector('input[name="line4"]');
    const line4Wrapper = document.querySelector('.line4-wrapper');

    // Get current widths
    const width1 = parseFloat(line1.style.width) || 150;
    const width2 = parseFloat(line2.style.width) || 150;
    const width3 = parseFloat(line3.style.width) || 150;
    const width4 = parseFloat(line4.style.width) || 150;

    // Simple staggered positioning around center
    // Line 1: left side
    line1.style.left = `${formCenter - width1 / 2 - 100}px`;

    // Line 2: right side
    line2.style.left = `${formCenter - width2 / 2 + 100}px`;

    // Line 3: left-center
    line3.style.left = `${formCenter - width3 / 2 - 50}px`;

    // Line 4: right-center (position the wrapper, not the input)
    line4Wrapper.style.left = `${formCenter - width4 / 2 + 50}px`;

    // Subreddit input has fixed position, no need to update
  }

  inputs.forEach(input => {
    // Initial sizing and positioning
    resizeInput(input);

    // Resize on input and update positions
    input.addEventListener('input', () => {
      resizeInput(input);
      updatePositions();
    });

    // Also resize on focus for better UX
    input.addEventListener('focus', () => {
      resizeInput(input);
      updatePositions();
    });
  });

  // Initial position update
  updatePositions();
})();