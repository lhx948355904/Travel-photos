import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS3DRenderer,
  CSS3DSprite,
} from "three/addons/renderers/CSS3DRenderer.js";
import type { Location } from "../../types";
import {
  generateGalaxyParticles,
  getPhotoGalaxyPosition,
  toUniverseMediaUrl,
} from "./galaxyMath";
import type { GestureState } from "./types";

interface UniverseSceneProps {
  color: string;
  gesture: GestureState;
  locations: Location[];
  resetSignal: number;
  reducedMotion: boolean;
  onPhotoSelect: (locationId: number) => void;
}

const vertexShader = `
  attribute float aSize;
  attribute float aTint;
  attribute float aCore;
  attribute vec3 aScatter;
  uniform float uTime;
  uniform float uSpread;
  uniform float uPixelRatio;
  uniform float uMotion;
  uniform vec2 uFlight;
  uniform float uFlightStrength;
  varying float vTint;
  varying float vPulse;
  varying float vCore;
  varying vec2 vFlight;
  varying float vFlightStrength;

  void main() {
    vec3 animatedPosition = position + aScatter * uSpread;
    float flightPhase = fract(uTime * (0.22 + aTint * 0.22) + aTint);
    vec3 flightDirection = normalize(vec3(uFlight.x, uFlight.y * 0.34, -uFlight.y + 0.0001));
    animatedPosition += flightDirection * uFlightStrength * flightPhase * 5.4;
    float pulse = 1.0 + sin(uTime * 0.8 + position.x * 1.7 + position.z) * 0.16 * uMotion;
    vec4 viewPosition = modelViewMatrix * vec4(animatedPosition, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aSize * pulse * uPixelRatio * (58.0 / max(1.0, -viewPosition.z)) * (1.0 + uFlightStrength * 4.2);
    vTint = aTint;
    vPulse = pulse;
    vCore = aCore;
    vFlight = uFlight;
    vFlightStrength = uFlightStrength;
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  varying float vTint;
  varying float vPulse;
  varying float vCore;
  varying vec2 vFlight;
  varying float vFlightStrength;

  void main() {
    vec2 point = gl_PointCoord - vec2(0.5);
    float distanceToCenter = length(point);
    float coreGlow = smoothstep(0.5, 0.0, distanceToCenter);
    float halo = smoothstep(0.5, 0.18, distanceToCenter) * 0.52;
    vec2 direction = length(vFlight) > 0.001 ? normalize(vFlight) : vec2(1.0, 0.0);
    float along = dot(point, direction);
    float across = dot(point, vec2(-direction.y, direction.x));
    float streak = smoothstep(0.1, 0.0, abs(across))
      * smoothstep(-0.5, -0.24, along)
      * (1.0 - smoothstep(0.08, 0.32, along));
    vec3 coolWhite = vec3(0.92, 0.97, 1.0);
    vec3 warmCore = vec3(1.0, 0.72, 0.42);
    vec3 color = mix(uColor, coolWhite, pow(vTint, 3.0) * 0.72);
    color = mix(color, warmCore, vCore * 0.72);
    float roundAlpha = coreGlow + halo;
    float alpha = mix(roundAlpha, max(coreGlow * 0.8, streak), vFlightStrength);
    alpha *= mix(1.0, 0.68, vCore);
    gl_FragColor = vec4(color, alpha * min(vPulse, 1.12));
  }
`;

const createCoreGlowTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 124);
  gradient.addColorStop(0, "rgba(255,245,218,0.96)");
  gradient.addColorStop(0.12, "rgba(255,190,102,0.62)");
  gradient.addColorStop(0.42, "rgba(93,168,255,0.18)");
  gradient.addColorStop(1, "rgba(7,20,48,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createBackgroundStars = (count: number) => {
  const random = Math.random;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const radius = 24 + random() * 30;
    const phi = Math.acos(2 * random() - 1);
    const theta = random() * Math.PI * 2;
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xa9c9ef,
    size: 0.075,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
};

