import React from "react"

export const BrainGraphIcon = ({ className }: { className?: string }) => {
  // Coordinates mapped from the reference image on a 100x100 grid
  // Adjusted for pixel-perfect match
  const nodes = [
    { x: 55, y: 10 }, // 0: Top
    { x: 35, y: 18 }, // 1: Top Left
    { x: 20, y: 22 }, // 2: Far Left Top
    { x: 12, y: 40 }, // 3: Far Left Bottom
    { x: 22, y: 55 }, // 4: Left Bottom
    { x: 35, y: 38 }, // 5: Left Inner
    { x: 52, y: 28 }, // 6: Center Top
    { x: 52, y: 48 }, // 7: Center Mid
    { x: 40, y: 65 }, // 8: Center Bottom
    { x: 68, y: 88 }, // 9: Bottom Tip
    { x: 75, y: 65 }, // 10: Bottom Right
    { x: 65, y: 52 }, // 11: Right Inner Bottom
    { x: 70, y: 35 }, // 12: Right Inner Top
    { x: 78, y: 20 }, // 13: Far Right Top
    { x: 88, y: 35 }, // 14: Far Right Mid
    { x: 85, y: 50 }, // 15: Far Right Bottom
  ]

  // Connections between nodes (indices)
  const edges = [
    // Top Cluster
    [0, 1], [0, 6], [0, 12], [0, 13],
    
    // Left Side
    [1, 2], [1, 5], [1, 6],
    [2, 3], [2, 5],
    [3, 4], [3, 5],
    [4, 5], [4, 7], [4, 8],
    
    // Center Spine
    [5, 6], [5, 7],
    [6, 7], [6, 12],
    [7, 8], [7, 11], [7, 12],
    
    // Bottom Cluster
    [8, 9], [8, 10], [8, 11],
    [9, 10],
    
    // Right Side
    [10, 11], [10, 15],
    [11, 12], [11, 14], [11, 15],
    [12, 13], [12, 14],
    [13, 14],
    [14, 15]
  ]

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]"
      >
        {/* Definitions for gradients/glows */}
        <defs>
          <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feGaussianBlur stdDeviation="1" result="coloredBlurSmall" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlurSmall" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connections (Lines) */}
        <g stroke="url(#nodeGradient)" strokeWidth="2.5" strokeOpacity="0.8" strokeLinecap="round" filter="url(#glow)">
          {edges.map(([start, end], i) => (
            <line
              key={i}
              x1={nodes[start].x}
              y1={nodes[start].y}
              x2={nodes[end].x}
              y2={nodes[end].y}
            />
          ))}
        </g>

        {/* Nodes (Circles) */}
        <g fill="white" filter="url(#glow)">
          {nodes.map((node, i) => (
            <circle key={i} cx={node.x} cy={node.y} r={4.5} />
          ))}
        </g>
      </svg>
    </div>
  )
}
