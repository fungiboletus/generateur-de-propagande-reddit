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
  const TOUCH_RATIO = 0.33; // 33%
  const MIN_OVERLAP_PX = 12; // also enforce a tiny absolute overlap

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
  // Other font properties will be copied from each input via getComputedStyle
  document.body.appendChild(measureSpan);

  // Create a separate span for measuring subreddit input
  const measureSpanSubreddit = document.createElement('span');
  measureSpanSubreddit.style.position = 'absolute';
  measureSpanSubreddit.style.visibility = 'hidden';
  measureSpanSubreddit.style.whiteSpace = 'pre';
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

  function updatePositions() {
    const line1 = document.querySelector('input[name="line1"]');
    const line2 = document.querySelector('input[name="line2"]');
    const line3 = document.querySelector('input[name="line3"]');
    const line4 = document.querySelector('input[name="line4"]');
    const line4Wrapper = document.querySelector('.line4-wrapper');

    if (!line1 || !line2 || !line3 || !line4) return;

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

      // Measure bubble widths
      const wL = leftBubble.offsetWidth || INPUT_MIN_W;
      const wR = rightBubble.offsetWidth || INPUT_MIN_W;

      // Offsets of bubbles within their containers
      const oL = leftContainer === leftBubble ? 0 : leftRelativeTo(leftBubble, leftContainer);
      const oR = rightContainer === rightBubble ? 0 : leftRelativeTo(rightBubble, rightContainer);

      // Compute desired overlap O within feasible bounds
      const minWidth = Math.min(wL, wR);
      const Omin = Math.max(minWidth * TOUCH_RATIO, MIN_OVERLAP_PX);
      const Omax = minWidth;
      // Required overlap to fit in the available width
      const Oneeded = wL + wR - availWidth;
      let O = Math.max(Omin, Oneeded || 0);
      O = Math.min(O, Omax);

      // Pair span with this overlap
      const S = wL + wR - O;

      // Desired center and initial left for the pair (bubble-based)
      const c = formCenter + centerShift;
      let xBL = c - S / 2; // choose bubble-left as pair left

      // Clamp pair into padded bounds [L, R]
      const L = FORM_PADDING_LEFT;
      const R = FORM_WIDTH - FORM_PADDING_RIGHT;
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

    // Pair 1: both are inputs directly
    placePairContainers(line1, line1, line2, line2, PAIR1_CENTER_SHIFT);
    // Pair 2: right side is the wrapper, bubble is the inner subreddit input
    const rightContainer2 = line4Wrapper || line4;
    placePairContainers(line3, line3, rightContainer2, line4, PAIR2_CENTER_SHIFT);

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


})();
// Enable camera icon once dom is loaded
document.addEventListener('DOMContentLoaded', () => {
  const cameraIcon = document.getElementById('camera-icon');
  if (!cameraIcon) {
    return;
  }
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
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
    }).then(function (blob) {
      window.saveAs(blob, 'reddit-propaganda.png');
    });
  });

});
