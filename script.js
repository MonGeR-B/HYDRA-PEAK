import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type"; // Switched to free library
import Lenis from "lenis";

document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // 1. Text Splitting using SplitType (Free alternative)
    const header1Split = new SplitType(".header-1 h1", { types: "chars" });
    const titleSplits = new SplitType(".tooltip .title h2", { types: "lines" });
    const descriptionSplits = new SplitType(".tooltip .description p", { types: "lines" });

    // Wrap characters in spans for animation
    document.querySelectorAll(".header-1 h1 .char").forEach(char => {
        char.innerHTML = `<span style="display:block;">${char.textContent}</span>`;
    });
    
    // Wrap lines in spans
    [...document.querySelectorAll(".tooltip .title .line"), ...document.querySelectorAll(".tooltip .description .line")].forEach(line => {
        line.innerHTML = `<span style="display:block;">${line.textContent}</span>`;
    });

    const animOptions = { duration: 1, ease: "power3.out", stagger: 0.025 };
    
    // Animation triggers for tooltips
    const tooltipSelectors = [
        {
            trigger: 0.65,
            elements: [
                ".tooltip:nth-child(1) .icon ion-icon",
                ".tooltip:nth-child(1) .title .line > span",
                ".tooltip:nth-child(1) .description .line > span",
            ],
        },
        {
            trigger: 0.85,
            elements: [
                ".tooltip:nth-child(2) .icon ion-icon",
                ".tooltip:nth-child(2) .title .line > span",
                ".tooltip:nth-child(2) .description .line > span",
            ],
        },
    ];

    // Initial Text Reveal
    ScrollTrigger.create({
        trigger: ".product-overview",
        start: "top 80%", // Adjusted to trigger earlier
        onEnter: () => {
            gsap.to(".header-1 h1 .char > span", {
                y: "0%",
                duration: 1,
                ease: "power3.out",
                stagger: 0.025,
            });
        },
        onLeaveBack: () => {
            gsap.to(".header-1 h1 .char > span", {
                y: "100%",
                duration: 1,
                ease: "power3.out",
                stagger: 0.025,
            });
        },
    });

    // --- THREE.JS SETUP ---
    let model, modelSize, currentRotation = 0;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.querySelector(".modal-container").appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5)); // Increased intensity slightly

    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(2, 5, 5);
    scene.add(mainLight);

    function setupModel() {
        if (!model || !modelSize) return;
        const isMobile = window.innerWidth < 1000;
        
        // Center the model logic
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        
        model.position.x = isMobile ? 0 : -2; // Offset for desktop
        model.position.y = -center.y;
        
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.z = maxDim * (isMobile ? 2.5 : 2); 
        camera.lookAt(0, 0, 0);
    }

    // Load Model
    new GLTFLoader().load("/shaker.glb", (gltf) => {
        model = gltf.scene;
        // Optional: Material fix if model looks dark
        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        const box = new THREE.Box3().setFromObject(model);
        modelSize = box.getSize(new THREE.Vector3());
        scene.add(model);
        setupModel();
    }, undefined, (error) => {
        console.error("Model failed to load:", error);
    });

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        setupModel();
    });

    // --- MAIN SCROLL ANIMATION ---
    ScrollTrigger.create({
        trigger: ".product-overview",
        start: "top top",
        end: "+=3000", // Makes the scroll section longer
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
            const progress = self.progress;
            
            // Header 1 Animation (Moves Left)
            // Starts at 0, moves to -100%
            const header1Move = -100 * (progress * 2); 
            gsap.set(".header-1", { xPercent: Math.max(-100, header1Move) });

            // Circular Mask (Grows)
            // Starts growing at 0.2, full size by 0.5
            let maskSize = 0;
            if(progress > 0.15) {
                maskSize = (progress - 0.15) * 300; // Multiplier determines speed
            }
            gsap.set(".circular-mask", {
                clipPath: `circle(${maskSize}% at 50% 50%)`
            });

            // Header 2 Animation (Moves In)
            // Enters as Header 1 leaves
            let header2Move = 100;
            if(progress > 0.3) {
                header2Move = 100 - ((progress - 0.3) * 300);
            }
            // Clamp it so it settles at 0 then moves left
            gsap.set(".header-2", { xPercent: Math.max(-100, header2Move) });

            // Tooltips Lines (ScaleX)
            if(progress > 0.5) {
               const scale = Math.min(100, (progress - 0.5) * 400);
               gsap.to(".tooltip .divider", { scaleX: scale + "%", overwrite: true });
            }

            // Show Tooltip Text
            tooltipSelectors.forEach(({ trigger, elements }) => {
                const show = progress > trigger;
                gsap.to(elements, {
                    y: show ? "0%" : "100%",
                    duration: 0.5,
                    overwrite: true
                });
            });

            // 3D Model Rotation
            if (model) {
                model.rotation.y = progress * Math.PI * 2; // Full spin
            }
        },
    });
});