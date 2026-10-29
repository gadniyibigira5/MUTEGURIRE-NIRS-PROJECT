import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { metrics, valueOf, formatValue } from '../utils/metrics.js';

const palette = ['#f0e7ef', '#d7b2d0', '#b779b0', '#884b8a', '#54235d'];
const MISSING = '#b8bfbd';

function colorFor(value, values) {
  if (value == null) return MISSING;
  const valid = values.filter((v) => v != null);
  if (!valid.length) return MISSING;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (min === max) return palette[2];
  const band = Math.min(4, Math.floor(((value - min) / (max - min)) * 5));
  return palette[band];
}

function makeShape(ring, project) {
  const points = ring.map(project);
  const shape = new THREE.Shape();
  points.forEach((point, index) => {
    if (index === 0) shape.moveTo(point.x, point.y);
    else shape.lineTo(point.x, point.y);
  });
  shape.closePath();
  return shape;
}

function featureDistrictName(feature) {
  return feature?.properties?.ADM2_EN || feature?.properties?.district || feature?.properties?.name || '';
}

export default function DistrictMap({ metric, districts, geojson, selected, onSelect, view, language }) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);
  const latest = useRef({});
  latest.current = { metric, districts, geojson, selected, onSelect, view, language };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e7eef0');
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -48, 65);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-label', 'Rwanda district map. Hover over a district for its current indicator value, or click to select it.');
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.55));
    const light = new THREE.DirectionalLight(0xffffff, 1.6);
    light.position.set(-20, -10, 80);
    scene.add(light);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.minDistance = 22;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI * 0.49;

    const mapGroup = new THREE.Group();
    scene.add(mapGroup);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const meshes = [];
    const materialsByDistrict = new Map();
    let frameId;
    let hoveredName = null;

    const tooltip = document.createElement('div');
    tooltip.className = 'district-tooltip';
    tooltip.setAttribute('role', 'status');
    tooltip.setAttribute('aria-live', 'polite');
    tooltip.hidden = true;
    mount.appendChild(tooltip);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const disposeMap = () => {
      while (mapGroup.children.length) {
        const object = mapGroup.children[0];
        mapGroup.remove(object);
        object.traverse((child) => {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
            else child.material.dispose();
          }
        });
      }
      meshes.length = 0;
      materialsByDistrict.clear();
    };

    const draw = () => {
      disposeMap();
      const geo = latest.current.geojson;
      if (!geo?.features?.length) return;

      // Use the same geographic orientation as the original HTML prototype:
      // longitude increases to the east (right), latitude increases to the north (up).
      let minLon = Infinity;
      let maxLon = -Infinity;
      let minLat = Infinity;
      let maxLat = -Infinity;
      const walkCoordinates = (coordinates) => {
        if (!Array.isArray(coordinates)) return;
        if (typeof coordinates[0] === 'number') {
          const [lon, lat] = coordinates;
          minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
          return;
        }
        coordinates.forEach(walkCoordinates);
      };
      geo.features.forEach((feature) => walkCoordinates(feature.geometry?.coordinates));
      if (![minLon, maxLon, minLat, maxLat].every(Number.isFinite)) return;

      const centerLon = (minLon + maxLon) / 2;
      const centerLat = (minLat + maxLat) / 2;
      const span = Math.max(maxLon - minLon, maxLat - minLat) || 1;
      // Scale latitude slightly to compensate for Rwanda's geographic projection.
      const scale = 68 / span;
      const project = ([lon, lat]) => new THREE.Vector2((lon - centerLon) * scale, (lat - centerLat) * scale);
      const data = latest.current.districts;
      const metricId = latest.current.metric;
      const values = data.map((district) => valueOf(district, metricId));
      const validValues = values.filter((value) => value != null);
      const minValue = validValues.length ? Math.min(...validValues) : 0;
      const maxValue = validValues.length ? Math.max(...validValues) : 0;
      const range = maxValue - minValue || 1;

      geo.features.forEach((feature) => {
        const name = featureDistrictName(feature);
        const district = data.find((item) => item.n.toLowerCase() === name.toLowerCase());
        if (!district || !feature.geometry) return;
        const value = valueOf(district, metricId);
        const fill = colorFor(value, values);
        const polygons = feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [];
        const height = latest.current.view === '3d' && value != null
          ? 0.35 + ((value - minValue) / range) * 3.2
          : 0.12;

        polygons.forEach((polygon) => {
          if (!polygon?.[0]?.length) return;
          const shape = makeShape(polygon[0], project);
          polygon.slice(1).forEach((holeRing) => {
            const hole = makeShape(holeRing, project);
            shape.holes.push(new THREE.Path(hole.getPoints(1)));
          });

          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: height,
            bevelEnabled: false,
            curveSegments: 1,
          });
          geometry.computeVertexNormals();
          const material = new THREE.MeshStandardMaterial({
            color: fill,
            roughness: 0.92,
            metalness: 0,
            emissive: 0x000000,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData = { name: district.n, district };
          mapGroup.add(mesh);
          meshes.push(mesh);
          if (!materialsByDistrict.has(district.n)) materialsByDistrict.set(district.n, []);
          materialsByDistrict.get(district.n).push(material);

          const edgeGeometry = new THREE.EdgesGeometry(new THREE.ShapeGeometry(shape));
          const edgeMaterial = new THREE.LineBasicMaterial({ color: '#758582', transparent: true, opacity: 0.78 });
          const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
          edges.position.z = height + 0.025;
          mapGroup.add(edges);
        });
      });

      // Centre the group without repeatedly accumulating translations on redraw.
      mapGroup.position.set(0, 0, 0);
      const bounds = new THREE.Box3().setFromObject(mapGroup);
      const center = bounds.getCenter(new THREE.Vector3());
      mapGroup.position.set(-center.x, -center.y, -bounds.min.z);

      if (latest.current.view === '2d') {
        camera.up.set(0, 1, 0);
        camera.position.set(0, 0, 105);
        controls.enableRotate = false;
        controls.enablePan = true;
      } else {
        camera.up.set(0, 0, 1);
        camera.position.set(0, -48, 65);
        controls.enableRotate = true;
        controls.enablePan = true;
      }
      controls.target.set(0, 0, 1);
      controls.update();
      resize();
      updateHighlight();
    };

    const updateHighlight = () => {
      const selectedName = latest.current.selected;
      materialsByDistrict.forEach((materials, name) => {
        const isSelected = name === selectedName;
        const isHovered = name === hoveredName;
        materials.forEach((material) => {
          material.emissive.set(isSelected ? '#514b1e' : isHovered ? '#263c38' : '#000000');
          material.emissiveIntensity = isSelected ? 0.22 : isHovered ? 0.32 : 0;
        });
      });
    };

    const pickDistrict = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshes, false);
      return hits[0]?.object?.userData?.district || null;
    };

    const showTooltip = (district, event) => {
      if (!district) {
        tooltip.hidden = true;
        hoveredName = null;
        renderer.domElement.style.cursor = 'grab';
        updateHighlight();
        return;
      }
      hoveredName = district.n;
      const state = latest.current;
      const activeMetric = metrics.find((item) => item.id === state.metric) || metrics[0];
      const activeValue = valueOf(district, state.metric);
      const province = district.p || '';
      const valueText = formatValue(activeValue, state.metric);
      const rows = [
        `<strong>${escapeHtml(district.n)}</strong>`,
        `<span class="tooltip-province">${escapeHtml(province)}${state.language === 'rw' ? ' Intara' : ' Province'}</span>`,
        `<span class="tooltip-metric">${escapeHtml(state.language === 'rw' ? activeMetric.rw : activeMetric.en)}: <b>${escapeHtml(valueText)}</b></span>`,
        `<span class="tooltip-extra">${state.language === 'rw' ? 'Igwingira' : 'Stunting'}: <b>${escapeHtml(formatValue(valueOf(district, 'st'), 'st'))}</b></span>`,
        `<span class="tooltip-extra">${state.language === 'rw' ? 'Ubukene' : 'Poverty'}: <b>${escapeHtml(formatValue(valueOf(district, 'pov'), 'pov'))}</b></span>`,
        `<span class="tooltip-extra">${state.language === 'rw' ? 'ANC 4+' : 'ANC 4+ visits'}: <b>${escapeHtml(formatValue(valueOf(district, 'anc'), 'anc'))}</b></span>`,
        `<span class="tooltip-extra">${state.language === 'rw' ? 'Isuzuma nyuma yo kubyara' : 'Postnatal check'}: <b>${escapeHtml(formatValue(valueOf(district, 'pnc'), 'pnc'))}</b></span>`,
        `<span class="tooltip-extra">${state.language === 'rw' ? 'Kubyara kw’ingimbi' : 'Teenage childbearing'}: <b>${escapeHtml(formatValue(valueOf(district, 'teen'), 'teen'))}</b></span>`,
        `<span class="tooltip-extra">${state.language === 'rw' ? 'Icyuho mu kuboneza urubyaro' : 'Unmet family-planning need'}: <b>${escapeHtml(formatValue(valueOf(district, 'un'), 'un'))}</b></span>`,
      ];
      tooltip.innerHTML = rows.join('');
      tooltip.hidden = false;
      const mountRect = mount.getBoundingClientRect();
      let left = event.clientX - mountRect.left + 14;
      let top = event.clientY - mountRect.top + 14;
      const maxLeft = Math.max(8, mount.clientWidth - 270);
      const maxTop = Math.max(8, mount.clientHeight - 230);
      if (left > maxLeft) left = event.clientX - mountRect.left - 260;
      if (top > maxTop) top = event.clientY - mountRect.top - 210;
      tooltip.style.left = `${Math.max(8, Math.min(left, maxLeft))}px`;
      tooltip.style.top = `${Math.max(8, Math.min(top, maxTop))}px`;
      renderer.domElement.style.cursor = 'pointer';
      updateHighlight();
    };

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);

    const onPointerMove = (event) => {
      const district = pickDistrict(event);
      showTooltip(district, event);
    };
    const onClick = (event) => {
      const district = pickDistrict(event);
      if (district) latest.current.onSelect(district.n);
    };
    const onPointerLeave = () => showTooltip(null, { clientX: 0, clientY: 0 });

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    renderer.domElement.addEventListener('click', onClick);
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    apiRef.current = { draw, updateHighlight };
    resize();
    draw();
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      disposeMap();
      tooltip.remove();
      renderer.dispose();
      renderer.domElement.remove();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.draw();
  }, [metric, districts, geojson, view]);

  useEffect(() => {
    apiRef.current?.updateHighlight();
  }, [selected]);

  return (
    <div className="map-canvas" ref={mountRef} aria-label="Interactive Rwanda district map">
      <div className="map-hint">
        {language === 'rw' ? 'Genda hejuru y’akarere urebe amakuru; kanda kugira ngo ugahitamo.' : 'Hover over a district to see its current indicators; click to select it.'}
      </div>
      <div className="map-controls">
        <span>↻</span>
        <span>{view === '3d' ? 'Drag to rotate · scroll to zoom' : 'Scroll to zoom · drag to pan'}</span>
      </div>
    </div>
  );
}
