const React = globalThis.__CCREACT_RUNTIME__.React;

export function evaluatePolynomial(coefficients, x) {
  return coefficients.reduce((sum, coefficient, power) => sum + coefficient * x ** power, 0);
}

export function samplePolynomial(coefficients, xMin, xMax, count = 80) {
  return Array.from({ length: count }, (_, index) => {
    const x = xMin + (xMax - xMin) * index / (count - 1);
    return { x, y: evaluatePolynomial(coefficients, x) };
  });
}

function linePath(points) {
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
}

export function PolynomialGraph({
  coefficients,
  xMin = -2,
  xMax = 10,
  currentX,
  history = [],
  minimumX = 0,
}) {
  const width = 640;
  const height = 280;
  const padding = { top: 18, right: 18, bottom: 34, left: 42 };
  const samples = samplePolynomial(coefficients, xMin, xMax);
  const yValues = samples.map((point) => point.y);
  const currentY = evaluatePolynomial(coefficients, currentX);
  const historyY = history.map((x) => evaluatePolynomial(coefficients, x));
  const yMin = Math.min(0, ...yValues, currentY, ...historyY);
  const yMax = Math.max(0, ...yValues, currentY, ...historyY);
  const yPadding = Math.max(1, (yMax - yMin) * 0.08);
  const plotYMin = yMin - yPadding;
  const plotYMax = yMax + yPadding;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const toX = (value) => padding.left + (value - xMin) / (xMax - xMin) * plotWidth;
  const toY = (value) => padding.top + (plotYMax - value) / (plotYMax - plotYMin) * plotHeight;
  const curve = samples.map((point) => ({ x: toX(point.x), y: toY(point.y) }));
  const currentPoint = { x: toX(currentX), y: toY(currentY) };
  const minimumPoint = { x: toX(minimumX), y: toY(evaluatePolynomial(coefficients, minimumX)) };
  const axisY = toY(0);
  const axisX = xMin <= 0 && xMax >= 0 ? toX(0) : padding.left;
  const gridValues = [0, 0.33, 0.66, 1].map((fraction) => plotYMin + (plotYMax - plotYMin) * fraction);
  const elements = [];

  gridValues.forEach((value, index) => {
    elements.push(React.createElement("line", {
      key: `grid-${index}`,
      x1: padding.left,
      x2: width - padding.right,
      y1: toY(value),
      y2: toY(value),
      stroke: "currentColor",
      strokeOpacity: 0.12,
    }));
  });
  elements.push(React.createElement("line", { key: "axis-x", x1: padding.left, x2: width - padding.right, y1: axisY, y2: axisY, stroke: "currentColor", strokeOpacity: 0.45 }));
  elements.push(React.createElement("line", { key: "axis-y", x1: axisX, x2: axisX, y1: padding.top, y2: height - padding.bottom, stroke: "currentColor", strokeOpacity: 0.25 }));
  elements.push(React.createElement("line", { key: "minimum", x1: minimumPoint.x, x2: minimumPoint.x, y1: minimumPoint.y, y2: height - padding.bottom, stroke: "#f59e0b", strokeDasharray: "5 4", strokeOpacity: 0.8 }));
  elements.push(React.createElement("path", { key: "curve", d: linePath(curve), fill: "none", stroke: "#6366f1", strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" }));
  history.forEach((value, index) => {
    const point = { x: toX(value), y: toY(evaluatePolynomial(coefficients, value)) };
    elements.push(React.createElement("circle", { key: `history-${index}`, cx: point.x, cy: point.y, r: 4, fill: "#f59e0b", opacity: 0.7 }));
  });
  elements.push(React.createElement("circle", { key: "minimum-dot", cx: minimumPoint.x, cy: minimumPoint.y, r: 5, fill: "#f59e0b", stroke: "currentColor", strokeWidth: 1.5 }));
  elements.push(React.createElement("circle", { key: "current", cx: currentPoint.x, cy: currentPoint.y, r: 9, fill: "#e11d48", stroke: "currentColor", strokeWidth: 2 }));
  elements.push(React.createElement("text", { key: "minimum-label", x: minimumPoint.x, y: height - 10, textAnchor: "middle", fontSize: 12, fill: "currentColor" }, `minimum w = ${minimumX}`));
  elements.push(React.createElement("text", { key: "x-label", x: width - padding.right, y: axisY - 8, textAnchor: "end", fontSize: 12, fill: "currentColor" }, "w"));

  return React.createElement("svg", {
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": "Polynomial curve with a ball moving toward its minimum",
    style: { display: "block", width: "100%", maxWidth: 640, overflow: "visible" },
  }, elements);
}