export const UniverseScene = ({
  color,
  gesture,
  locations,
  resetSignal,
  reducedMotion,
  onPhotoSelect,
}: UniverseSceneProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef(gesture);
  const colorRef = useRef(color);
  const photoSelectRef = useRef(onPhotoSelect);
  const resetRef = useRef(resetSignal);

  gestureRef.current = gesture;
  colorRef.current = color;
  photoSelectRef.current = onPhotoSelect;
  resetRef.current = resetSignal;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isCompact = window.matchMedia("(max-width: 760px)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: !isCompact, alpha: false });
    renderer.setClearColor(0x02050c, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.35 : 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.domElement.className = "universe-css-layer";
    mount.appendChild(cssRenderer.domElement);

    const scene = new THREE.Scene();
    const cssScene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02050c, 0.022);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
    camera.position.set(0, 7.4, 19.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 8;
    controls.maxDistance = 31;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.minPolarAngle = Math.PI * 0.2;
    controls.target.set(0, 0, 0);

    const galaxyGroup = new THREE.Group();
    galaxyGroup.rotation.x = -0.12;
    scene.add(galaxyGroup);

    const backgroundStars = createBackgroundStars(isCompact ? 650 : 1600);
    scene.add(backgroundStars);

    const particleData = generateGalaxyParticles(isCompact ? 14000 : 38000);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(particleData.positions, 3));
    geometry.setAttribute("aScatter", new THREE.BufferAttribute(particleData.scatter, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(particleData.sizes, 1));
    geometry.setAttribute("aTint", new THREE.BufferAttribute(particleData.tint, 1));
    geometry.setAttribute("aCore", new THREE.BufferAttribute(particleData.core, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: 0.3 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uMotion: { value: reducedMotion ? 0 : 1 },
        uFlight: { value: new THREE.Vector2(0, 1) },
        uFlightStrength: { value: 0 },
        uColor: { value: new THREE.Color(color) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(geometry, material);
    galaxyGroup.add(particles);

    const coreGlowTexture = createCoreGlowTexture();
    const coreGlowMaterial = new THREE.SpriteMaterial({
      map: coreGlowTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coreGlow = new THREE.Sprite(coreGlowMaterial);
    coreGlow.scale.set(5.8, 3.4, 1);
    galaxyGroup.add(coreGlow);

    const cssGalaxyGroup = new THREE.Group();
    cssGalaxyGroup.rotation.x = -0.12;
    cssScene.add(cssGalaxyGroup);
    const photoSprites: CSS3DSprite[] = [];

    locations.forEach((location) => {
      const base = getPhotoGalaxyPosition(location.id);
      const photoButton = document.createElement("button");
      photoButton.type = "button";
      photoButton.className = "universe-photo-node";
      photoButton.setAttribute("aria-label", `打开${location.name}的照片`);

      const fallback = document.createElement("span");
      fallback.className = "universe-photo-fallback";
      fallback.textContent = location.name.trim().slice(0, 1) || "·";
      photoButton.appendChild(fallback);

      if (location.coverThumbUrl) {
        const image = document.createElement("img");
        image.src = toUniverseMediaUrl(location.coverThumbUrl);
        image.alt = location.name;
        image.loading = "eager";
        image.decoding = "async";
        image.addEventListener("load", () => photoButton.classList.add("is-loaded"), { once: true });
        photoButton.appendChild(image);
      }

      photoButton.addEventListener("click", (event) => {
        event.stopPropagation();
        photoSelectRef.current(location.id);
      });

      const sprite = new CSS3DSprite(photoButton);
      sprite.position.set(base.x, base.y + 0.38, base.z);
      sprite.scale.setScalar(isCompact ? 0.0068 : 0.0082);
      sprite.userData = { base };
      cssGalaxyGroup.add(sprite);
      photoSprites.push(sprite);
    });

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      cssRenderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const startedAt = performance.now();
    let animationFrame = 0;
    let currentScale = 1;
    let currentSpread = 0.3;
    let targetCameraDistance = camera.position.length();
    let lastTrackingAt = 0;
    let lastResetSignal = resetRef.current;
    let flightX = 0;
    let flightY = 1;
    let flightStrength = 0;

    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const currentGesture = gestureRef.current;
      material.uniforms.uTime.value = elapsed;
      material.uniforms.uColor.value.set(colorRef.current);

      if (resetRef.current !== lastResetSignal) {
        lastResetSignal = resetRef.current;
        camera.position.set(0, 7.4, 19.5);
        controls.target.set(0, 0, 0);
        galaxyGroup.rotation.set(-0.12, 0, 0);
        cssGalaxyGroup.rotation.set(-0.12, 0, 0);
        currentScale = 1;
        currentSpread = 0.3;
        targetCameraDistance = camera.position.length();
        flightStrength = 0;
      }

      if (currentGesture.tracking) {
        lastTrackingAt = performance.now();
        if (currentGesture.mode === "palm") {
          const scaleTarget = 0.76 + currentGesture.openness * 0.56;
          const spreadTarget = -0.18 + currentGesture.openness * 1.08;
          currentScale += (scaleTarget - currentScale) * 0.08;
          currentSpread += (spreadTarget - currentSpread) * 0.08;
        } else if (currentGesture.mode === "point") {
          const rotationStep = currentGesture.rotationDelta * 0.035;
          galaxyGroup.rotation.y += rotationStep;
          cssGalaxyGroup.rotation.y += rotationStep;
        } else if (currentGesture.mode === "fist") {
          const normalizedDepth = (currentGesture.zoomDelta + 1) * 0.5;
          targetCameraDistance = THREE.MathUtils.lerp(31, 8, normalizedDepth);
          currentScale += (0.76 - currentScale) * 0.08;
          currentSpread += (-0.18 - currentSpread) * 0.08;
        } else if (currentGesture.mode === "two-finger") {
          flightX += (currentGesture.flightX - flightX) * 0.22;
          flightY += (currentGesture.flightY - flightY) * 0.22;
          const requestedStrength = reducedMotion
            ? currentGesture.flightStrength * 0.35
            : currentGesture.flightStrength;
          flightStrength += (requestedStrength - flightStrength) * 0.18;
        }
      } else if (!reducedMotion && performance.now() - lastTrackingAt > 500) {
        galaxyGroup.rotation.y += 0.0007;
        currentScale += (1 - currentScale) * 0.015;
        currentSpread += (0.3 - currentSpread) * 0.015;
      }

      if (currentGesture.mode !== "two-finger") {
        flightStrength *= 0.9;
      }

      material.uniforms.uFlight.value.set(flightX, flightY);
      material.uniforms.uFlightStrength.value = flightStrength;
      coreGlowMaterial.opacity = 0.24 + Math.sin(elapsed * 0.72) * 0.04;
      backgroundStars.rotation.y = elapsed * 0.0025;

      galaxyGroup.scale.setScalar(currentScale);
      cssGalaxyGroup.scale.setScalar(currentScale);
      material.uniforms.uSpread.value = currentSpread;
      photoSprites.forEach((sprite) => {
        const base = sprite.userData.base as { x: number; y: number; z: number };
        const photoSpread = 1 + currentSpread * 0.055;
        sprite.position.set(base.x * photoSpread, base.y + 0.38, base.z * photoSpread);
      });

      const direction = camera.position.clone().normalize();
      const currentDistance = camera.position.length();
      const gestureZoomActive = currentGesture.tracking && currentGesture.mode === "fist";
      if (gestureZoomActive && Math.abs(targetCameraDistance - currentDistance) > 0.01) {
        camera.position.copy(direction.multiplyScalar(THREE.MathUtils.lerp(currentDistance, targetCameraDistance, 0.08)));
      } else {
        targetCameraDistance = currentDistance;
      }

      controls.update();
      renderer.render(scene, camera);
      cssRenderer.render(cssScene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      coreGlowTexture.dispose();
      coreGlowMaterial.dispose();
      backgroundStars.geometry.dispose();
      (backgroundStars.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      cssRenderer.domElement.remove();
    };
  }, [locations, reducedMotion]);

  return <div className="universe-scene" ref={mountRef} role="region" aria-label="可交互照片银河" />;
};
