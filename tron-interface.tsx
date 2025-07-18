"use client"

import type React from "react"

import { useRef, useState, useCallback, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, OrbitControls, Grid, shaderMaterial } from "@react-three/drei"
import { Upload, Activity } from "lucide-react"
import * as THREE from "three"
import { extend } from "@react-three/fiber"

// Custom shader material for particles
const ParticleMaterial = shaderMaterial(
  {
    time: 0,
    size: 0.05,
    opacity: 1.0,
  },
  // Vertex shader
  `
    uniform float time;
    uniform float size;
    attribute float aProgress;
    attribute vec3 aTarget;
    attribute vec3 aStart;
    varying float vProgress;
    
    void main() {
      vProgress = aProgress;
      
      // Smooth easing function (ease-out-cubic)
      float easedProgress = 1.0 - pow(1.0 - aProgress, 3.0);
      
      // Interpolate between start and target position
      vec3 pos = mix(aStart, aTarget, easedProgress);
      
      // Add some floating motion
      pos.y += sin(time * 2.0 + position.x * 10.0) * 0.02 * aProgress;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment shader
  `
    uniform float opacity;
    varying float vProgress;
    
    void main() {
      // Create circular particles
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      
      if (dist > 0.5) discard;
      
      // Glow effect
      float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
      alpha *= alpha; // Stronger glow
      
      // Cyan color with intensity based on progress
      vec3 color = vec3(0.0, 1.0, 1.0);
      float intensity = 0.5 + vProgress * 0.5;
      
      gl_FragColor = vec4(color * intensity, alpha * opacity * vProgress);
    }
  `,
)

extend({ ParticleMaterial })

export default function Component() {
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = useCallback((file: File) => {
    if (file && file.name.toLowerCase().endsWith(".glb")) {
      setIsUploading(true)
      const url = URL.createObjectURL(file)
      setModelFile(file)
      setModelUrl(url)
      setTimeout(() => setIsUploading(false), 1000)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      const glbFile = files.find((file) => file.name.toLowerCase().endsWith(".glb"))
      if (glbFile) {
        handleFileUpload(glbFile)
      }
    },
    [handleFileUpload],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileUpload(file)
      }
    },
    [handleFileUpload],
  )

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Top Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 border-b border-cyan-500/30">
        <div className="flex items-center space-x-3">
          <Activity className="w-8 h-8 text-cyan-400" />
          <span className="text-2xl font-mono text-cyan-400 tracking-wider">J.A.R.V.I.S.</span>
        </div>
        <div className="text-cyan-400/60 font-mono text-sm">NEURAL INTERFACE v2.1</div>
      </nav>

      {/* Upload Area */}
      {!modelUrl && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div
            className="border-2 border-dashed border-cyan-500/50 rounded-lg p-12 text-center bg-black/50 backdrop-blur-sm hover:border-cyan-400 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <p className="text-cyan-400 font-mono text-lg mb-2">UPLOAD 3D MODEL</p>
            <p className="text-cyan-400/60 font-mono text-sm">Drag & drop .glb file or click to browse</p>
            <input id="file-input" type="file" accept=".glb" onChange={handleFileInput} className="hidden" />
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
          <color attach="background" args={["#000000"]} />

          {/* Lighting */}
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={0.5} color="#00ffff" />
          <pointLight position={[-10, -10, 10]} intensity={0.3} color="#00ffff" />

          {/* Rotating Disc */}
          <RotatingDisc />

          {/* Model with Particle Animation */}
          {modelUrl && <HolographicModel url={modelUrl} />}

          {/* Grid Floor */}
          <Grid
            position={[0, -3, 0]}
            args={[20, 20]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#00ffff"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#00ffff"
            fadeDistance={25}
            fadeStrength={1}
            infiniteGrid
          />

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={20}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </div>

      {/* Loading Indicator */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <div className="text-cyan-400 font-mono text-xl animate-pulse">INITIALIZING...</div>
        </div>
      )}
    </div>
  )
}

function RotatingDisc() {
  const discRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (discRef.current) {
      discRef.current.rotation.y += 0.01
    }
    if (ringRef.current) {
      ringRef.current.rotation.y -= 0.005
    }
  })

  return (
    <group position={[0, -2, 0]}>
      {/* Main Disc */}
      <mesh ref={discRef}>
        <cylinderGeometry args={[2, 2, 0.1, 32]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.3} transparent opacity={0.7} />
      </mesh>

      {/* Outer Ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[2.2, 2.5, 32]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner Glow */}
      <mesh>
        <cylinderGeometry args={[1.5, 1.5, 0.05, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#00ffff" emissiveIntensity={0.8} transparent opacity={0.4} />
      </mesh>
    </group>
  )
}

function HolographicModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const particlesRef = useRef<THREE.Points>(null)
  const materialRef = useRef<any>(null)

  const [vertices, setVertices] = useState<Float32Array | null>(null)
  const [animationPhase, setAnimationPhase] = useState<"loading" | "animating" | "complete">("loading")

  // Reset states when URL changes
  useEffect(() => {
    setVertices(null)
    setAnimationPhase("loading")
  }, [url])

  // Extract all vertices from the model (NO MODEL MESH ADDED TO SCENE)
  useEffect(() => {
    if (scene && animationPhase === "loading") {
      const allVertices: number[] = []
      const tempMatrix = new THREE.Matrix4()

      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const geometry = child.geometry
          const positionAttribute = geometry.attributes.position

          if (positionAttribute) {
            // Apply the mesh's transform to vertices
            child.updateMatrixWorld(true)
            tempMatrix.copy(child.matrixWorld)

            for (let i = 0; i < positionAttribute.count; i++) {
              const vertex = new THREE.Vector3(
                positionAttribute.getX(i),
                positionAttribute.getY(i),
                positionAttribute.getZ(i),
              )

              // Apply transformations
              vertex.applyMatrix4(tempMatrix)

              allVertices.push(vertex.x * 2, vertex.y * 2, vertex.z * 2) // Scale up
            }
          }
        }
      })

      if (allVertices.length > 0) {
        setVertices(new Float32Array(allVertices))
        setAnimationPhase("animating")
      }
    }
  }, [scene, animationPhase])

  // Create permanent particle system (NO ACTUAL MODEL)
  useEffect(() => {
    if (vertices && particlesRef.current && animationPhase === "animating") {
      const particleCount = vertices.length / 3
      const geometry = new THREE.BufferGeometry()

      // Start positions (from disc)
      const startPositions = new Float32Array(vertices.length)

      // Target positions (actual vertex positions)
      const targetPositions = new Float32Array(vertices)

      // Progress for each particle
      const progress = new Float32Array(particleCount)

      // Initialize particles at disc position with some randomness
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * 2

        startPositions[i3] = Math.cos(angle) * radius
        startPositions[i3 + 1] = -2 + Math.random() * 0.5
        startPositions[i3 + 2] = Math.sin(angle) * radius

        // Stagger animation start times
        progress[i] = -Math.random() * 0.8
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(startPositions, 3))
      geometry.setAttribute("aStart", new THREE.BufferAttribute(startPositions, 3))
      geometry.setAttribute("aTarget", new THREE.BufferAttribute(targetPositions, 3))
      geometry.setAttribute("aProgress", new THREE.BufferAttribute(progress, 1))

      particlesRef.current.geometry = geometry
    }
  }, [vertices, animationPhase])

  // Animation loop - particles rise and form holographic model
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.time = state.clock.elapsedTime
    }

    // Animate particles rising to form the holographic model
    if (particlesRef.current && vertices && (animationPhase === "animating" || animationPhase === "complete")) {
      const geometry = particlesRef.current.geometry
      const progressAttribute = geometry.attributes.aProgress

      if (progressAttribute && animationPhase === "animating") {
        const progressArray = progressAttribute.array as Float32Array
        let allComplete = true

        for (let i = 0; i < progressArray.length; i++) {
          if (progressArray[i] < 1) {
            progressArray[i] += 0.006 + Math.random() * 0.004
            if (progressArray[i] < 1) {
              allComplete = false
            } else {
              progressArray[i] = 1
            }
          }
        }

        progressAttribute.needsUpdate = true

        // Mark as complete when all particles are in position
        if (allComplete) {
          setAnimationPhase("complete")
        }
      }

      // Add gentle floating motion to the holographic model
      if (animationPhase === "complete" && particlesRef.current) {
        const time = state.clock.elapsedTime
        particlesRef.current.rotation.y += 0.002
        particlesRef.current.position.y = Math.sin(time * 0.5) * 0.05
      }
    }
  })

  return (
    <group>
      {/* ONLY Particle System - NO ACTUAL MODEL MESH */}
      {vertices && (animationPhase === "animating" || animationPhase === "complete") && (
        <points ref={particlesRef}>
          <particleMaterial
            ref={materialRef}
            size={0.06}
            opacity={0.9}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  )
}
