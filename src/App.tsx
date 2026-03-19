import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { 
  Calculator, 
  Settings, 
  LogOut, 
  User as UserIcon, 
  Lock, 
  Mail, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  Bell,
  FileText,
  HelpCircle,
  AlertTriangle,
  History,
  Trash2,
  Save,
  Clock,
  Share2,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- 3D Reinforcement Visualization ---
const Reinforcement3D = ({ type, width, height, length = 300, bars, negativeBars, stirrups, backgroundColor = '#09090b' }: any) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight || 400;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    camera.position.set(length * 0.8, height * 2, width * 2);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 200, 100);
    scene.add(directionalLight);

    // Materials
    const concreteMaterial = new THREE.MeshPhongMaterial({
      color: 0x3f3f46, // zinc-700
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });

    const barMaterial = new THREE.MeshPhongMaterial({ color: 0xf59e0b }); // amber-500
    const negativeBarMaterial = new THREE.MeshPhongMaterial({ color: 0xf87171 }); // red-400
    const stirrupMaterial = new THREE.MeshPhongMaterial({ color: 0x3b82f6 }); // blue-500

    // Concrete Geometry
    const concreteGeo = new THREE.BoxGeometry(length, height, width);
    const concrete = new THREE.Mesh(concreteGeo, concreteMaterial);
    scene.add(concrete);

    // Helper to add a bar
    const addBar = (x: number, y: number, z: number, barLen: number, barDiam: number, vertical = false, isNegative = false) => {
      const barGeo = new THREE.CylinderGeometry(barDiam / 20, barDiam / 20, barLen, 8);
      const bar = new THREE.Mesh(barGeo, isNegative ? negativeBarMaterial : barMaterial);
      if (!vertical) {
        bar.rotation.z = Math.PI / 2;
      }
      bar.position.set(x, y, z);
      scene.add(bar);
    };

    // Helper to add a stirrup
    const addStirrup = (x: number, sW: number, sH: number, sDiam: number) => {
      const group = new THREE.Group();
      const sRadius = sDiam / 20;
      
      // 4 sides of the stirrup
      const top = new THREE.Mesh(new THREE.CylinderGeometry(sRadius, sRadius, sW, 8), stirrupMaterial);
      top.rotation.x = Math.PI / 2;
      top.position.set(0, sH / 2, 0);
      group.add(top);

      const bottom = new THREE.Mesh(new THREE.CylinderGeometry(sRadius, sRadius, sW, 8), stirrupMaterial);
      bottom.rotation.x = Math.PI / 2;
      bottom.position.set(0, -sH / 2, 0);
      group.add(bottom);

      const left = new THREE.Mesh(new THREE.CylinderGeometry(sRadius, sRadius, sH, 8), stirrupMaterial);
      left.position.set(0, 0, -sW / 2);
      group.add(left);

      const right = new THREE.Mesh(new THREE.CylinderGeometry(sRadius, sRadius, sH, 8), stirrupMaterial);
      right.position.set(0, 0, sW / 2);
      group.add(right);

      group.position.x = x;
      scene.add(group);
    };

    const cover = 2.5; // cm
    const effW = width - 2 * cover;
    const effH = height - 2 * cover;

    // Add Longitudinal Bars
    if (type === 'beam') {
      // For beams, bars are usually at the bottom
      const spacing = effW / (bars.count - 1 || 1);
      for (let i = 0; i < bars.count; i++) {
        const z = -effW / 2 + i * spacing;
        const y = -effH / 2;
        addBar(0, y, z, length, bars.diameter);
      }
      // Add 2 top bars (porta-estribos)
      addBar(0, effH / 2, -effW / 2, length, 8);
      addBar(0, effH / 2, effW / 2, length, 8);
    } else if (type === 'pillar') {
      // For pillars, bars are distributed
      const count = bars.count || 4;
      
      // Corners
      addBar(0, effH / 2, effW / 2, length, bars.diameter);
      addBar(0, effH / 2, -effW / 2, length, bars.diameter);
      addBar(0, -effH / 2, effW / 2, length, bars.diameter);
      addBar(0, -effH / 2, -effW / 2, length, bars.diameter);

      if (count > 4) {
        const remaining = count - 4;
        const isHorizontalLonger = effW >= effH;

        if (remaining === 2) {
          if (isHorizontalLonger) {
            addBar(0, effH / 2, 0, length, bars.diameter);
            addBar(0, -effH / 2, 0, length, bars.diameter);
          } else {
            addBar(0, 0, effW / 2, length, bars.diameter);
            addBar(0, 0, -effW / 2, length, bars.diameter);
          }
        } else {
          const nx = isHorizontalLonger ? Math.ceil(remaining * (effW / (effW + effH)) / 2) : Math.floor(remaining * (effW / (effW + effH)) / 2);
          const ny = (remaining / 2) - nx;

          for (let i = 1; i <= nx; i++) {
            const z = -effW / 2 + (i * effW / (nx + 1));
            addBar(0, effH / 2, z, length, bars.diameter);
            addBar(0, -effH / 2, z, length, bars.diameter);
          }
          for (let i = 1; i <= ny; i++) {
            const y = -effH / 2 + (i * effH / (ny + 1));
            addBar(0, y, effW / 2, length, bars.diameter);
            addBar(0, y, -effW / 2, length, bars.diameter);
          }
        }
      }
    } else if (type === 'slab') {
      // For slabs, bars are a grid at the bottom
      const spacing = bars.spacing || 15;
      const countX = Math.floor(length / spacing);
      const countZ = Math.floor(width / spacing);
      
      // Bars in X direction (Bottom)
      for (let i = 0; i <= countZ; i++) {
        const z = -effW / 2 + i * (effW / countZ);
        addBar(0, -effH / 2, z, length, bars.diameter);
      }
      
      // Bars in Z direction (Bottom)
      for (let i = 0; i <= countX; i++) {
        const x = -length / 2 + i * (length / countX);
        const barGeo = new THREE.CylinderGeometry(bars.diameter / 20, bars.diameter / 20, width, 8);
        const bar = new THREE.Mesh(barGeo, barMaterial);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(x, -effH / 2 + 0.5, 0); // Slightly offset to avoid z-fighting
        scene.add(bar);
      }

      // Negative Reinforcement (Top)
      if (negativeBars && negativeBars.spacing) {
        const negSpacing = negativeBars.spacing;
        const negCountX = Math.floor(length / negSpacing);
        const negCountZ = Math.floor(width / negSpacing);

        // Negative bars in X direction (Top)
        // Usually placed near supports, but for visualization we'll show a grid at the top
        for (let i = 0; i <= negCountZ; i++) {
          const z = -effW / 2 + i * (effW / negCountZ);
          addBar(0, effH / 2, z, length, negativeBars.diameter, false, true);
        }

        // Negative bars in Z direction (Top)
        for (let i = 0; i <= negCountX; i++) {
          const x = -length / 2 + i * (length / negCountX);
          const barGeo = new THREE.CylinderGeometry(negativeBars.diameter / 20, negativeBars.diameter / 20, width, 8);
          const bar = new THREE.Mesh(barGeo, negativeBarMaterial);
          bar.rotation.x = Math.PI / 2;
          bar.position.set(x, effH / 2 - 0.5, 0);
          scene.add(bar);
        }
      }
    }

    // Add Stirrups (only for beams and pillars)
    if (type !== 'slab') {
      const sSpacing = stirrups.spacing || 15;
      const sCount = Math.floor(length / sSpacing);
      for (let i = 0; i <= sCount; i++) {
        const x = -length / 2 + i * sSpacing;
        addStirrup(x, effW, effH, 5);
      }
    }

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight || 400;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [type, width, height, length, bars, stirrups]);

  return (
    <div className="w-full h-[400px] bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden relative group print:hidden">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Visualização 3D Interativa</span>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-zinc-500 font-medium">Use o mouse para rotacionar e zoom</p>
      </div>
    </div>
  );
};

