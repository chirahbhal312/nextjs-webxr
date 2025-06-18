// pages/index.js
"use client"
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import { WebGLRenderer } from "three";

export default function Home() {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const drawingCanvasRef = useRef(null);

  // Drawing settings
  const [color, setColor] = useState("#000000"); // Stroke color
  const [fillColor, setFillColor] = useState("#FFFFFF"); // Fill color
  const [lineThickness, setLineThickness] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pencil"); // pencil, eraser, text, circle, rectangle, triangle, polygon, freehand
  const [isFilled, setIsFilled] = useState(false); // Toggle for filling shapes
  const points = useRef([]);
  const startPoint = useRef(null); // For shapes (circle, rectangle)
  const polygonPoints = useRef([]); // For polygon drawing
  const currentText = useRef(""); // For text annotation

  useEffect(() => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;
    
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;
    canvasRef.current.appendChild(renderer.domElement);
    
    // Setup AR button
    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
    });
    document.body.appendChild(arButton);

    // Add some light
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    // Handle drawing
    const draw = (event) => {
      const rect = drawingCanvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (isDrawing && tool === "pencil") {
        points.current.push({ x, y });
        const ctx = drawingCanvasRef.current.getContext("2d");
        ctx.lineWidth = lineThickness;
        ctx.strokeStyle = color;
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(points.current[points.current.length - 2]?.x || x, points.current[points.current.length - 2]?.y || y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (isDrawing && tool === "eraser") {
        const ctx = drawingCanvasRef.current.getContext("2d");
        ctx.clearRect(x - lineThickness / 2, y - lineThickness / 2, lineThickness, lineThickness);
      } else if (tool === "rectangle" || tool === "circle") {
        // Draw shapes on mouse move when dragging
        if (startPoint.current) {
          const ctx = drawingCanvasRef.current.getContext("2d");
          ctx.lineWidth = lineThickness;
          ctx.strokeStyle = color;
          ctx.lineJoin = ctx.lineCap = "round";
          ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height); // Clear canvas first
          if (tool === "rectangle") {
            if (isFilled) {
              ctx.fillStyle = fillColor;
              ctx.fillRect(startPoint.current.x, startPoint.current.y, x - startPoint.current.x, y - startPoint.current.y); // Fill shape
            }
            ctx.strokeRect(startPoint.current.x, startPoint.current.y, x - startPoint.current.x, y - startPoint.current.y); // Draw border
          } else if (tool === "circle") {
            const radius = Math.sqrt(Math.pow(x - startPoint.current.x, 2) + Math.pow(y - startPoint.current.y, 2));
            if (isFilled) {
              ctx.fillStyle = fillColor;
              ctx.beginPath();
              ctx.arc(startPoint.current.x, startPoint.current.y, radius, 0, Math.PI * 2);
              ctx.fill(); // Fill shape
            }
            ctx.beginPath();
            ctx.arc(startPoint.current.x, startPoint.current.y, radius, 0, Math.PI * 2);
            ctx.stroke(); // Draw border
          }
        }
      } else if (tool === "triangle" || tool === "polygon") {
        // Draw triangle or polygon
        const ctx = drawingCanvasRef.current.getContext("2d");
        ctx.lineWidth = lineThickness;
        ctx.strokeStyle = color;
        ctx.lineJoin = ctx.lineCap = "round";

        // For triangle (3 points)
        if (tool === "triangle" && polygonPoints.current.length === 2) {
          ctx.beginPath();
          ctx.moveTo(polygonPoints.current[0].x, polygonPoints.current[0].y);
          ctx.lineTo(polygonPoints.current[1].x, polygonPoints.current[1].y);
          ctx.lineTo(x, y);
          ctx.closePath();
          if (isFilled) {
            ctx.fillStyle = fillColor;
            ctx.fill(); // Fill triangle
          }
          ctx.stroke(); // Draw border
        }

        // For polygon (multiple points)
        if (tool === "polygon") {
          polygonPoints.current.push({ x, y });
          ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height); // Clear canvas first
          ctx.beginPath();
          ctx.moveTo(polygonPoints.current[0].x, polygonPoints.current[0].y);
          polygonPoints.current.forEach((point, index) => {
            if (index > 0) ctx.lineTo(point.x, point.y);
          });
          ctx.lineTo(x, y); // Draw line to current position
          ctx.closePath();
          if (isFilled) {
            ctx.fillStyle = fillColor;
            ctx.fill(); // Fill polygon
          }
          ctx.stroke(); // Draw border
        }
      }
    };

    const handleMouseDown = (event) => {
      const rect = drawingCanvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setIsDrawing(true);
      
      if (tool === "rectangle" || tool === "circle") {
        startPoint.current = { x, y };
      } else if (tool === "text") {
        // Add text annotation on click for text tool
        const text = prompt("Enter text:");
        if (text) {
          const ctx = drawingCanvasRef.current.getContext("2d");
          ctx.fillStyle = color;
          ctx.font = "30px Arial";
          ctx.fillText(text, x, y);
        }
      } else if (tool === "triangle") {
        polygonPoints.current.push({ x, y });
        if (polygonPoints.current.length === 3) {
          const ctx = drawingCanvasRef.current.getContext("2d");
          ctx.beginPath();
          ctx.moveTo(polygonPoints.current[0].x, polygonPoints.current[0].y);
          ctx.lineTo(polygonPoints.current[1].x, polygonPoints.current[1].y);
          ctx.lineTo(polygonPoints.current[2].x, polygonPoints.current[2].y);
          ctx.closePath();
          if (isFilled) {
            ctx.fillStyle = fillColor;
            ctx.fill(); // Fill triangle
          }
          ctx.stroke();
          polygonPoints.current = []; // Reset for next triangle
        }
      }
    };

    const handleMouseUp = () => {
      setIsDrawing(false);
      startPoint.current = null; // Reset startPoint after drawing a shape
    };

    // Event listeners for drawing
    drawingCanvasRef.current.addEventListener("mousedown", handleMouseDown);
    drawingCanvasRef.current.addEventListener("mouseup", handleMouseUp);
    drawingCanvasRef.current.addEventListener("mousemove", draw);

    const animate = () => {
      // Update and render the AR scene
      if (rendererRef.current) rendererRef.current.render(scene, cameraRef.current);
      requestAnimationFrame(animate);
    };
    animate();

    // Clean up listeners
    return () => {
      drawingCanvasRef.current.removeEventListener("mousedown", handleMouseDown);
      drawingCanvasRef.current.removeEventListener("mouseup", handleMouseUp);
      drawingCanvasRef.current.removeEventListener("mousemove", draw);
    };
  }, [color, fillColor, lineThickness, tool, isDrawing, isFilled]);

  // Clear the drawing canvas
  const clearCanvas = () => {
    const ctx = drawingCanvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
    points.current = []; // Reset the drawing points
    polygonPoints.current = []; // Reset polygon points
  };

  return (
    <div className="relative">
      <h1 className="text-4xl font-bold text-center mb-6">AR Painting App</h1>
      <div ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0"></div>
      
      <canvas
        ref={drawingCanvasRef}
        id="drawingCanvas"
        // width={window.innerWidth}
        // height={window.innerHeight}
        className="absolute top-0 left-0 z-10"
      ></canvas>

      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-20 p-4 bg-white bg-opacity-75 rounded shadow-md">
        <div className="mb-3">
          <label htmlFor="colorPicker" className="block text-lg font-medium">Stroke Color:</label>
          <input
            type="color"
            id="colorPicker"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full mt-2"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="fillColorPicker" className="block text-lg font-medium">Fill Color:</label>
          <input
            type="color"
            id="fillColorPicker"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="w-full mt-2"
          />
        </div>
        <div className="mb-3">
          <label className="block text-lg font-medium">Fill Shapes:</label>
          <input
            type="checkbox"
            id="fillToggle"
            checked={isFilled}
            onChange={(e) => setIsFilled(e.target.checked)}
            className="mr-2"
          />
          <span>Enable filling shapes</span>
        </div>
        <div className="mb-3">
          <button
            onClick={() => setTool(tool === "pencil" ? "eraser" : "pencil")}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-700"
          >
            Switch to {tool === "pencil" ? "Eraser" : "Pencil"}
          </button>
        </div>
        {/* Add other buttons for shapes and text tools as before */}
        <div>
          <button
            onClick={clearCanvas}
            className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-700"
          >
            Clear Canvas
          </button>
        </div>
      </div>
    </div>
  );
}
