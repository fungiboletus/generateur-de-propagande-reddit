(() => {
  // Native background size
  const NATIVE_W = 2048, NATIVE_H = 1536;

  // Layout/config constants (tweak-friendly)
  const FORM_WIDTH = 843.538; // Native px width of the form area (matches CSS)
  // Asymmetric padding (more on the left per feedback)
  const FORM_PADDING_LEFT = 44;
  const FORM_PADDING_RIGHT = 46;

  // Input width constraints
  const INPUT_MIN_W = 150;
  const INPUT_MAX_W = 600;
  const INPUT_RIGHT_MARGIN = 40; // extra room for caret

  // Subreddit input constraints
  const SUB_MIN_W = 80;
  const SUB_MAX_W = 400;
  const SUB_RIGHT_MARGIN = 0;

  // Overlap control: ensure pairs touch by at least this ratio
  const TOUCH_RATIO = 0.50; // 50%
  const MIN_OVERLAP_PX = 30; // also enforce a tiny absolute overlap

  // Horizontal bias to make 1 & 3 lean left, 2 & 4 lean right (softened)
  const PAIR1_CENTER_SHIFT = -40; // (line1, line2)
  const PAIR2_CENTER_SHIFT = 30;  // (line3, line4)

  const wraps = document.querySelectorAll('main');

  // Store last known viewport dimensions for change detection
  let lastWidth = 0;
  let lastHeight = 0;

  // Shared resize logic
  function handleResize(wrap) {
    const container = wrap.querySelector('#container');
    if (!container) return;

    // Scale uniformly to fit wrap while preserving aspect
    const cw = wrap.clientWidth;
    const ch = wrap.clientHeight || (cw * NATIVE_H / NATIVE_W);
    const s = Math.min(cw / NATIVE_W, ch / NATIVE_H);

    container.style.width = NATIVE_W + 'px';
    container.style.height = NATIVE_H + 'px';
    container.style.transform = `scale(${s})`;

    // Store current dimensions
    lastWidth = cw;
    lastHeight = ch;
  }

  // ResizeObserver (primary method)
  const ro = new ResizeObserver(entries => {
    for (const { target: wrap } of entries) {
      handleResize(wrap);
    }
  });
  wraps.forEach(w => ro.observe(w));

  // Fallback interval check for Safari reliability
  setInterval(() => {
    wraps.forEach(wrap => {
      const currentWidth = wrap.clientWidth;
      const currentHeight = wrap.clientHeight || (currentWidth * NATIVE_H / NATIVE_W);

      // Only trigger if dimensions actually changed
      if (lastWidth !== currentWidth || lastHeight !== currentHeight) {
        handleResize(wrap);
      }
    });
  }, 500); // Check every 500ms (2x per second - reasonable balance)

  // Auto-resize inputs based on content
  const inputs = document.querySelectorAll('input[type="text"]');
  const formCenter = FORM_WIDTH / 2; // Center point

  // Create a hidden span for measuring text width
  const measureSpan = document.createElement('span');
  measureSpan.style.position = 'absolute';
  measureSpan.style.visibility = 'hidden';
  measureSpan.style.whiteSpace = 'pre';
  measureSpan.style.left = '-9999px';
  measureSpan.style.top = '-9999px';
  // Other font properties will be copied from each input via getComputedStyle
  document.body.appendChild(measureSpan);

  // Create a separate span for measuring subreddit input
  const measureSpanSubreddit = document.createElement('span');
  measureSpanSubreddit.style.position = 'absolute';
  measureSpanSubreddit.style.visibility = 'hidden';
  measureSpanSubreddit.style.whiteSpace = 'pre';
  measureSpanSubreddit.style.left = '-9999px';
  measureSpanSubreddit.style.top = '-9999px';
  // Other font properties will be copied from subreddit input via getComputedStyle
  document.body.appendChild(measureSpanSubreddit);

  function pxToNumber(px) {
    const n = parseFloat(px);
    return isNaN(n) ? 0 : n;
  }

  function copyFontMetrics(fromEl, toSpan) {
    const cs = window.getComputedStyle(fromEl);
    toSpan.style.fontFamily = cs.fontFamily;
    toSpan.style.fontSize = cs.fontSize;
    toSpan.style.fontWeight = cs.fontWeight;
    toSpan.style.fontStyle = cs.fontStyle;
    toSpan.style.letterSpacing = cs.letterSpacing;
    toSpan.style.textTransform = cs.textTransform;
  }

  function measureTextWidth(input, isSubreddit) {
    const span = isSubreddit ? measureSpanSubreddit : measureSpan;
    copyFontMetrics(input, span);
    const text = input.value || input.placeholder || '';
    span.textContent = text;
    // Add horizontal paddings from the input itself
    const cs = window.getComputedStyle(input);
    const padX = pxToNumber(cs.paddingLeft) + pxToNumber(cs.paddingRight);
    return span.offsetWidth + padX;
  }

  function resizeInput(input) {
    const isSubreddit = input.classList.contains('subreddit-input');
    const baseWidth = measureTextWidth(input, isSubreddit);
    const rightMargin = isSubreddit ? SUB_RIGHT_MARGIN : INPUT_RIGHT_MARGIN;
    const minW = isSubreddit ? SUB_MIN_W : INPUT_MIN_W;
    const maxW = isSubreddit ? SUB_MAX_W : INPUT_MAX_W;

    const finalWidth = Math.max(minW, Math.min(maxW, Math.ceil(baseWidth + rightMargin)));
    input.style.width = `${finalWidth}px`;
    return finalWidth;
  }

  // Fallback: Check if bubble 2 and 3 are touching, if not, center them
  function checkAndFixBubblesTouching() {
    // Only need to check in bubble-3 or bubble-4 mode
    const form = document.querySelector('form');
    if (!form || (!form.classList.contains('bubbles-3') && !form.classList.contains('bubbles-4'))) {
      return;
    }

    const line2 = document.querySelector('input[name="line2"]');
    const line3 = document.querySelector('input[name="line3"]');
    const line2Wrapper = document.querySelector('.line2-wrapper');
    const line3Wrapper = document.querySelector('.line3-wrapper');

    if (!line2 || !line3) return;

    function isVisible(el) {
      if (!el) return false;
      const cs = window.getComputedStyle(el);
      return cs && cs.display !== 'none' && cs.visibility !== 'hidden';
    }

    if (!isVisible(line2) || !isVisible(line3)) return;

    // Nuclear option: use getBoundingClientRect for absolute positions
    const rect2 = line2.getBoundingClientRect();
    const rect3 = line3.getBoundingClientRect();

    // Check for horizontal overlap (they're on different rows)
    const noOverlap = (rect3.left > rect2.right) || (rect3.right < rect2.left);

    if (noOverlap) {
      // They're not touching - apply fallback centering
      const availWidth = FORM_WIDTH - (FORM_PADDING_LEFT + FORM_PADDING_RIGHT);
      const bubble2Width = rect2.width;
      const bubble3Width = rect3.width;
      const totalWidth = bubble2Width + bubble3Width;

      // Add a small padding between them (reuse existing constants)
      const middlePadding = 10; // Small padding between the centered bubbles
      const neededSpace = totalWidth + middlePadding;

      if (neededSpace <= availWidth) {
        // Center both bubbles together with slight offset
        const centerStart = FORM_PADDING_LEFT + (availWidth - neededSpace) / 2;

        // Position bubble 2 slightly left of center, bubble 3 slightly right
        const container2 = line2Wrapper || line2;
        const container3 = line3Wrapper || line3;

        // Helper to compute left of a child relative to an ancestor container.
        function leftRelativeTo(el, ancestor) {
          let x = 0;
          let node = el;
          while (node && node !== ancestor) {
            x += node.offsetLeft || 0;
            node = node.offsetParent;
          }
          return x;
        }

        // Calculate container positions accounting for bubble offset within container
        const offset2 = container2 === line2 ? 0 : leftRelativeTo(line2, container2);
        const offset3 = container3 === line3 ? 0 : leftRelativeTo(line3, container3);

        const newPos2 = centerStart - offset2;
        const newPos3 = centerStart + bubble2Width + middlePadding - offset3;

        container2.style.left = `${newPos2}px`;
        container3.style.left = `${newPos3}px`;
      }
    }
  }

  function updatePositions() {
    const line1 = document.querySelector('input[name="line1"]');
    const line2 = document.querySelector('input[name="line2"]');
    const line3 = document.querySelector('input[name="line3"]');
    const line4 = document.querySelector('input[name="line4"]');
    const line1Wrapper = document.querySelector('.line1-wrapper');
    const line2Wrapper = document.querySelector('.line2-wrapper');
    const line3Wrapper = document.querySelector('.line3-wrapper');
    const line4Wrapper = document.querySelector('.line4-wrapper');

    if (!line1 || !line2 || !line3 || !line4) return;

    function isVisible(el) {
      if (!el) return false;
      const cs = window.getComputedStyle(el);
      return cs && cs.display !== 'none' && cs.visibility !== 'hidden';
    }

    // Helper to compute left of a child relative to an ancestor container.
    function leftRelativeTo(el, ancestor) {
      let x = 0;
      let node = el;
      while (node && node !== ancestor) {
        x += node.offsetLeft || 0;
        node = node.offsetParent;
      }
      return x;
    }

    // Generic pair placer operating on bubble elements (inputs) and their containers
    function placePairContainers(
      leftContainer, leftBubble,
      rightContainer, rightBubble,
      centerShift
    ) {
      const availWidth = FORM_WIDTH - (FORM_PADDING_LEFT + FORM_PADDING_RIGHT);

      const leftVisible = isVisible(leftContainer) && isVisible(leftBubble);
      const rightVisible = isVisible(rightContainer) && isVisible(rightBubble);

      if (!leftVisible && !rightVisible) return; // nothing to place

      // Measure bubble widths (only for visible ones)
      const wL = leftVisible ? (leftBubble.offsetWidth || INPUT_MIN_W) : 0;
      const wR = rightVisible ? (rightBubble.offsetWidth || INPUT_MIN_W) : 0;

      // Offsets of bubbles within their containers
      const oL = leftContainer === leftBubble ? 0 : leftRelativeTo(leftBubble, leftContainer);
      const oR = rightContainer === rightBubble ? 0 : leftRelativeTo(rightBubble, rightContainer);

      const L = FORM_PADDING_LEFT;
      const R = FORM_WIDTH - FORM_PADDING_RIGHT;
      const c = formCenter + centerShift;

      // If only one side is visible, center that bubble horizontally in this pair band
      if (leftVisible && !rightVisible) {
        let xBL = c - wL / 2;
        const low = L;
        const high = R - wL;
        if (low <= high) xBL = Math.min(Math.max(xBL, low), high); else xBL = L;
        const xCL = xBL - oL;
        leftContainer.style.left = `${xCL}px`;
        return;
      }
      if (!leftVisible && rightVisible) {
        let xBR = c - wR / 2;
        const low = L;
        const high = R - wR;
        if (low <= high) xBR = Math.min(Math.max(xBR, low), high); else xBR = L;
        const xCR = xBR - oR;
        rightContainer.style.left = `${xCR}px`;
        return;
      }

      // Both visible: compute desired overlap O within feasible bounds
      const minWidth = Math.min(wL, wR);
      const Omin = Math.max(minWidth * TOUCH_RATIO, MIN_OVERLAP_PX);
      const Omax = minWidth;
      const Oneeded = wL + wR - availWidth; // Required overlap to fit in available width
      let O = Math.max(Omin, Oneeded || 0);
      O = Math.min(O, Omax);

      // Pair span with this overlap
      const S = wL + wR - O;

      // Desired center and initial left for the pair (bubble-based)
      let xBL = c - S / 2; // choose bubble-left as pair left

      // Clamp pair into padded bounds [L, R]
      const low = L;
      const high = R - S;
      if (low <= high) {
        xBL = Math.min(Math.max(xBL, low), high);
      } else {
        // Impossible to fit both fully; anchor to left padding
        xBL = L;
      }

      // Right bubble follows to realize exact overlap O
      let xBR = xBL + wL - O;

      // Convert bubble lefts to container lefts
      const xCL = xBL - oL;
      const xCR = xBR - oR;

      // Apply positions
      leftContainer.style.left = `${xCL}px`;
      rightContainer.style.left = `${xCR}px`;
    }

    // Pair 1: both sides are now wrappers
    const leftContainer1 = line1Wrapper || line1;
    const rightContainer1 = line2Wrapper || line2;
    placePairContainers(leftContainer1, line1, rightContainer1, line2, PAIR1_CENTER_SHIFT);
    // Pair 2: both sides are now wrappers
    const leftContainer2 = line3Wrapper || line3;
    const rightContainer2 = line4Wrapper || line4;
    placePairContainers(leftContainer2, line3, rightContainer2, line4, PAIR2_CENTER_SHIFT);

    // Apply the fallback check after positioning
    checkAndFixBubblesTouching();

    // Subreddit input has fixed position elsewhere
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

  // Expose updatePositions globally for bubble control
  window.updatePositions = updatePositions;

})();
// Enable camera icon once dom is loaded
document.addEventListener('DOMContentLoaded', () => {
  const cameraIcon = document.getElementById('camera-icon');
  if (!cameraIcon) {
    return;
  }

  const isSafari = navigator.vendor === 'Apple Computer, Inc.' &&
    /safari/i.test(navigator.userAgent) &&
    !/chrome|chromium|crios|edg|edgios|opr|opt|brave/i.test(navigator.userAgent);

  if (isSafari) {
    // Safari has issues with dom-to-image and blobs, so hide the icon
    return;
  }
  cameraIcon.style.display = 'block';
  cameraIcon.addEventListener('click', (e) => {
    e.preventDefault();

    // Calculate scale to reach 2048x1536
    const main = document.querySelector('main');
    const currentWidth = main.clientWidth;
    const targetWidth = 2048;
    const scale = targetWidth / currentWidth;

    domtoimage.toBlob(main, {
      scale: scale,
      width: main.offsetWidth,
      height: main.offsetHeight
    }).then(function (blob) {
      window.saveAs(blob, 'reddit-propaganda.png');
    });
  });

});

// Bubble control functionality
document.addEventListener('DOMContentLoaded', () => {

  const bubbleButton = document.getElementById('bubble-control');
  const bubbleBadge = document.querySelector('.bubble-badge');
  const form = document.querySelector('form');

  if (!bubbleButton || !bubbleBadge || !form) {
    return;
  }

  // Start with 4 bubbles (all visible)
  let bubbleCount = 4;

  // Get all input elements
  const line1 = document.querySelector('input[name="line1"]');
  const line2 = document.querySelector('input[name="line2"]');
  const line3 = document.querySelector('input[name="line3"]');
  const line4 = document.querySelector('input[name="line4"]');

  // Function to resize visible inputs
  function resizeVisibleInputs() {
    const inputs = [line1, line2, line3, line4];
    inputs.forEach(input => {
      // Only resize if actually rendered (not hidden by a parent)
      if (input && input.offsetParent !== null) {
        // Trigger the resize by dispatching an input event
        input.dispatchEvent(new Event('input'));
      }
    });
  }

  // Function to update bubble visibility
  function updateBubbleCount() {
    // Remove all bubble classes
    form.classList.remove('bubbles-1', 'bubbles-2', 'bubbles-3', 'bubbles-4');

    // Add the appropriate class
    form.classList.add(`bubbles-${bubbleCount}`);

    // Update badge
    bubbleBadge.textContent = bubbleCount;

    // Resize visible inputs after content swap
    resizeVisibleInputs();

    // Trigger position update from the existing positioning system
    if (typeof window.updatePositions === 'function') {
      window.updatePositions();
    }
  }

  // Click handler
  bubbleButton.addEventListener('click', (e) => {
    e.preventDefault();

    // Cycle through: 4 → 3 → 2 → 1 → 4
    bubbleCount = bubbleCount === 1 ? 4 : bubbleCount - 1;

    // Update display
    updateBubbleCount();
  });
});