// --- Calculation Memory Component ---
const CalculationMemory = ({ type, input, result }: { type: 'beam' | 'pillar' | 'slab', input: any, result: any }) => {
  if (type === 'beam') {
    const fcd = (input.fck / 1.4).toFixed(2);
    const fyd = (input.fyk / 1.15).toFixed(2);
    const d = (input.height - input.cover).toFixed(2);
    const Md = (input.load * Math.pow(input.lx / 100, 2) / 8 * 1.4).toFixed(2);
    const xi = (result.x / Number(d)).toFixed(2);
    const As_calc = result.as_calc;
    const As_min = result.as_min;
    const bars = result.bars;

    return (
      <div className="space-y-6 bg-zinc-50 p-6 md:p-8 rounded-2xl border border-zinc-100">
        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400">Memória de Cálculo (NBR 6118)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 font-mono text-[10px] md:text-xs">
          <div className="space-y-3">
            <p className="text-zinc-500">1. Resistências de Cálculo:</p>
            <p className="font-bold">fcd = fck / 1.4 = {input.fck} / 1.4 = {fcd} MPa</p>
            <p className="font-bold">fyd = fyk / 1.15 = {input.fyk} / 1.15 = {fyd} MPa</p>
          </div>
          <div className="space-y-3">
            <p className="text-zinc-500">2. Parâmetros Geométricos:</p>
            <p className="font-bold">b = {input.width} cm | h = {input.height} cm</p>
            <p className="font-bold">d = h - cob = {input.height} - {input.cover} = {d} cm</p>
          </div>
          <div className="space-y-3">
            <p className="text-zinc-500">3. Dimensionamento à Flexão:</p>
            <p className="font-bold">Md = (q * L² / 8) * 1.4 = {Md} kNm</p>
            <p className="font-bold">x/d = {xi} | As,calc = {As_calc} cm²</p>
          </div>
          <div className="space-y-3">
            <p className="text-zinc-500">4. Detalhamento:</p>
            <p className="font-bold text-emerald-600">As,final = max(As,calc; As,min) = {result.as_final} cm²</p>
            <p className="font-bold">Barras: {bars.count} Ø {bars.diameter} mm</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'pillar') {
    const fcd = (input.fck / 1.4).toFixed(2);
    const fyd = (input.fyk / 1.15).toFixed(2);
    const Ac = (input.width * input.height).toFixed(2);
    const Nd = (input.nd * 1.4).toFixed(2);

    return (
      <div className="space-y-6 bg-zinc-50 p-6 md:p-8 rounded-2xl border border-zinc-100">
        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400">Memória de Cálculo (NBR 6118)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 font-mono text-[10px] md:text-xs">
          <div className="space-y-3">
            <p className="text-zinc-500">1. Resistências e Esforços:</p>
            <p className="font-bold">fcd = fck / 1.4 = {input.fck} / 1.4 = {fcd} MPa</p>
            <p className="font-bold">fyd = fyk / 1.15 = {input.fyk} / 1.15 = {fyd} MPa</p>
            <p className="font-bold">Nd = Nk * 1.4 = {input.nd} * 1.4 = {Nd} kN</p>
          </div>
          <div className="space-y-3">
            <p className="text-zinc-500">2. Parâmetros Geométricos:</p>
            <p className="font-bold">Ac = b * h = {input.width} * {input.height} = {Ac} cm²</p>
            <p className="font-bold">As,min = 0.004 * Ac = {result.as_min} cm²</p>
          </div>
          <div className="space-y-3">
            <p className="text-zinc-500">3. Dimensionamento Axial:</p>
            <p className="font-bold">As,calc = (Nd - 0.85 * fcd * Ac) / fyd</p>
            <p className="font-bold text-blue-600">As,final = max(As,calc; As,min) = {result.as_final} cm²</p>
          </div>
          <div className="space-y-3">
            <p className="text-zinc-500">4. Detalhamento:</p>
            <p className="font-bold">Taxa ρ = As / Ac = {(result.as_final / Number(Ac) * 100).toFixed(2)}%</p>
            <p className="font-bold">Barras: {result.bars.count} Ø {result.bars.diameter} mm</p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'slab') {
    const fcd = (input.fck / 1.4).toFixed(2);
    const fyd = (input.fyk / 1.15).toFixed(2);
    const d = (input.thickness - 2.5).toFixed(2);
    const Md = (input.load * Math.pow(input.lx, 2) / 8 * 1.4).toFixed(2);

    return (
      <div className="space-y-6 bg-zinc-50 p-6 md:p-8 rounded-2xl border border-zinc-100">
        <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400">Memória de Cálculo (NBR 6118)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 font-mono text-[10px] md:text-xs">
          <div className="space-y-3">
            <p className="text-zinc-500">1. Resistências de Cálculo:</p>
            <p className="font-bold">fcd = {fcd} MPa | fyd = {fyd} MPa</p>
          </div>
          <div className="space-y-3">
            <p className="text-zinc-500">2. Parâmetros Geométricos:</p>
            <p className="font-bold">h = {input.thickness} cm | d = {d} cm</p>
          </div>
          <div className="space-y-3">
            <p className="text-zinc-500">3. Dimensionamento à Flexão:</p>
            <p className="font-bold">Md = (q * L² / 8) * 1.4 = {Md} kNm/m</p>
            <p className="font-bold text-amber-600">As,final = {result.as_final} cm²/m</p>
          </div>
          <div className="space-y-3">
            <p className="text-zinc-500">4. Verificação de Flecha:</p>
            <p className="font-bold">f = {result.deflection} mm</p>
            <p className="font-bold">f,lim = L/250 = {result.deflection_limit} mm</p>
            <p className={cn("font-bold", result.deflection_status === "Atende" ? "text-emerald-600" : "text-red-600")}>
              Status: {result.deflection_status}
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-zinc-500">5. Detalhamento:</p>
            <p className="font-bold">Armação: Ø {result.bars.diameter} c/ {result.bars.spacing} cm</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COMMON_BAR_DIAMETERS = [5, 6.3, 8, 10, 12.5, 16, 20];

function selectBars(requiredAs: number, preferredPhi?: number, minBars: number = 2, maxBars: number = 12) {
  if (preferredPhi) {
    const area = Math.PI * Math.pow(preferredPhi / 10, 2) / 4;
    const count = Math.max(minBars, Math.ceil(requiredAs / area));
    return { count, diameter: preferredPhi };
  }

  for (const phi of COMMON_BAR_DIAMETERS) {
    const area = Math.PI * Math.pow(phi / 10, 2) / 4;
    const count = Math.ceil(requiredAs / area);
    if (count >= minBars && count <= maxBars) {
      return { count, diameter: phi };
    }
  }
  // Fallback to largest if none fit the range
  const largestPhi = COMMON_BAR_DIAMETERS[COMMON_BAR_DIAMETERS.length - 1];
  const area = Math.PI * Math.pow(largestPhi / 10, 2) / 4;
  return { count: Math.ceil(requiredAs / area), diameter: largestPhi };
}

function selectSlabBars(requiredAs: number, preferredPhi?: number) {
  // requiredAs is in cm2/m
  if (preferredPhi) {
    const area = Math.PI * Math.pow(preferredPhi / 10, 2) / 4;
    const spacing = Math.floor((area / requiredAs) * 100);
    return { diameter: preferredPhi, spacing: Math.min(20, Math.max(7, spacing)) };
  }

  for (const phi of [5, 6.3, 8, 10]) {
    const area = Math.PI * Math.pow(phi / 10, 2) / 4;
    const spacing = Math.floor((area / requiredAs) * 100);
    if (spacing >= 10 && spacing <= 20) {
      return { diameter: phi, spacing };
    }
  }
  // Fallback
  const phi = 8;
  const area = Math.PI * Math.pow(phi / 10, 2) / 4;
  const spacing = Math.min(20, Math.max(7, Math.floor((area / requiredAs) * 100)));
  return { diameter: phi, spacing };
}

// --- Types ---
import { User, BeamInput, BeamResult } from './types';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, token: string, userData: User) => void;
  logout: () => void;
  isTrialExpired: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const VizBgPicker = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const presets = [
    { name: 'Dark', color: '#09090b' },
    { name: 'Gray', color: '#18181b' },
    { name: 'Light', color: '#f4f4f5' },
    { name: 'Blue', color: '#0f172a' },
    { name: 'Green', color: '#064e3b' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fundo 3D:</span>
      <div className="flex gap-2">
        {presets.map((p) => (
          <button
            key={p.color}
            onClick={() => onChange(p.color)}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all",
              value === p.color ? "border-emerald-500 scale-110" : "border-transparent"
            )}
            style={{ backgroundColor: p.color }}
            title={p.name}
          />
        ))}
        <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 bg-transparent border-none cursor-pointer"
        />
      </div>
    </div>
  );
};

// --- Components ---

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">{label}</label>
    <input 
      {...props} 
      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
    />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">{label}</label>
    <select 
      {...props} 
      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Button = ({ children, variant = 'primary', className, ...props }: any) => {
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white',
    outline: 'border border-zinc-700 hover:bg-zinc-800 text-zinc-300'
  };
  return (
    <button 
      {...props} 
      className={cn("px-6 py-2.5 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none", variants[variant as keyof typeof variants], className)}
    >
      {children}
    </button>
  );
};

// --- Beam Visualization ---
const BeamViz = ({ input, result }: { input: BeamInput, result: BeamResult }) => {
  if (!result || !result.bars) return null;
  const scale = 2.5;
  const w = input.width * scale;
  const h = input.height * scale;
  const padding = 40;
  
  // Cross-section details
  const cover = input.cover * scale;
  const stirrupRadius = 4;
  const barRadius = (result.bars.diameter / 10) * scale * 1.5;
  const topBarRadius = 1.5 * scale; // Porta-estribos (approx 6.3mm)
  
  // Longitudinal view details
  const longW = 250;
  const longH = h;
  const stirrupSpacing = 15; // cm (assumed for visualization)
  const stirrupCount = Math.floor(longW / (stirrupSpacing * scale));

  return (
    <div className="bg-zinc-900/50 rounded-xl p-4 sm:p-8 border border-zinc-800 flex flex-col items-center justify-center print:bg-white print:border-zinc-200 w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start justify-center w-full">
        {/* Cross Section */}
        <div className="flex flex-col items-center w-full lg:w-auto">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase mb-6 tracking-widest print:text-zinc-900">Seção Transversal (A-A)</h3>
          <div className="w-full max-w-[240px] flex items-center justify-center">
            <svg 
              width="100%" 
              height="auto"
              viewBox={`0 0 ${w + padding * 2} ${h + padding * 2 + 40}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Concrete Section */}
              <rect x={padding} y={padding} width={w} height={h} fill="#27272a" stroke="#3f3f46" strokeWidth="2" className="print:fill-zinc-100 print:stroke-zinc-400" />
              
              {/* Stirrup (Estribo) */}
              <rect 
                x={padding + cover} 
                y={padding + cover} 
                width={w - 2 * cover} 
                height={h - 2 * cover} 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="2" 
                rx={stirrupRadius} 
                className="print:stroke-emerald-600" 
              />
              
              {/* Top Bars (Porta-estribos) */}
              <circle cx={padding + cover + 6} cy={padding + cover + 6} r={topBarRadius} fill="#94a3b8" className="print:fill-zinc-400" />
              <circle cx={padding + w - cover - 6} cy={padding + cover + 6} r={topBarRadius} fill="#94a3b8" className="print:fill-zinc-400" />

              {/* Bottom Bars (Calculated) */}
              {Array.from({ length: result.bars.count }).map((_, i) => {
                const innerW = w - 2 * cover - 12;
                const spacing = result.bars.count > 1 ? innerW / (result.bars.count - 1) : 0;
                const x = result.bars.count === 1 ? padding + w/2 : padding + cover + 6 + i * spacing;
                return (
                  <circle 
                    key={i} 
                    cx={x} 
                    cy={padding + h - cover - 6} 
                    r={barRadius} 
                    fill="#f59e0b" 
                    className="drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] print:drop-shadow-none print:fill-amber-600" 
                  />
                );
              })}

              {/* Dimensions */}
              <text x={padding + w/2} y={padding - 15} textAnchor="middle" fill="#71717a" fontSize="10" fontWeight="bold" className="print:fill-zinc-900">{input.width} cm</text>
              <text x={padding - 15} y={padding + h/2} textAnchor="middle" fill="#71717a" fontSize="10" fontWeight="bold" transform={`rotate(-90, ${padding - 15}, ${padding + h/2})`} className="print:fill-zinc-900">{input.height} cm</text>
              
              {/* Labels below the drawing */}
              <text x={padding + w/2} y={padding + h + 20} textAnchor="middle" fill="#94a3b8" fontSize="8" className="print:fill-zinc-500">Montagem: 2 Ø 6.3</text>
              <text x={padding + w/2} y={padding + h + 35} textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold" className="print:fill-amber-600">Principal: {result.bars.count} Ø {result.bars.diameter}</text>
            </svg>
          </div>
        </div>

        {/* Longitudinal View */}
        <div className="flex flex-col items-center w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-zinc-800 pt-8 lg:pt-0 lg:pl-12 print:border-zinc-200">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase mb-6 tracking-widest print:text-zinc-900">Vista Longitudinal</h3>
          <div className="w-full max-w-[320px] flex items-center justify-center">
            <svg 
              width="100%" 
              height="auto"
              viewBox={`0 0 ${longW + padding * 2} ${longH + padding * 2 + 45}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Beam Body */}
              <rect x={padding} y={padding} width={longW} height={longH} fill="#27272a" stroke="#3f3f46" strokeWidth="2" className="print:fill-zinc-100 print:stroke-zinc-400" />
              
              {/* Top Reinforcement */}
              <line x1={padding} y1={padding + cover + 6} x2={padding + longW} y2={padding + cover + 6} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 2" className="print:stroke-zinc-400" />
              
              {/* Bottom Reinforcement */}
              <line x1={padding} y1={padding + longH - cover - 6} x2={padding + longW} y2={padding + longH - cover - 6} stroke="#f59e0b" strokeWidth="2" className="print:stroke-amber-600" />
              
              {/* Stirrups (Estribos) */}
              {Array.from({ length: stirrupCount }).map((_, i) => {
                const x = padding + 20 + i * (stirrupSpacing * scale);
                if (x > padding + longW - 20) return null;
                return (
                  <line 
                    key={i} 
                    x1={x} 
                    y1={padding + cover} 
                    x2={x} 
                    y2={padding + longH - cover} 
                    stroke="#10b981" 
                    strokeWidth="1.5" 
                    className="print:stroke-emerald-600" 
                  />
                );
              })}

              {/* Labels */}
              <text x={padding + longW/2} y={padding + longH + 20} textAnchor="middle" fill="#71717a" fontSize="9" fontWeight="bold" className="print:fill-zinc-900">Estribos: Ø 6.3 c/ 15 cm</text>
              <text x={padding + longW/2} y={padding + longH + 35} textAnchor="middle" fill="#f59e0b" fontSize="8" className="print:fill-amber-600">Armadura Longitudinal</text>
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-2xl">
        <div className="flex items-center gap-3 bg-zinc-800/30 p-3 rounded-xl border border-zinc-800 print:bg-zinc-50 print:border-zinc-100">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Estribos</span>
            <span className="text-xs text-white font-bold print:text-zinc-900">Ø 6.3mm c/ 15cm</span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-zinc-800/30 p-3 rounded-xl border border-zinc-800 print:bg-zinc-50 print:border-zinc-100">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Principal</span>
            <span className="text-xs text-white font-bold print:text-zinc-900">{result.bars.count}x Ø {result.bars.diameter}mm</span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-zinc-800/30 p-3 rounded-xl border border-zinc-800 print:bg-zinc-50 print:border-zinc-100">
          <div className="w-3 h-3 rounded-full bg-slate-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Montagem</span>
            <span className="text-xs text-white font-bold print:text-zinc-900">2x Ø 6.3mm</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Pillar Visualization ---
const PillarViz = ({ input, result }: { input: any, result: any }) => {
  const scale = 2.5;
  const w = input.width * scale;
  const h = input.height * scale;
  const padding = 40;
  
  const cover = 2.5 * scale; // Assumed cover for pillars
  const stirrupRadius = 4;
  const barRadius = (result.bars.diameter / 10) * scale * 1.5;
  
  // Longitudinal view details
  const longW = 120;
  const longH = 250;
  const stirrupSpacing = 15; // cm (assumed for visualization)
  const stirrupCount = Math.floor(longH / (stirrupSpacing * scale));

  return (
    <div className="bg-zinc-900/50 rounded-xl p-4 sm:p-8 border border-zinc-800 flex flex-col items-center justify-center print:bg-white print:border-zinc-200 w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start justify-center w-full">
        {/* Cross Section */}
        <div className="flex flex-col items-center w-full lg:w-auto">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase mb-6 tracking-widest print:text-zinc-900">Seção Transversal</h3>
          <div className="w-full max-w-[240px] flex items-center justify-center">
            <svg 
              width="100%" 
              height="auto"
              viewBox={`0 0 ${w + padding * 2} ${h + padding * 2 + 40}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Concrete Section */}
              <rect x={padding} y={padding} width={w} height={h} fill="#27272a" stroke="#3f3f46" strokeWidth="2" className="print:fill-zinc-100 print:stroke-zinc-400" />
              
              {/* Stirrup (Estribo) */}
              <rect 
                x={padding + cover} 
                y={padding + cover} 
                width={w - 2 * cover} 
                height={h - 2 * cover} 
                fill="none" 
                stroke="#3b82f6" 
                strokeWidth="2" 
                rx={stirrupRadius} 
                className="print:stroke-blue-600" 
              />
              
              {/* Longitudinal Bars */}
              {(() => {
                const bars = [];
                const count = result.bars.count;
                const bW = w - 2 * cover - 12;
                const bH = h - 2 * cover - 12;
                
                // Corners
                bars.push(<circle key="c1" cx={padding + cover + 6} cy={padding + cover + 6} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                bars.push(<circle key="c2" cx={padding + w - cover - 6} cy={padding + cover + 6} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                bars.push(<circle key="c3" cx={padding + cover + 6} cy={padding + h - cover - 6} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                bars.push(<circle key="c4" cx={padding + w - cover - 6} cy={padding + h - cover - 6} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);

                if (count > 4) {
                  const remaining = count - 4;
                  // Distribute remaining bars along the perimeter
                  // We want an even distribution. If remaining is 2, put them on the longer sides.
                  // If remaining is 4, put one on each side.
                  
                  const isHorizontalLonger = w >= h;
                  
                  if (remaining === 2) {
                    if (isHorizontalLonger) {
                      // One on top, one on bottom
                      const x = padding + w / 2;
                      bars.push(<circle key="t1" cx={x} cy={padding + cover + 6} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                      bars.push(<circle key="b1" cx={x} cy={padding + h - cover - 6} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                    } else {
                      // One on left, one on right
                      const y = padding + h / 2;
                      bars.push(<circle key="l1" cx={padding + cover + 6} cy={y} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                      bars.push(<circle key="r1" cx={padding + w - cover - 6} cy={y} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                    }
                  } else {
                    // For 4 or more, distribute proportionally
                    const nx = isHorizontalLonger ? Math.ceil(remaining * (w / (w + h)) / 2) : Math.floor(remaining * (w / (w + h)) / 2);
                    const ny = (remaining / 2) - nx;

                    for (let i = 1; i <= nx; i++) {
                      const x = padding + cover + 6 + (i * bW / (nx + 1));
                      bars.push(<circle key={`t${i}`} cx={x} cy={padding + cover + 6} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                      bars.push(<circle key={`b${i}`} cx={x} cy={padding + h - cover - 6} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                    }
                    for (let i = 1; i <= ny; i++) {
                      const y = padding + cover + 6 + (i * bH / (ny + 1));
                      bars.push(<circle key={`l${i}`} cx={padding + cover + 6} cy={y} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                      bars.push(<circle key={`r${i}`} cx={padding + w - cover - 6} cy={y} r={barRadius} fill="#f59e0b" className="print:fill-amber-600" />);
                    }
                  }
                }
                return bars;
              })()}

              {/* Dimensions */}
              <text x={padding + w/2} y={padding - 15} textAnchor="middle" fill="#71717a" fontSize="10" fontWeight="bold" className="print:fill-zinc-900">{input.width} cm</text>
              <text x={padding - 15} y={padding + h/2} textAnchor="middle" fill="#71717a" fontSize="10" fontWeight="bold" transform={`rotate(-90, ${padding - 15}, ${padding + h/2})`} className="print:fill-zinc-900">{input.height} cm</text>
              
              {/* Label below */}
              <text x={padding + w/2} y={padding + h + 25} textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold" className="print:fill-amber-600">{result.bars.count} Ø {result.bars.diameter} (Longitudinal)</text>
            </svg>
          </div>
        </div>

        {/* Longitudinal View (Elevation) */}
        <div className="flex flex-col items-center w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-zinc-800 pt-8 lg:pt-0 lg:pl-12 print:border-zinc-200">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase mb-6 tracking-widest print:text-zinc-900">Vista Longitudinal (Elevação)</h3>
          <div className="w-full max-w-[180px] flex items-center justify-center">
            <svg 
              width="100%" 
              height="auto"
              viewBox={`0 0 ${longW + padding * 2} ${longH + padding * 2 + 40}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Pillar Body */}
              <rect x={padding} y={padding} width={longW} height={longH} fill="#27272a" stroke="#3f3f46" strokeWidth="2" className="print:fill-zinc-100 print:stroke-zinc-400" />
              
              {/* Longitudinal Bars */}
              <line x1={padding + cover + 6} y1={padding} x2={padding + cover + 6} y2={padding + longH} stroke="#f59e0b" strokeWidth="2" className="print:stroke-amber-600" />
              <line x1={padding + longW - cover - 6} y1={padding} x2={padding + longW - cover - 6} y2={padding + longH} stroke="#f59e0b" strokeWidth="2" className="print:stroke-amber-600" />
              
              {/* Stirrups (Estribos) */}
              {Array.from({ length: stirrupCount }).map((_, i) => {
                const y = padding + 20 + i * (stirrupSpacing * scale);
                if (y > padding + longH - 20) return null;
                return (
                  <line 
                    key={i} 
                    x1={padding + cover} 
                    y1={y} 
                    x2={padding + longW - cover} 
                    y2={y} 
                    stroke="#3b82f6" 
                    strokeWidth="1.5" 
                    className="print:stroke-blue-600" 
                  />
                );
              })}

              {/* Labels */}
              <text x={padding + longW/2} y={padding + longH + 20} textAnchor="middle" fill="#71717a" fontSize="9" fontWeight="bold" className="print:fill-zinc-900">Estribos: Ø 5.0 c/ 15 cm</text>
              <text x={padding + longW + 15} y={padding + longH/2} textAnchor="middle" fill="#71717a" fontSize="9" fontWeight="bold" transform={`rotate(90, ${padding + longW + 15}, ${padding + longH/2})`} className="print:fill-zinc-900">Altura do Pilar</text>
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-xl">
        <div className="flex items-center gap-3 bg-zinc-800/30 p-3 rounded-xl border border-zinc-800 print:bg-zinc-50 print:border-zinc-100">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Estribos</span>
            <span className="text-xs text-white font-bold print:text-zinc-900">Ø 5.0mm c/ 15cm</span>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-zinc-800/30 p-3 rounded-xl border border-zinc-800 print:bg-zinc-50 print:border-zinc-100">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Longitudinal</span>
            <span className="text-xs text-white font-bold print:text-zinc-900">{result.bars.count}x Ø {result.bars.diameter}mm</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Slab Visualization ---
const SlabViz = ({ input, result }: { input: any, result: any }) => {
  if (!result || !result.bars) return null;
  const scale = 5;
  const h = input.thickness * scale;
  const w = 200;
  const padding = 40;
  
  // Plan view dimensions
  const planScale = 15;
  const planW = Math.min(input.lx * planScale, 150);
  const planH = Math.min(input.ly * planScale, 150);
  
  return (
    <div className="bg-zinc-900/50 rounded-xl p-4 sm:p-6 border border-zinc-800 flex flex-col items-center justify-center print:bg-white print:border-zinc-200 w-full overflow-hidden">
      <div className="flex flex-col gap-8 items-center w-full">
        {/* Planta */}
        <div className="flex flex-col items-center w-full max-w-[250px]">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase mb-4 tracking-widest print:text-zinc-900">Planta da Laje (Dimensões)</h3>
          <div className="w-full flex items-center justify-center">
            <svg width="100%" height="auto" viewBox={`0 0 ${planW + padding * 2} ${planH + padding * 2}`} preserveAspectRatio="xMidYMid meet">
              <rect x={padding} y={padding} width={planW} height={planH} fill="#27272a" stroke="#3f3f46" strokeWidth="2" className="print:fill-zinc-100 print:stroke-zinc-400" />
              
              {/* Lx Label */}
              <line x1={padding} y1={padding - 10} x2={padding + planW} y2={padding - 10} stroke="#71717a" strokeWidth="1" />
              <line x1={padding} y1={padding - 15} x2={padding} y2={padding - 5} stroke="#71717a" strokeWidth="1" />
              <line x1={padding + planW} y1={padding - 15} x2={padding + planW} y2={padding - 5} stroke="#71717a" strokeWidth="1" />
              <text x={padding + planW/2} y={padding - 15} textAnchor="middle" fill="#71717a" fontSize="8" fontWeight="bold" className="print:fill-zinc-900">Lx = {input.lx} m</text>
              
              {/* Ly Label */}
              <line x1={padding - 10} y1={padding} x2={padding - 10} y2={padding + planH} stroke="#71717a" strokeWidth="1" />
              <line x1={padding - 15} y1={padding} x2={padding - 5} y2={padding} stroke="#71717a" strokeWidth="1" />
              <line x1={padding - 15} y1={padding + planH} x2={padding - 5} y2={padding + planH} stroke="#71717a" strokeWidth="1" />
              <text x={padding - 20} y={padding + planH/2} textAnchor="middle" fill="#71717a" fontSize="8" fontWeight="bold" transform={`rotate(-90, ${padding - 20}, ${padding + planH/2})`} className="print:fill-zinc-900">Ly = {input.ly} m</text>
            </svg>
          </div>
        </div>

        {/* Corte */}
        <div className="flex flex-col items-center border-t border-zinc-800 pt-6 w-full print:border-zinc-200">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase mb-4 tracking-widest print:text-zinc-900">Corte da Laje (Espessura)</h3>
          <div className="w-full max-w-[300px] flex items-center justify-center">
            <svg width="100%" height="auto" viewBox={`0 0 ${w + padding * 2} ${h + padding * 2 + 40}`} preserveAspectRatio="xMidYMid meet">
              <rect x={padding} y={padding} width={w} height={h} fill="#27272a" stroke="#3f3f46" strokeWidth="2" className="print:fill-zinc-100 print:stroke-zinc-400" />
              
              {/* Reinforcement Bars (Positive) */}
              {Array.from({ length: 6 }).map((_, i) => (
                <circle key={i} cx={padding + 20 + i * 32} cy={padding + h - 10} r={3} fill="#f59e0b" className="print:fill-amber-600" />
              ))}
              <line x1={padding + 10} y1={padding + h - 10} x2={padding + w - 10} y2={padding + h - 10} stroke="#f59e0b" strokeWidth="1" className="print:stroke-amber-600" />

              {/* Reinforcement Bars (Negative) */}
              {result.as_neg > 0 && (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <circle key={`neg-${i}`} cx={padding + 20 + i * 32} cy={padding + 10} r={3} fill="#f87171" className="print:fill-red-600" />
                  ))}
                  <line x1={padding + 10} y1={padding + 10} x2={padding + w - 10} y2={padding + 10} stroke="#f87171" strokeWidth="1" className="print:stroke-red-600" />
                </>
              )}

              <text x={padding + w/2} y={padding + h + 20} textAnchor="middle" fill="#71717a" fontSize="10" fontWeight="bold" className="print:fill-zinc-900">Armação: Ø {result.bars.diameter} c/ {result.bars.spacing} cm</text>
              {result.as_neg > 0 && (
                <text x={padding + w/2} y={padding + h + 35} textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold" className="print:fill-red-600">Negativa: Ø {result.negativeBars.diameter} c/ {result.negativeBars.spacing} cm</text>
              )}
              <text x={padding - 10} y={padding + h/2} textAnchor="middle" fill="#71717a" fontSize="10" fontWeight="bold" transform={`rotate(-90, ${padding - 10}, ${padding + h/2})`} className="print:fill-zinc-900">{input.thickness} cm</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'menu' | 'calc' | 'pillar' | 'slab' | 'admin' | 'login' | 'register' | 'beam_report' | 'pillar_report' | 'slab_report' | 'forgot_password' | 'history'>('menu');
  const [vizBgColor, setVizBgColor] = useState('#09090b');
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [input, setInput] = useState<any>({
    lx: '400',
    load: '10',
    width: '15',
    height: '40',
    fck: '25',
    fyk: '500',
    cover: '2.5',
    preferredDiameter: 12.5
  });

  const [pillarInput, setPillarInput] = useState<any>({
    width: '20',
    height: '20',
    fck: '25',
    fyk: '500',
    nd: '500',
    md: '20',
    preferredDiameter: 12.5
  });

  const [slabInput, setSlabInput] = useState<any>({
    lx: '4',
    ly: '5',
    fck: '25',
    fyk: '500',
    load: '5',
    thickness: '10',
    md_neg: '0',
    preferredDiameter: 8
  });

  const [result, setResult] = useState<BeamResult | null>(null);
  const [pillarResult, setPillarResult] = useState<any>(null);
  const [slabResult, setSlabResult] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [isPublicView, setIsPublicView] = useState(false);
  const [currentReportShareId, setCurrentReportShareId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    if (shareId) {
      fetchPublicReport(shareId);
    }
  }, []);

  const fetchPublicReport = async (shareId: string) => {
    try {
      const res = await fetch(`/api/public/reports/${shareId}`);
      if (res.ok) {
        const report = await res.json();
        setIsPublicView(true);
        if (report.type === 'beam') {
          setInput(report.input_data);
          setResult(report.result_data);
          setView('beam_report');
        } else if (report.type === 'pillar') {
          setPillarInput(report.input_data);
          setPillarResult(report.result_data);
          setView('pillar_report');
        } else if (report.type === 'slab') {
          setSlabInput(report.input_data);
          setSlabResult(report.result_data);
          setView('slab_report');
        }
      } else {
        showToast('Relatório público não encontrado ou expirado', 'error');
      }
    } catch (error) {
      console.error('Error fetching public report:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          const { serverTime: st, ...userData } = data;
          setUser(userData);
          setServerTime(st);
          if (view === 'login' || view === 'register') setView('menu');
          fetchReports();
        }
        else setToken(null);
        setIsAuthReady(true);
      });
    } else {
      setIsAuthReady(true);
      if (!new URLSearchParams(window.location.search).get('share')) {
        setView('login');
      }
    }
  }, [token]);

  useEffect(() => {
    if (view === 'admin') {
      fetchAdminUsers();
      fetchAdminNotifications();
    }
  }, [view]);

  const HistoryView = () => {
    return (
      <motion.div 
        key="history"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between print:hidden">
          <button onClick={() => setView('menu')} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-medium">
            <X className="w-4 h-4" /> Voltar ao Menu
          </button>
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <History className="w-6 h-6 text-emerald-500" />
            Histórico de Relatórios
          </h2>
        </div>

        {loadingReports ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-xl font-bold text-white">Nenhum relatório salvo</h3>
            <p className="text-zinc-500 max-w-sm mx-auto">Você ainda não salvou nenhum cálculo. Realize um dimensionamento e clique em "Salvar Relatório" para vê-lo aqui.</p>
            <button onClick={() => setView('calc')} className="text-emerald-500 font-bold text-sm uppercase tracking-widest hover:underline">Iniciar Cálculo</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-zinc-700 transition-all group">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    report.type === 'beam' ? "bg-emerald-500/10 text-emerald-500" :
                    report.type === 'pillar' ? "bg-blue-500/10 text-blue-500" :
                    "bg-amber-500/10 text-amber-500"
                  )}>
                    {report.type === 'beam' ? <Calculator className="w-6 h-6" /> :
                     report.type === 'pillar' ? <ShieldCheck className="w-6 h-6" /> :
                     <Menu className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{report.title}</h4>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">
                      {new Date(report.created_at).toLocaleDateString()} às {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <button 
                    onClick={() => {
                      if (report.type === 'beam') {
                        setInput(report.input_data);
                        setResult(report.result_data);
                        setCurrentReportShareId(report.share_id);
                        setView('beam_report');
                      } else if (report.type === 'pillar') {
                        setPillarInput(report.input_data);
                        setPillarResult(report.result_data);
                        setCurrentReportShareId(report.share_id);
                        setView('pillar_report');
                      } else if (report.type === 'slab') {
                        setSlabInput(report.input_data);
                        setSlabResult(report.result_data);
                        setCurrentReportShareId(report.share_id);
                        setView('slab_report');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-all"
                  >
                    <FileText className="w-4 h-4" /> Abrir
                  </button>
                  <button 
                    onClick={() => shareReport(report.share_id)}
                    className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors"
                    title="Compartilhar Relatório"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => {
                      deleteReport(report.id);
                    }}
                    className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                    title="Excluir Relatório"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const login = (email: string, token: string, userData: User, st: string) => {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(userData);
    setServerTime(st);
    // Use a small timeout to ensure state updates are processed and view transition is smooth
    setTimeout(() => {
      setView('menu');
      showToast('Você está logado!');
    }, 50);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setView('login');
    showToast('Você foi deslogado!');
  };

  const isTrialExpired = () => {
    if (!user || !serverTime) return false;
    if (user.role === 'admin' || user.access_granted) return false;
    const start = new Date(user.trial_start).getTime();
    const now = new Date(serverTime).getTime();
    const diff = (now - start) / (1000 * 60 * 60 * 24);
    return diff > 7;
  };

  const calculate = () => {
    const fcd = Number(input.fck) / 1.4; // MPa
    const fyd = Number(input.fyk) / 1.15; // MPa
    const d = Number(input.height) - Number(input.cover); // cm
    const b = Number(input.width);
    const L = Number(input.lx) / 100; // m
    const q = Number(input.load); // kN/m
    
    // Simple span moment (qL²/8)
    const M_pos = (q * L * L) / 8; // kNm
    const Md = M_pos * 1.4; // kNm
    
    // Dimensionless moment
    const mu = (Md * 100) / (b * d * d * (fcd / 10));
    
    if (mu > 0.372) {
      setResult({
        is_over_reinforced: true,
        as_calc: 0,
        as_min: 0,
        as_final: 0,
        x: 0,
        bars: { count: 0, diameter: 0 }
      });
      return;
    }

    const xi = 1.25 * (1 - Math.sqrt(1 - 2 * mu));
    const As_calc = (Md * 100) / (fyd / 10 * d * (1 - 0.4 * xi));
    const As_min = 0.0015 * b * Number(input.height);
    const As_final = Math.max(As_calc, As_min);
    
    const bars = selectBars(As_final, input.preferredDiameter);

    setResult({
      as_calc: Number(As_calc.toFixed(2)),
      as_min: Number(As_min.toFixed(2)),
      as_final: Number(As_final.toFixed(2)),
      x: Number((xi * d).toFixed(2)),
      is_over_reinforced: false,
      bars
    });
  };

  const calculatePillar = () => {
    // NBR 6118 Pillar calculation (Axial + Moment)
    const fck = Number(pillarInput.fck);
    const fyk = Number(pillarInput.fyk);
    const b = Number(pillarInput.width);
    const h = Number(pillarInput.height);
    const Nd = Number(pillarInput.nd);
    const Md = Number(pillarInput.md);
    
    const fcd = fck / 1.4;
    const fyd = fyk / 1.15;
    const Ac = b * h;
    
    // Minimum eccentricity (NBR 6118)
    const emin = 0.015 + 0.03 * (h / 100); // m
    const Md_min = Nd * emin;
    const Md_calc = Math.max(Md, Md_min);

    // Simplified interaction for symmetric reinforcement
    // We use an equivalent axial load approach for a quick estimate
    // Nd_eq = Nd + k * Md / h
    const Nd_eq = Nd + (1.2 * Md_calc / (h / 100));
    
    // Concrete capacity (accounting for the 0.85 factor for long term loads)
    const concreteCapacity = 0.85 * (fcd / 10) * Ac;
    
    // Check if section is too small
    if (Nd > concreteCapacity * 2.0) {
      setPillarResult({
        as_final: 0,
        as_min: 0,
        is_error: true,
        error_message: "Seção de concreto insuficiente para a carga axial! Aumente as dimensões ou o fck.",
        bars: { count: 0, diameter: 0 }
      });
      return;
    }

    // Min reinforcement (NBR 6118: max(0.15*Nd/fyd, 0.4% Ac))
    const As_min_abs = 0.004 * Ac;
    const As_min_load = (0.15 * Nd) / (fyd / 10);
    const As_min = Math.max(As_min_abs, As_min_load);
    
    // Required steel
    const As_req = (Nd_eq - concreteCapacity) / (fyd / 10);
    const As_final = Math.max(As_req, As_min);
    
    // For pillars, we want an even number of bars (min 4)
    let bars = selectBars(As_final, pillarInput.preferredDiameter, 4); 
    if (bars.count % 2 !== 0) {
      bars.count += 1;
    }

    setPillarResult({
      as_final: Number(As_final.toFixed(2)),
      as_min: Number(As_min.toFixed(2)),
      is_error: false,
      bars
    });
  };

  const calculateSlab = () => {
    const fck = Number(slabInput.fck);
    const fyk = Number(slabInput.fyk);
    const h = Number(slabInput.thickness);
    const fcd = fck / 1.4;
    const fyd = fyk / 1.15;
    const d = h - 2.5;
    const lx = Number(slabInput.lx);
    const ly = Number(slabInput.ly);
    const q = Number(slabInput.load);

    // Simplified moment for single span (one-way or two-way simplified)
    // Using lx as the main span
    const M_pos = (q * lx * lx) / 8; // kNm/m
    const Md_pos = M_pos * 1.4;

    const mu_pos = (Md_pos * 100) / (100 * d * d * (fcd / 10));
    const xi_pos = 1.25 * (1 - Math.sqrt(1 - Math.max(0, 1 - 2 * mu_pos)));
    const As_calc_pos = (Md_pos * 100) / (fyd / 10 * d * (1 - 0.4 * xi_pos));
    const As_min = 0.0015 * 100 * h;
    const As_final_pos = Math.max(As_calc_pos, As_min);

    // Negative reinforcement calculation
    const Md_neg = Number(slabInput.md_neg) * 1.4;
    let As_final_neg = 0;
    let negativeBars = null;

    if (Md_neg > 0) {
      const mu_neg = (Md_neg * 100) / (100 * d * d * (fcd / 10));
      const xi_neg = 1.25 * (1 - Math.sqrt(1 - Math.max(0, 1 - 2 * mu_neg)));
      const As_calc_neg = (Md_neg * 100) / (fyd / 10 * d * (1 - 0.4 * xi_neg));
      As_final_neg = Math.max(As_calc_neg, As_min);
      negativeBars = selectSlabBars(As_final_neg, slabInput.preferredDiameter);
    }

    // Deflection check (NBR 6118)
    const Ecs = 0.85 * 5600 * Math.sqrt(fck); // MPa
    const deflection = (60 * q * Math.pow(lx, 4) * 1000000) / (384 * Ecs * Math.pow(h, 3)); // mm
    const deflection_limit = (lx * 1000) / 250;

    setSlabResult({
      as_final: Number(As_final_pos.toFixed(2)),
      as_neg: Number(As_final_neg.toFixed(2)),
      as_min: Number(As_min.toFixed(2)),
      deflection: Number(deflection.toFixed(2)),
      deflection_limit: Number(deflection_limit.toFixed(2)),
      deflection_status: deflection <= deflection_limit ? "Atende" : "Não Atende",
      is_error: false,
      bars: selectSlabBars(As_final_pos, slabInput.preferredDiameter),
      negativeBars
    });
  };

  const fetchAdminUsers = async () => {
    const res = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setAdminUsers(await res.json());
  };

  const fetchAdminNotifications = async () => {
    const res = await fetch('/api/admin/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setAdminNotifications(await res.json());
  };

  const markNotificationRead = async (id: number) => {
    await fetch('/api/admin/mark-notification-read', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ id })
    });
    fetchAdminNotifications();
  };

  const requestAccess = async () => {
    const subject = encodeURIComponent('Solicitação de Acesso - VigaPro');
    const body = encodeURIComponent(`Olá Administrador,\n\nGostaria de solicitar a liberação de acesso total para minha conta no VigaPro.\n\nE-mail da conta: ${user?.email}\n\nObrigado!`);
    window.location.href = `mailto:patricioaug@gmail.com?subject=${subject}&body=${body}`;
    
    // Still call the API to log the request in the admin panel
    try {
      await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error("API log error:", e);
    }
  };

  const toggleAccess = async (userId: number, access: boolean) => {
    await fetch('/api/admin/toggle-access', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ userId, access })
    });
    fetchAdminUsers();
  };

  const liberateAllPending = async () => {
    const pendingUsers = adminUsers.filter((u: any) => !u.access_granted && u.role !== 'admin');
    if (pendingUsers.length === 0) {
      showToast('Nenhum usuário pendente.');
      return;
    }
    
    for (const u of pendingUsers) {
      await fetch('/api/admin/toggle-access', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ userId: u.id, access: true })
      });
    }
    fetchAdminUsers();
    showToast(`${pendingUsers.length} usuários liberados!`);
  };

  const fetchReports = async () => {
    if (!token) return;
    setLoadingReports(true);
    try {
      const res = await fetch('/api/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      } else if (res.status === 401) {
        logout();
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const saveReport = async (type: string, title: string, inputData: any, resultData: any) => {
    if (!token) return;
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ type, title, input_data: inputData, result_data: resultData })
      });
      if (res.ok) {
        const data = await res.json();
        showToast('Relatório salvo com sucesso!');
        setCurrentReportShareId(data.share_id);
        fetchReports();
      } else if (res.status === 401) {
        showToast('Sessão expirada. Por favor, faça login novamente.', 'error');
        logout();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao salvar relatório', 'error');
      }
    } catch (error) {
      showToast('Erro ao salvar relatório', 'error');
    }
  };

  const deleteReport = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Relatório excluído!');
        fetchReports();
      } else if (res.status === 401) {
        logout();
      }
    } catch (error) {
      showToast('Erro ao excluir relatório', 'error');
    }
  };

  const shareReport = (shareId: string) => {
    if (!shareId) {
      showToast('Este relatório ainda não pode ser compartilhado. Salve-o primeiro.', 'error');
      return;
    }
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Relatório Estrutural - VigaPro',
        text: 'Confira este dimensionamento estrutural realizado no VigaPro.',
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl);
      showToast('Link de compartilhamento copiado para a área de transferência!');
    }
  };

  if (!isAuthReady) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  if (isTrialExpired()) {
    const daysRemaining = Math.max(0, Math.ceil(7 - (new Date(serverTime || '').getTime() - new Date(user?.trial_start || '').getTime()) / (1000 * 60 * 60 * 24)));
    
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Período de Teste Expirado</h2>
            <p className="text-zinc-400">Seu acesso gratuito de 7 dias terminou. Para continuar utilizando o Calculador de Vigas Pro, clique no botão abaixo para solicitar a liberação ao administrador.</p>
          </div>
          <div className="space-y-3">
            <Button onClick={requestAccess} className="w-full bg-emerald-600 hover:bg-emerald-500">Solicitar Liberação de Acesso</Button>
            <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700 flex items-center justify-center gap-3">
              <Mail className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-zinc-300 font-medium">patricioaug@gmail.com</span>
            </div>
          </div>
          <Button onClick={logout} variant="outline" className="w-full">Sair da Conta</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30 print:bg-white print:text-black print:overflow-visible">
      {/* Navigation - Hidden on print and public view */}
      {!isPublicView && (
        <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50 print:hidden">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => setView('menu')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-lg font-bold tracking-tight">VigaPro</h1>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Structural Engine</p>
              </div>
            </button>

            <div className="flex items-center gap-4">
              {user?.role === 'admin' && (
                <button 
                  onClick={() => setView(view === 'admin' ? 'menu' : 'admin')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    view === 'admin' ? "bg-emerald-500/10 text-emerald-500" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-sm font-medium hidden sm:inline">Admin</span>
                </button>
              )}
              <button 
                onClick={() => { setView('history'); fetchReports(); }} 
                className={cn(
                  "p-2 transition-colors",
                  view === 'history' ? "text-emerald-500" : "text-zinc-400 hover:text-white"
                )}
                title="Histórico de Relatórios"
              >
                <History className="w-5 h-5" />
              </button>
              <button onClick={() => setShowHelp(true)} className="p-2 text-zinc-400 hover:text-white transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button onClick={logout} className="p-2 text-zinc-400 hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 print:p-0 print:max-w-none print:m-0 print:block print:static print:overflow-visible">
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 print:hidden"
            >
              <div className={cn(
                "px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl",
                toast.type === 'success' 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              )}>
                {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="text-sm font-bold uppercase tracking-widest">{toast.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHelp && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 print:hidden">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHelp(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
              >
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <HelpCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Guia de Ajuda</h2>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Como utilizar o CalcEstrutural</p>
                    </div>
                  </div>
                  <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 md:p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      O que o App calcula?
                    </h3>
                    <div className="grid gap-4">
                      <div className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                        <p className="text-sm font-bold text-white mb-1">Vigas de Concreto</p>
                        <p className="text-xs text-zinc-400 leading-relaxed">Dimensionamento completo de armadura longitudinal para vigas retangulares sob flexão simples, seguindo as recomendações da NBR 6118.</p>
                      </div>
                      <div className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                        <p className="text-sm font-bold text-white mb-1">Pilares</p>
                        <p className="text-xs text-zinc-400 leading-relaxed">Cálculo de armadura para pilares sob flexão composta, incluindo verificação automática de esbeltez e efeitos de segunda ordem.</p>
                      </div>
                      <div className="p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
                        <p className="text-sm font-bold text-white mb-1">Lajes</p>
                        <p className="text-xs text-zinc-400 leading-relaxed">Dimensionamento de lajes maciças, com verificação de flecha imediata e detalhamento da malha de aço necessária.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Passo a Passo
                    </h3>
                    <div className="space-y-4">
                      {[
                        { step: "01", title: "Escolha o Módulo", desc: "No menu principal, selecione se deseja calcular uma Viga, Pilar ou Laje." },
                        { step: "02", title: "Insira os Dados", desc: "Preencha as dimensões geométricas (largura, altura, vão) e as propriedades dos materiais (fck do concreto e fyk do aço)." },
                        { step: "03", title: "Defina os Esforços", desc: "Informe as cargas solicitantes, como momentos fletores e cargas axiais de cálculo." },
                        { step: "04", title: "Calcule e Analise", desc: "Clique no botão de calcular para ver os resultados, detalhamento gráfico e verificações de norma." },
                        { step: "05", title: "Gere o Relatório", desc: "Utilize a opção 'Ver Relatório' para visualizar um documento técnico pronto para impressão." }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4">
                          <span className="text-lg font-black text-zinc-700 tabular-nums">{item.step}</span>
                          <div>
                            <p className="text-sm font-bold text-white">{item.title}</p>
                            <p className="text-xs text-zinc-500">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Aviso Importante</p>
                      <p className="text-[11px] text-amber-200/70 leading-relaxed">
                        Este aplicativo é uma ferramenta de auxílio para agilizar cálculos estruturais e <strong>não substitui</strong> a análise, verificação e responsabilidade técnica de um engenheiro civil qualificado. Sempre valide os resultados com as normas técnicas vigentes (NBR 6118).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-zinc-900/80 border-t border-zinc-800">
                  <Button onClick={() => setShowHelp(false)} className="w-full" variant="primary">Entendi, vamos calcular!</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {view === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {user && !user.access_granted && user.role !== 'admin' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-bold text-amber-500 uppercase tracking-widest">Versão Trial</p>
                      <p className="text-xs text-amber-200/60">
                        Restam <strong>{Math.max(0, Math.ceil(7 - (new Date(serverTime || '').getTime() - new Date(user.trial_start).getTime()) / (1000 * 60 * 60 * 24)))} dias</strong> de acesso gratuito.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 font-bold uppercase">Expira em</p>
                      <p className="text-sm font-bold text-white">
                        {Math.max(0, Math.ceil(7 - (new Date(serverTime || '').getTime() - new Date(user.trial_start).getTime()) / (1000 * 60 * 60 * 24)))} dias
                      </p>
                    </div>
                    <Button onClick={requestAccess} size="sm" variant="secondary">Solicitar Liberação</Button>
                  </div>
                </div>
              )}
              <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
                <h2 className="text-4xl font-bold text-white tracking-tight">O que vamos calcular hoje?</h2>
                <p className="text-zinc-400">Selecione um dos módulos abaixo para iniciar seu dimensionamento estrutural profissional.</p>
                <div className="pt-4">
                  <button 
                    onClick={() => setShowHelp(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-2xl transition-all border border-zinc-700/50 text-sm font-bold uppercase tracking-widest"
                  >
                    <HelpCircle className="w-4 h-4" /> Guia de Ajuda
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button 
                  onClick={() => { setView('calc'); setShowReport(false); }}
                  className="group bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-left hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Calculator className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Vigas de Concreto</h3>
                  <p className="text-zinc-500 text-sm mb-6 leading-relaxed">Dimensionamento de armadura longitudinal para vigas retangulares sob flexão simples (NBR 6118).</p>
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                    Acessar Módulo <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                <button 
                  onClick={() => { setView('pillar'); setShowReport(false); }}
                  className="group bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-left hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Pilares</h3>
                  <p className="text-zinc-500 text-sm mb-6 leading-relaxed">Dimensionamento de pilares sob flexão composta e verificação de esbeltez.</p>
                  <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest">
                    Acessar Módulo <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                <button 
                  onClick={() => { setView('slab'); setShowReport(false); }}
                  className="group bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-left hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Menu className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Lajes</h3>
                  <p className="text-zinc-500 text-sm mb-6 leading-relaxed">Cálculo de lajes maciças.</p>
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-widest">
                    Acessar Módulo <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                <button 
                  onClick={() => { setView('history'); fetchReports(); }}
                  className="group bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-left hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  <div className="w-14 h-14 bg-zinc-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <History className="w-8 h-8 text-zinc-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Histórico</h3>
                  <p className="text-zinc-500 text-sm mb-6 leading-relaxed">Acesse seus relatórios salvos e gerencie seu histórico de dimensionamentos.</p>
                  <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs uppercase tracking-widest">
                    Ver Histórico <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {view === 'history' && <HistoryView />}

          {view === 'pillar' && (
            <motion.div 
              key="pillar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4 print:hidden">
                <button onClick={() => { setView('menu'); setShowReport(false); }} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-medium">
                  <X className="w-4 h-4" /> Voltar ao Menu
                </button>
                {pillarResult && !pillarResult.is_error && (
                  <div className="flex gap-3">
                    <Button onClick={() => setView('pillar_report')} variant="secondary">Ver Relatório</Button>
                  </div>
                )}
              </div>

              <div className="grid lg:grid-cols-12 gap-8 print:block">
                <div className="lg:col-span-4 space-y-6 print:hidden">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                      <ShieldCheck className="w-5 h-5 text-blue-500" />
                      <h2 className="font-bold text-white">Parâmetros do Pilar</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Largura (cm)" type="number" value={pillarInput.width} onChange={(e: any) => setPillarInput({...pillarInput, width: e.target.value})} />
                      <Input label="Altura (cm)" type="number" value={pillarInput.height} onChange={(e: any) => setPillarInput({...pillarInput, height: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="fck (MPa)" type="number" value={pillarInput.fck} onChange={(e: any) => setPillarInput({...pillarInput, fck: e.target.value})} />
                      <Input label="fyk (MPa)" type="number" value={pillarInput.fyk} onChange={(e: any) => setPillarInput({...pillarInput, fyk: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Carga Axial Nd (kN)" type="number" value={pillarInput.nd} onChange={(e: any) => setPillarInput({...pillarInput, nd: e.target.value})} />
                      <Input label="Momento Md (kNm)" type="number" value={pillarInput.md} onChange={(e: any) => setPillarInput({...pillarInput, md: e.target.value})} />
                    </div>
                    <Select 
                      label="Bitola Preferencial (mm)" 
                      value={pillarInput.preferredDiameter} 
                      onChange={(e: any) => setPillarInput({...pillarInput, preferredDiameter: Number(e.target.value)})}
                      options={COMMON_BAR_DIAMETERS.map(d => ({ label: `${d} mm`, value: d }))}
                    />
                    <Button onClick={calculatePillar} className="w-full bg-blue-600 hover:bg-blue-500">Calcular Pilar</Button>
                    
                    {pillarResult && !pillarResult.is_error && (
                      <div className="pt-4 border-t border-zinc-800">
                        <VizBgPicker value={vizBgColor} onChange={setVizBgColor} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                  {pillarResult ? (
                    <div className="grid gap-6">
                      <div className="space-y-6 print:hidden">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
                          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Resultados do Pilar</h3>
                          
                          {pillarResult.is_error ? (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-sm text-red-200">{pillarResult.error_message}</p>
                            </div>
                          ) : (
                            <div className="grid md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                  <span className="text-zinc-400">Área de Aço Total</span>
                                  <span className="text-3xl font-bold text-white">{pillarResult.as_final} cm²</span>
                                </div>
                                <div className="h-px bg-zinc-800" />
                                <p className="text-sm text-zinc-500">Armadura mínima calculada: {pillarResult.as_min} cm²</p>
                              </div>
                              <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-2xl">
                                <h4 className="font-bold text-white mb-2">Detalhamento</h4>
                                <p className="text-2xl font-bold text-white">{pillarResult.bars.count} Ø {pillarResult.bars.diameter} mm</p>
                                <p className="text-xs text-zinc-400 mt-2">Distribuídos uniformemente na seção.</p>
                              </div>
                            </div>
                          )}
                        </div>
                        {!pillarResult.is_error && (
                          <div className="space-y-6">
                            <PillarViz input={pillarInput} result={pillarResult} />
                            <Reinforcement3D 
                              type="pillar" 
                              width={pillarInput.width} 
                              height={pillarInput.height} 
                              bars={pillarResult.bars} 
                              stirrups={{ spacing: 15 }} 
                              backgroundColor={vizBgColor}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[300px] bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500">
                      Aguardando cálculos...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'slab' && (
            <motion.div 
              key="slab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4 print:hidden">
                <button onClick={() => { setView('menu'); setShowReport(false); }} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-medium">
                  <X className="w-4 h-4" /> Voltar ao Menu
                </button>
                {slabResult && !slabResult.is_error && (
                  <div className="flex gap-3">
                    <Button onClick={() => setView('slab_report')} variant="secondary">Ver Relatório</Button>
                  </div>
                )}
              </div>

              <div className="grid lg:grid-cols-12 gap-8 print:block">
                <div className="lg:col-span-4 space-y-6 print:hidden">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                      <Menu className="w-5 h-5 text-amber-500" />
                      <h2 className="font-bold text-white">Parâmetros da Laje</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Vão Lx (m)" type="number" value={slabInput.lx} onChange={(e: any) => setSlabInput({...slabInput, lx: e.target.value})} />
                      <Input label="Vão Ly (m)" type="number" value={slabInput.ly} onChange={(e: any) => setSlabInput({...slabInput, ly: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="fck (MPa)" type="number" value={slabInput.fck} onChange={(e: any) => setSlabInput({...slabInput, fck: e.target.value})} />
                      <Input label="fyk (MPa)" type="number" value={slabInput.fyk} onChange={(e: any) => setSlabInput({...slabInput, fyk: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Espessura (cm)" type="number" value={slabInput.thickness} onChange={(e: any) => setSlabInput({...slabInput, thickness: e.target.value})} />
                      <Input label="Carga (kN/m²)" type="number" value={slabInput.load} onChange={(e: any) => setSlabInput({...slabInput, load: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <Input label="Momento Negativo (kNm/m)" type="number" value={slabInput.md_neg} onChange={(e: any) => setSlabInput({...slabInput, md_neg: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bitola Preferencial (mm)</label>
                        <select 
                          value={slabInput.preferredDiameter} 
                          onChange={(e) => setSlabInput({...slabInput, preferredDiameter: Number(e.target.value)})}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                        >
                          {[5, 6.3, 8, 10, 12.5].map(d => (
                            <option key={d} value={d}>{d} mm</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button onClick={calculateSlab} className="w-full bg-amber-600 hover:bg-amber-500">Calcular Laje</Button>
                    
                    {slabResult && !slabResult.is_error && (
                      <div className="pt-4 border-t border-zinc-800">
                        <VizBgPicker value={vizBgColor} onChange={setVizBgColor} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                  {slabResult ? (
                    <div className="grid gap-6">
                      <div className="space-y-6 print:hidden">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
                          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Resultados da Laje</h3>
                          
                          {slabResult.is_error ? (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-sm text-red-200">{slabResult.error_message}</p>
                            </div>
                          ) : (
                            <div className="space-y-8">
                              <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-end">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-amber-500">Armadura Longitudinal</h4>
                                    <span className="text-2xl font-bold text-white">{slabResult.as_final} cm²/m</span>
                                  </div>
                                  <div className="h-px bg-zinc-800" />
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Área Mínima (As,min)</span>
                                    <span className="text-white font-medium">{slabResult.as_min} cm²/m</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Flecha Calculada</span>
                                    <span className={cn("font-medium", slabResult.deflection > slabResult.deflection_limit ? "text-red-500" : "text-white")}>
                                      {slabResult.deflection} mm
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Flecha Limite (L/250)</span>
                                    <span className="text-white font-medium">{slabResult.deflection_limit} mm</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Status Flecha</span>
                                    <span className={cn("font-bold", slabResult.deflection_status === "Atende" ? "text-emerald-500" : "text-red-500")}>
                                      {slabResult.deflection_status}
                                    </span>
                                  </div>
                                  {slabResult.as_neg > 0 && (
                                    <div className="pt-4 border-t border-zinc-800 space-y-2">
                                      <div className="flex justify-between items-end">
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-red-400">Armadura Negativa</h4>
                                        <span className="text-xl font-bold text-white">{slabResult.as_neg} cm²/m</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">Detalhamento</span>
                                        <span className="text-white font-medium">Ø {slabResult.negativeBars.diameter} c/ {slabResult.negativeBars.spacing} cm</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="p-6 rounded-2xl border bg-amber-500/10 border-amber-500/20 flex flex-col justify-center items-center text-center">
                                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Detalhamento</h4>
                                  <p className="text-3xl font-black text-white">
                                    Ø {slabResult.bars.diameter} <span className="text-xl text-amber-500">c/</span> {slabResult.bars.spacing} <span className="text-sm text-zinc-400">cm</span>
                                  </p>
                                  <p className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-tighter">Armadura de Flexão</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {!slabResult.is_error && (
                          <div className="space-y-6">
                            <SlabViz input={slabInput} result={slabResult} />
                            <Reinforcement3D 
                              type="slab" 
                              width={Number(slabInput.ly) * 100} 
                              height={Number(slabInput.thickness)} 
                              length={Number(slabInput.lx) * 100}
                              bars={slabResult.bars} 
                              negativeBars={slabResult.negativeBars}
                              stirrups={{ spacing: 15 }} 
                              backgroundColor={vizBgColor}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[300px] bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500">
                      Aguardando cálculos...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {view === 'calc' && (
            <motion.div 
              key="calc"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4 print:hidden">
                <button onClick={() => { setView('menu'); setShowReport(false); }} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-medium">
                  <X className="w-4 h-4" /> Voltar ao Menu
                </button>
                {result && !result.is_over_reinforced && (
                  <div className="flex gap-3">
                    <Button onClick={() => setView('beam_report')} variant="secondary">Ver Relatório</Button>
                  </div>
                )}
              </div>

              <div className="grid lg:grid-cols-12 gap-8 print:block">
                {/* Inputs - Hidden on print if report is shown */}
                <div className="lg:col-span-4 space-y-6 print:hidden">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                      <Settings className="w-5 h-5 text-emerald-500" />
                      <h2 className="font-bold text-white">Parâmetros da Viga</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Vão Lx (cm)" type="number" value={input.lx} onChange={(e: any) => setInput({...input, lx: e.target.value})} />
                      <Input label="Carga (kN/m)" type="number" value={input.load} onChange={(e: any) => setInput({...input, load: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="fck (MPa)" type="number" value={input.fck} onChange={(e: any) => setInput({...input, fck: e.target.value})} />
                      <Input label="fyk (MPa)" type="number" value={input.fyk} onChange={(e: any) => setInput({...input, fyk: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Largura (cm)" type="number" value={input.width} onChange={(e: any) => setInput({...input, width: e.target.value})} />
                      <Input label="Altura (cm)" type="number" value={input.height} onChange={(e: any) => setInput({...input, height: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Cobrimento (cm)" type="number" value={input.cover} onChange={(e: any) => setInput({...input, cover: e.target.value})} />
                      <Select 
                        label="Bitola Preferencial (mm)" 
                        value={input.preferredDiameter} 
                        onChange={(e: any) => setInput({...input, preferredDiameter: Number(e.target.value)})}
                        options={COMMON_BAR_DIAMETERS.map(d => ({ label: `${d} mm`, value: d }))}
                      />
                    </div>

                    <Button onClick={calculate} className="w-full bg-emerald-600 hover:bg-emerald-500">Calcular Viga</Button>
                    
                    {result && !result.is_over_reinforced && (
                      <div className="pt-4 border-t border-zinc-800">
                        <VizBgPicker value={vizBgColor} onChange={setVizBgColor} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Results / Report */}
                <div className="lg:col-span-8 space-y-6">
                  {result ? (
                    <div className="grid gap-6">
                      <div className="space-y-6 print:hidden">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
                          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Resultados da Viga</h3>
                          
                          {result.is_over_reinforced ? (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <p className="text-sm text-red-200">Seção super-armada! Aumente as dimensões da viga ou o fck.</p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="bg-zinc-800/30 border border-zinc-800 p-6 rounded-xl space-y-6">
                                <div className="grid md:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-emerald-500">Armadura Longitudinal</h4>
                                      <span className="text-2xl font-bold text-white">{result.as_final} cm²</span>
                                    </div>
                                    <div className="h-px bg-zinc-800" />
                                    <div className="flex justify-between text-sm">
                                      <span className="text-zinc-500">Área Calculada (As,calc)</span>
                                      <span className="text-white font-medium">{result.as_calc} cm²</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-zinc-500">Área Mínima (As,min)</span>
                                      <span className="text-white font-medium">{result.as_min} cm²</span>
                                    </div>
                                  </div>
                                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl flex flex-col justify-center items-center text-center">
                                    <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Detalhamento</h4>
                                    <p className="text-3xl font-black text-white">
                                      {result.bars.count} <span className="text-xl text-emerald-500">Ø</span> {result.bars.diameter} <span className="text-sm text-zinc-400">mm</span>
                                    </p>
                                    <p className="text-[10px] text-zinc-500 mt-2 uppercase font-bold tracking-tighter">Armadura de Tração</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {!result.is_over_reinforced && (
                          <div className="space-y-6">
                            <BeamViz input={input} result={result} />
                            <Reinforcement3D 
                              type="beam" 
                              width={input.width} 
                              height={input.height} 
                              bars={result.bars} 
                              stirrups={{ spacing: 15 }} 
                              backgroundColor={vizBgColor}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[400px] bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500 space-y-4">
                      <Calculator className="w-12 h-12 opacity-20" />
                      <p className="text-sm font-medium">Insira os dados e clique em calcular</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Painel de Controle</h2>
                <div className="flex gap-3">
                  <Button onClick={fetchAdminNotifications} variant="outline" size="sm">
                    <Bell className="w-4 h-4 mr-2" />
                    {adminNotifications.filter(n => !n.read).length} Novas
                  </Button>
                  <Button onClick={fetchAdminUsers} variant="secondary" size="sm">Atualizar Lista</Button>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                      <h3 className="font-bold text-white">Usuários Registrados</h3>
                      <button 
                        onClick={liberateAllPending}
                        className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:underline"
                      >
                        Liberar Todos Pendentes
                      </button>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-zinc-800/50 border-b border-zinc-800">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Usuário</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Data Cadastro</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {adminUsers.map((u: any) => (
                          <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-zinc-400">
                                  {u.email[0].toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-white">{u.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-400">
                              {new Date(u.trial_start).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              {u.access_granted ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                  Liberado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  Trial / Pendente
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {u.role !== 'admin' && (
                                <button 
                                  onClick={() => toggleAccess(u.id, !u.access_granted)}
                                  className={cn(
                                    "text-xs font-bold uppercase tracking-widest hover:underline",
                                    u.access_granted ? "text-red-500" : "text-emerald-500"
                                  )}
                                >
                                  {u.access_granted ? 'Bloquear' : 'Liberar'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
                      <h3 className="font-bold text-white">Notificações</h3>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recentes</span>
                    </div>
                    <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
                      {adminNotifications.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">Nenhuma notificação</div>
                      ) : (
                        adminNotifications.map((n: any) => {
                          const userForNotification = adminUsers.find((u: any) => u.email.toLowerCase() === n.user_email.toLowerCase());
                          const isAlreadyLiberated = userForNotification?.access_granted;
                          
                          return (
                            <div key={n.id} className={cn("p-4 space-y-3 transition-colors", !n.read && "bg-emerald-500/5")}>
                              <div className="flex justify-between items-start">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                                  n.type === 'registration' ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                                )}>
                                  {n.type === 'registration' ? 'Registro' : 'Acesso'}
                                </span>
                                <span className="text-[10px] text-zinc-500">{new Date(n.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-zinc-300">{n.message}</p>
                              <div className="flex items-center gap-4">
                                {!n.read && (
                                  <button 
                                    onClick={() => markNotificationRead(n.id)}
                                    className="text-[10px] text-zinc-500 hover:text-white font-bold uppercase tracking-widest"
                                  >
                                    Marcar como lida
                                  </button>
                                )}
                                {n.type === 'access_request' && !isAlreadyLiberated && userForNotification && (
                                  <button 
                                    onClick={() => {
                                      toggleAccess(userForNotification.id, true);
                                      markNotificationRead(n.id);
                                    }}
                                    className="text-[10px] text-emerald-500 hover:underline font-bold uppercase tracking-widest flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Liberar Acesso Agora
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'beam_report' && result && (
            <motion.div 
              key="beam_report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto p-4 md:p-12 print:opacity-100 print:transform-none"
            >
              <div id="report-beam" className="bg-white text-black p-6 md:p-12 rounded-2xl shadow-2xl space-y-8 print:p-0 print:shadow-none">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b-2 border-zinc-100 pb-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Relatório Técnico</h2>
                    <p className="text-zinc-500 font-medium text-sm md:text-base">Dimensionamento de Viga de Concreto Armado</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Data do Cálculo</p>
                    <p className="font-mono font-bold text-sm md:text-base">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-6">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-600">Dados de Entrada</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs md:text-sm">
                      <span className="text-zinc-500">Vão (Lx):</span> <span className="font-bold">{input.lx} cm</span>
                      <span className="text-zinc-500">Carga (q):</span> <span className="font-bold">{input.load} kN/m</span>
                      <span className="text-zinc-500">Concreto (fck):</span> <span className="font-bold">{input.fck} MPa</span>
                      <span className="text-zinc-500">Aço (fyk):</span> <span className="font-bold">{input.fyk} MPa</span>
                      <span className="text-zinc-500">Seção:</span> <span className="font-bold">{input.width} x {input.height} cm</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-600">Resultados do Dimensionamento</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs md:text-sm">
                      <span className="text-zinc-500">Área de Aço Mín.:</span> <span className="font-bold">{result.as_min} cm²</span>
                      <span className="text-zinc-500">Área Adotada (As):</span> <span className="font-bold text-emerald-600">{result.as_final} cm²</span>
                      <span className="text-zinc-500">Posição da L.N. (x):</span> <span className="font-bold">{result.x} cm</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 p-6 md:p-8 rounded-2xl border border-zinc-100 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                  <div className="flex-1 space-y-4 text-center lg:text-left">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400">Detalhamento da Armadura</h4>
                    <p className="text-4xl md:text-5xl font-black text-black">
                      {result.bars.count} <span className="text-xl md:text-2xl text-emerald-600">Ø</span> {result.bars.diameter} <span className="text-xs md:text-sm text-zinc-400">mm</span>
                    </p>
                    <p className="text-xs md:text-sm text-zinc-500 leading-relaxed">Armadura longitudinal tracionada calculada para resistir ao momento fletor solicitante.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100 w-full lg:w-auto overflow-x-auto flex justify-center">
                    <BeamViz input={input} result={result} />
                  </div>
                </div>

                <CalculationMemory type="beam" input={input} result={result} />

                <div className="space-y-4 print:hidden">
                  <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400 text-center">Modelo 3D Interativo</h4>
                  <Reinforcement3D 
                    type="beam" 
                    width={input.width} 
                    height={input.height} 
                    bars={result.bars} 
                    stirrups={{ spacing: 15 }} 
                    backgroundColor={vizBgColor}
                  />
                </div>

                <div className="pt-8 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-zinc-400 font-bold uppercase tracking-widest print:hidden">
                  <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={() => setView('calc')} className="hover:text-black flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg">
                      <X className="w-3 h-3" /> Fechar Relatório
                    </button>
                    <button 
                      onClick={() => window.print()} 
                      className="text-zinc-600 hover:text-black flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50/50 transition-colors"
                    >
                      <FileText className="w-3 h-3" /> Imprimir Relatório (Recurso Nativo do Navegador)
                    </button>
                    {!isPublicView && (
                      <button 
                        onClick={() => saveReport('beam', `Viga ${input.width}x${input.height} - ${new Date().toLocaleDateString()}`, input, result)} 
                        className="text-emerald-600 hover:text-emerald-500 flex items-center gap-2 px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/50 transition-colors"
                      >
                        <Save className="w-3 h-3" /> Salvar
                      </button>
                    )}
                    {(currentReportShareId || isPublicView) && (
                      <button 
                        onClick={() => shareReport(currentReportShareId || new URLSearchParams(window.location.search).get('share') || '')} 
                        className="text-blue-600 hover:text-blue-500 flex items-center gap-2 px-3 py-2 border border-blue-100 rounded-lg bg-blue-50/50 transition-colors"
                      >
                        <Share2 className="w-3 h-3" /> Compartilhar
                      </button>
                    )}
                  </div>
                  {isPublicView ? (
                    <button 
                      onClick={() => window.location.href = window.location.origin}
                      className="text-emerald-500 font-bold hover:underline"
                    >
                      Criar meu próprio cálculo no VigaPro
                    </button>
                  ) : (
                    <span className="text-center md:text-right">VigaPro Structural Engine - patricioaug@gmail.com</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'pillar_report' && pillarResult && (
            <motion.div 
              key="pillar_report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto p-4 md:p-12 print:opacity-100 print:transform-none"
            >
              <div id="report-pillar" className="bg-white text-black p-6 md:p-12 rounded-2xl shadow-2xl space-y-8 print:p-0 print:shadow-none">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b-2 border-zinc-100 pb-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Relatório Técnico</h2>
                    <p className="text-zinc-500 font-medium text-sm md:text-base">Dimensionamento de Pilar de Concreto Armado</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Data do Cálculo</p>
                    <p className="font-mono font-bold text-sm md:text-base">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-6">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-600">Dados de Entrada</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs md:text-sm">
                      <span className="text-zinc-500">Seção Transversal:</span> <span className="font-bold">{pillarInput.width} x {pillarInput.height} cm</span>
                      <span className="text-zinc-500">Concreto (fck):</span> <span className="font-bold">{pillarInput.fck} MPa</span>
                      <span className="text-zinc-500">Aço (fyk):</span> <span className="font-bold">{pillarInput.fyk} MPa</span>
                      <span className="text-zinc-500">Carga Axial (Nd):</span> <span className="font-bold">{pillarInput.nd} kN</span>
                      <span className="text-zinc-500">Momento Fletor (Md):</span> <span className="font-bold">{pillarInput.md} kNm</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-600">Resultados do Dimensionamento</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs md:text-sm">
                      <span className="text-zinc-500">Área de Aço Mín.:</span> <span className="font-bold">{pillarResult.as_min} cm²</span>
                      <span className="text-zinc-500">Área Adotada (As):</span> <span className="font-bold text-blue-600">{pillarResult.as_final} cm²</span>
                      <span className="text-zinc-500">Taxa de Armadura:</span> <span className="font-bold">{(pillarResult.as_final / (pillarInput.width * pillarInput.height) * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 p-6 md:p-8 rounded-2xl border border-zinc-100 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                  <div className="flex-1 space-y-4 text-center lg:text-left">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400">Detalhamento da Armadura</h4>
                    <p className="text-4xl md:text-5xl font-black text-black">
                      {pillarResult.bars.count} <span className="text-xl md:text-2xl text-blue-600">Ø</span> {pillarResult.bars.diameter} <span className="text-xs md:text-sm text-zinc-400">mm</span>
                    </p>
                    <p className="text-xs md:text-sm text-zinc-500 leading-relaxed">Armadura longitudinal distribuída na seção, respeitando as prescrições da NBR 6118.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100 w-full lg:w-auto overflow-x-auto flex justify-center">
                    <PillarViz input={pillarInput} result={pillarResult} />
                  </div>
                </div>

                <CalculationMemory type="pillar" input={pillarInput} result={pillarResult} />

                <div className="space-y-4 print:hidden">
                  <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400 text-center">Modelo 3D Interativo</h4>
                  <Reinforcement3D 
                    type="pillar" 
                    width={pillarInput.width} 
                    height={pillarInput.height} 
                    bars={pillarResult.bars} 
                    stirrups={{ spacing: 15 }} 
                    backgroundColor={vizBgColor}
                  />
                </div>

                <div className="pt-8 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-zinc-400 font-bold uppercase tracking-widest print:hidden">
                  <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={() => setView('pillar')} className="hover:text-black flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg">
                      <X className="w-3 h-3" /> Fechar Relatório
                    </button>
                    <button 
                      onClick={() => window.print()} 
                      className="text-zinc-600 hover:text-black flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50/50 transition-colors"
                    >
                      <FileText className="w-3 h-3" /> Imprimir Relatório (Recurso Nativo do Navegador)
                    </button>
                    {!isPublicView && (
                      <button 
                        onClick={() => saveReport('pillar', `Pilar ${pillarInput.width}x${pillarInput.height} - ${new Date().toLocaleDateString()}`, pillarInput, pillarResult)} 
                        className="text-emerald-600 hover:text-emerald-500 flex items-center gap-2 px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/50 transition-colors"
                      >
                        <Save className="w-3 h-3" /> Salvar
                      </button>
                    )}
                    {(currentReportShareId || isPublicView) && (
                      <button 
                        onClick={() => shareReport(currentReportShareId || new URLSearchParams(window.location.search).get('share') || '')} 
                        className="text-blue-600 hover:text-blue-500 flex items-center gap-2 px-3 py-2 border border-blue-100 rounded-lg bg-blue-50/50 transition-colors"
                      >
                        <Share2 className="w-3 h-3" /> Compartilhar
                      </button>
                    )}
                  </div>
                  {isPublicView ? (
                    <button 
                      onClick={() => window.location.href = window.location.origin}
                      className="text-emerald-500 font-bold hover:underline"
                    >
                      Criar meu próprio cálculo no VigaPro
                    </button>
                  ) : (
                    <span className="text-center md:text-right">VigaPro Structural Engine - patricioaug@gmail.com</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'slab_report' && slabResult && (
            <motion.div 
              key="slab_report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto p-4 md:p-12 print:opacity-100 print:transform-none"
            >
              <div id="report-slab" className="bg-white text-black p-6 md:p-12 rounded-2xl shadow-2xl space-y-8 print:p-0 print:shadow-none">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b-2 border-zinc-100 pb-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Relatório Técnico</h2>
                    <p className="text-zinc-500 font-medium text-sm md:text-base">Dimensionamento de Laje de Concreto Armado</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase">Data do Cálculo</p>
                    <p className="font-mono font-bold text-sm md:text-base">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-6">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-amber-600">Dados de Entrada</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs md:text-sm">
                      <span className="text-zinc-500">Dimensões (Lx / Ly):</span> <span className="font-bold">{slabInput.lx} x {slabInput.ly} m</span>
                      <span className="text-zinc-500">Concreto (fck):</span> <span className="font-bold">{slabInput.fck} MPa</span>
                      <span className="text-zinc-500">Aço (fyk):</span> <span className="font-bold">{slabInput.fyk} MPa</span>
                      <span className="text-zinc-500">Carga Total:</span> <span className="font-bold">{slabInput.load} kN/m²</span>
                      <span className="text-zinc-500">Espessura (h):</span> <span className="font-bold">{slabInput.thickness} cm</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-amber-600">Resultados do Dimensionamento</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs md:text-sm">
                      <span className="text-zinc-500">Área de Aço Mín.:</span> <span className="font-bold">{slabResult.as_min} cm²/m</span>
                      <span className="text-zinc-500">Área Adotada (As):</span> <span className="font-bold text-amber-600">{slabResult.as_final} cm²/m</span>
                      <span className="text-zinc-500">Flecha Calculada:</span> <span className="font-bold text-amber-600">{slabResult.deflection} mm</span>
                      <span className="text-zinc-500">Flecha Limite (L/250):</span> <span className="font-bold">{slabResult.deflection_limit} mm</span>
                      <span className="text-zinc-500">Status Flecha:</span> <span className={cn("font-bold", slabResult.deflection_status === "Atende" ? "text-emerald-600" : "text-red-600")}>{slabResult.deflection_status}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 p-6 md:p-8 rounded-2xl border border-zinc-100 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                  <div className="flex-1 space-y-4 text-center lg:text-left">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400">Detalhamento da Armadura</h4>
                    <p className="text-4xl md:text-5xl font-black text-black">
                      Ø {slabResult.bars.diameter} <span className="text-xl md:text-2xl text-amber-600">c/</span> {slabResult.bars.spacing} <span className="text-xs md:text-sm text-zinc-400">cm</span>
                    </p>
                    <p className="text-xs md:text-sm text-zinc-500 leading-relaxed">Armadura longitudinal de flexão posicionada na face inferior da laje.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100 w-full lg:w-auto overflow-x-auto flex justify-center">
                    <SlabViz input={slabInput} result={slabResult} />
                  </div>
                </div>

                <CalculationMemory type="slab" input={slabInput} result={slabResult} />

                <div className="space-y-4 print:hidden">
                  <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400 text-center">Modelo 3D Interativo</h4>
                  <Reinforcement3D 
                    type="slab" 
                    width={slabInput.ly * 100} 
                    height={slabInput.thickness} 
                    length={slabInput.lx * 100}
                    bars={slabResult.bars} 
                    backgroundColor={vizBgColor}
                  />
                </div>

                <div className="pt-8 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-zinc-400 font-bold uppercase tracking-widest print:hidden">
                  <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={() => setView('slab')} className="hover:text-black flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg">
                      <X className="w-3 h-3" /> Fechar Relatório
                    </button>
                    <button 
                      onClick={() => window.print()} 
                      className="text-zinc-600 hover:text-black flex items-center gap-2 px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50/50 transition-colors"
                    >
                      <FileText className="w-3 h-3" /> Imprimir Relatório (Recurso Nativo do Navegador)
                    </button>
                    {!isPublicView && (
                      <button 
                        onClick={() => saveReport('slab', `Laje - ${new Date().toLocaleDateString()}`, slabInput, slabResult)} 
                        className="text-emerald-600 hover:text-emerald-500 flex items-center gap-2 px-3 py-2 border border-emerald-100 rounded-lg bg-emerald-50/50 transition-colors"
                      >
                        <Save className="w-3 h-3" /> Salvar
                      </button>
                    )}
                    {(currentReportShareId || isPublicView) && (
                      <button 
                        onClick={() => shareReport(currentReportShareId || new URLSearchParams(window.location.search).get('share') || '')} 
                        className="text-blue-600 hover:text-blue-500 flex items-center gap-2 px-3 py-2 border border-blue-100 rounded-lg bg-blue-50/50 transition-colors"
                      >
                        <Share2 className="w-3 h-3" /> Compartilhar
                      </button>
                    )}
                  </div>
                  {isPublicView ? (
                    <button 
                      onClick={() => window.location.href = window.location.origin}
                      className="text-emerald-500 font-bold hover:underline"
                    >
                      Criar meu próprio cálculo no VigaPro
                    </button>
                  ) : (
                    <span className="text-center md:text-right">VigaPro Structural Engine - patricioaug@gmail.com</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'forgot_password' && (
            <div className="min-h-[80vh] flex items-center justify-center">
              <motion.div 
                key="forgot"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-8 shadow-2xl"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Recuperar Senha</h2>
                  <p className="text-zinc-500 text-sm">
                    {resetStep === 1 
                      ? "Insira seu e-mail para receber o código de recuperação" 
                      : "Insira o código enviado e sua nova senha"}
                  </p>
                </div>

                {resetStep === 1 ? (
                  <form className="space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const email = formData.get('email') as string;
                    
                    const res = await fetch('/api/forgot-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email })
                    });
                    
                    const data = await res.json();
                    if (res.ok) {
                      setResetEmail(email);
                      setResetStep(2);
                      showToast(data.message);
                      // For demo, we might want to show the token if we can't check console
                      if (data.debug_token) {
                        console.log("DEBUG TOKEN:", data.debug_token);
                      }
                    } else {
                      showToast(data.error, 'error');
                    }
                  }}>
                    <Input label="E-mail de Cadastro" name="email" type="email" required />
                    <Button type="submit" className="w-full">Enviar Código</Button>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const token = formData.get('token') as string;
                    const newPassword = formData.get('newPassword') as string;
                    
                    const res = await fetch('/api/reset-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: resetEmail, token, newPassword })
                    });
                    
                    const data = await res.json();
                    if (res.ok) {
                      showToast(data.message);
                      setView('login');
                      setResetStep(1);
                    } else {
                      showToast(data.error, 'error');
                    }
                  }}>
                    <Input label="Código de 6 dígitos" name="token" type="text" required maxLength={6} />
                    <Input label="Nova Senha" name="newPassword" type="password" required />
                    <Button type="submit" className="w-full">Alterar Senha</Button>
                    <button 
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="w-full text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      Reenviar código
                    </button>
                  </form>
                )}

                <div className="text-center">
                  <button 
                    onClick={() => {
                      setView('login');
                      setResetStep(1);
                    }}
                    className="text-sm text-zinc-500 hover:text-emerald-500 transition-colors"
                  >
                    Voltar para o Login
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {(view === 'login' || view === 'register') && (
            <div className="min-h-[80vh] flex items-center justify-center">
              <motion.div 
                key="auth"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-8 shadow-2xl"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-900/20">
                    <Calculator className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{view === 'login' ? 'Bem-vindo de volta' : 'Criar nova conta'}</h2>
                  <p className="text-zinc-500 text-sm">Acesse a ferramenta profissional de cálculo estrutural</p>
                </div>

                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const email = formData.get('email') as string;
                  const password = formData.get('password') as string;
                  
                  const endpoint = view === 'login' ? '/api/login' : '/api/register';
                  const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                  });
                  
                  const data = await res.json();
                  if (res.ok) {
                    if (endpoint.includes('login')) {
                      login(email, data.token, data.user, data.serverTime);
                    } else {
                      setView('login');
                      showToast('Cadastro realizado! Faça login para continuar.');
                    }
                  } else {
                    showToast(data.error || 'Erro ao processar requisição', 'error');
                  }
                }}>
                  <Input label="E-mail" name="email" type="email" required />
                  <div className="space-y-1">
                    <Input label="Senha" name="password" type="password" required />
                    {view === 'login' && (
                      <div className="flex justify-end">
                        <button 
                          type="button"
                          onClick={() => setView('forgot_password')}
                          className="text-xs text-zinc-500 hover:text-emerald-500 transition-colors"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full">{view === 'login' ? 'Entrar' : 'Cadastrar'}</Button>
                </form>

                <div className="text-center">
                  <button 
                    onClick={() => setView(view === 'login' ? 'register' : 'login')}
                    className="text-sm text-zinc-500 hover:text-emerald-500 transition-colors"
                  >
                    {view === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-zinc-500">
            <Calculator className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">VigaPro Structural Engine v1.0</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-medium text-zinc-500">
            <div className="flex items-center gap-2 text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Versão Trial (7 dias)
            </div>
            <button 
              onClick={() => setShowSupport(true)}
              className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Suporte Técnico
            </button>
          </div>
        </div>
      </footer>

      {/* Support Modal */}
      <AnimatePresence>
        {showSupport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSupport(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-emerald-500" />
                </div>
                <button onClick={() => setShowSupport(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Suporte Técnico</h3>
                <p className="text-zinc-400">Entre em contato diretamente com o engenheiro responsável para dúvidas ou liberação de acesso.</p>
              </div>

              <div className="bg-zinc-800 rounded-2xl p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Email Direto</p>
                    <p className="text-white font-medium">patricioaug@gmail.com</p>
                  </div>
                </div>
                <a 
                  href="mailto:patricioaug@gmail.com"
                  className="p-2 bg-emerald-600 rounded-lg text-white hover:bg-emerald-500 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </a>
              </div>

              <Button onClick={() => setShowSupport(false)} variant="outline" className="w-full">Fechar</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
